/**
 * Schema Lock Load Test
 * Validates schema lock prevents concurrent modifications
 * 
 * Usage: k6 run tests/load/schema-lock.js
 */

/* eslint-disable import/no-anonymous-default-export, @typescript-eslint/no-unused-vars */
// k6 load test - ESLint rules disabled for k6 scripting patterns

import http from 'k6/http';
import { check } from 'k6';
import { Rate, Counter, Trend } from 'k6/metrics';

// Custom metrics
const lockAcquiredRate = new Rate('lock_acquired_rate');
const lockConflictCounter = new Counter('lock_conflicts');
const dataIntegrityViolations = new Counter('data_integrity_violations');
const schemaChangeTime = new Trend('schema_change_time');

// Test configuration
export const options = {
  vus: 10,           // 10 concurrent users
  iterations: 100,   // Each user makes 100 attempts
  thresholds: {
    // No data integrity violations allowed
    data_integrity_violations: ['count==0'],
    // Lock must be acquired successfully > 80% of the time
    lock_acquired_rate: ['rate>0.80'],
    // Schema changes should complete within 3s
    schema_change_time: ['p(95)<3000'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_KEY = __ENV.API_KEY || 'test-api-key';

export default function () {
  const vuId = __VU;
  const iterationId = __ITER;
  const modelName = `LoadTestModel_VU${vuId}_Iter${iterationId}`;

  // Attempt to create/modify a schema
  const schemaUrl = `${BASE_URL}/api/schema-builder/apply`;
  
  const payload = JSON.stringify({
    name: modelName,
    fields: [
      { name: 'id', type: 'string', primary: true },
      { name: 'createdAt', type: 'datetime' },
      { name: 'testField', type: 'string' },
    ],
    options: {
      timestamps: true,
    },
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
  };

  const startTime = Date.now();
  const res = http.post(schemaUrl, payload, params);
  const duration = Date.now() - startTime;

  schemaChangeTime.add(duration);

  // Parse response
  let responseBody;
  try {
    responseBody = JSON.parse(res.body);
  } catch {
    responseBody = {};
  }

  // Check for various response scenarios
  check(res, {
    'status is 200 (success) or 423 (locked)': (r) =>
      r.status === 200 || r.status === 423,
    'no 5xx server errors': (r) => r.status < 500,
    'no 409 conflict errors': (r) => r.status !== 409,
    'response contains valid JSON': (r) => {
      try {
        JSON.parse(r.body);
        return true;
      } catch {
        return false;
      }
    },
  });

  // Track lock acquisition
  const lockAcquired = res.status === 200;
  lockAcquiredRate.add(lockAcquired);

  // Track lock conflicts (423 = Locked)
  if (res.status === 423) {
    lockConflictCounter.add(1);
    
    // Verify proper error message
    check(res, {
      'locked response has proper error message': (r) => {
        const body = JSON.parse(r.body);
        return body.error || body.message;
      },
    });
  }

  // Check for data integrity violations
  if (res.status === 409 || responseBody?.conflict || responseBody?.duplicate) {
    dataIntegrityViolations.add(1);
    console.error(`Data integrity violation detected: ${modelName}`);
  }

  // If successful, verify the schema was actually created
  if (res.status === 200) {
    check(res, {
      'successful response contains schema data': (r) => {
        const body = JSON.parse(r.body);
        return body.schema || body.name || body.id;
      },
    });
  }

  // Small delay between attempts to prevent total hammering
  // but still maintain high concurrency pressure
  const delay = Math.random() * 0.1 + 0.05; // 50-150ms
  const endTime = Date.now() + (delay * 1000);
  while (Date.now() < endTime) {
    // Busy wait for precise timing (k6 doesn't have setTimeout)
  }
}

export function setup() {
  console.log(`Starting schema lock test against: ${BASE_URL}`);
  console.log('Test: 10 concurrent users, 100 iterations each');
  console.log('Goal: Verify no data corruption under concurrent schema modifications');
  
  // Pre-test: Verify schema builder endpoint exists
  const healthCheck = http.get(`${BASE_URL}/api/health`);
  const schemaCheck = http.get(`${BASE_URL}/api/schema-builder`, {
    headers: { 'Authorization': `Bearer ${API_KEY}` },
  });
  
  check(healthCheck, {
    'API is accessible': (r) => r.status === 200,
  });
  
  console.log(`Schema builder check status: ${schemaCheck.status}`);
  
  return { 
    baseUrl: BASE_URL,
    totalAttempts: options.vus * options.iterations,
  };
}

export function teardown(data) {
  console.log('Schema lock test completed');
  console.log(`Total attempts: ${data.totalAttempts}`);
  console.log(`Target: ${data.baseUrl}`);
  
  // Cleanup: Attempt to clean up test schemas (best effort)
  const cleanupUrl = `${data.baseUrl}/api/schema-builder/cleanup`;
  http.post(cleanupUrl, JSON.stringify({ prefix: 'LoadTestModel_' }), {
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
  });
}
