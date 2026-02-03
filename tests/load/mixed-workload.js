/**
 * Mixed Workload Load Test
 * Combined read/write/AI operations to test dual database layer
 * (PostgreSQL for structured data, Convex for real-time features)
 * 
 * Usage: k6 run tests/load/mixed-workload.js
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
// k6 load test - ESLint rules disabled for k6 scripting patterns

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics by operation type
const readSuccessRate = new Rate('read_success_rate');
const writeSuccessRate = new Rate('write_success_rate');
const aiSuccessRate = new Rate('ai_success_rate');
const readResponseTime = new Trend('read_response_time');
const writeResponseTime = new Trend('write_response_time');
const aiResponseTime = new Trend('ai_response_time');

// Test configuration
export const options = {
  scenarios: {
    // 50% reads - PostgreSQL queries
    reads: {
      executor: 'constant-vus',
      vus: 50,
      duration: '5m',
      exec: 'reads',
    },
    // 30% writes - Convex real-time updates
    writes: {
      executor: 'constant-vus',
      vus: 30,
      duration: '5m',
      startTime: '10s', // Slight delay to stagger starts
      exec: 'writes',
    },
    // 20% AI generation
    ai_generation: {
      executor: 'constant-vus',
      vus: 20,
      duration: '5m',
      startTime: '20s',
      exec: 'aiGeneration',
    },
  },
  thresholds: {
    // Reads should be fast
    read_response_time: ['p(99)<500'],
    // Writes can be slightly slower
    write_response_time: ['p(99)<2000'],
    // AI generation is slowest
    ai_response_time: ['p(99)<5000'],
    // Overall error rate must be low
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_KEY = __ENV.API_KEY || 'test-api-key';

// Reads scenario - PostgreSQL structured data queries
export function reads() {
  group('PostgreSQL Reads (50% load)', () => {
    const endpoints = [
      '/api/users/me',
      '/api/files',
      '/api/projects',
      '/api/builder/history',
    ];
    
    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    const url = `${BASE_URL}${endpoint}`;
    
    const params = {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
      },
    };

    const startTime = Date.now();
    const res = http.get(url, params);
    const duration = Date.now() - startTime;

    readResponseTime.add(duration);

    const success = check(res, {
      'read status is 200': (r) => r.status === 200,
      'read response time < 500ms': (r) => r.timings.duration < 500,
    });

    readSuccessRate.add(success);
  });

  // Quick read cycle
  sleep(Math.random() * 0.5 + 0.5);
}

// Writes scenario - Convex real-time updates
export function writes() {
  group('Convex Writes (30% load)', () => {
    const writeOperations = [
      {
        url: '/api/files',
        method: 'POST',
        payload: JSON.stringify({
          filename: `test-file-${Date.now()}.txt`,
          content: 'Load test file content',
          size: 100,
        }),
      },
      {
        url: '/api/builder/analytics',
        method: 'POST',
        payload: JSON.stringify({
          event: 'component_generated',
          metadata: { test: true, loadTest: true },
        }),
      },
    ];

    const operation = writeOperations[Math.floor(Math.random() * writeOperations.length)];
    
    const params = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
    };

    const startTime = Date.now();
    let res;
    
    if (operation.method === 'POST') {
      res = http.post(`${BASE_URL}${operation.url}`, operation.payload, params);
    } else {
      res = http.get(`${BASE_URL}${operation.url}`, params);
    }
    
    const duration = Date.now() - startTime;
    writeResponseTime.add(duration);

    const success = check(res, {
      'write status is 200 or 201': (r) => r.status === 200 || r.status === 201,
      'write response time < 2s': (r) => r.timings.duration < 2000,
    });

    writeSuccessRate.add(success);
  });

  // Write cycle with think time
  sleep(Math.random() * 1 + 1);
}

// AI generation scenario
export function aiGeneration() {
  group('AI Generation (20% load)', () => {
    const generateUrl = `${BASE_URL}/api/component-builder/generate`;
    
    const prompts = [
      'A responsive navigation bar',
      'A login form with validation',
      'A dashboard card component',
    ];
    
    const prompt = prompts[Math.floor(Math.random() * prompts.length)];

    const payload = JSON.stringify({
      description: prompt,
      preferences: { type: 'client', styling: 'tailwind' },
    });

    const params = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
    };

    const startTime = Date.now();
    const res = http.post(generateUrl, payload, params);
    const duration = Date.now() - startTime;

    aiResponseTime.add(duration);

    const success = check(res, {
      'AI status is 200 or 202': (r) => r.status === 200 || r.status === 202,
      'AI response time < 5s': (r) => r.timings.duration < 5000,
    });

    aiSuccessRate.add(success);
  });

  // Longer sleep for AI generation
  sleep(Math.random() * 3 + 3);
}

export function setup() {
  console.log(`Starting mixed workload test against: ${BASE_URL}`);
  console.log('Scenario: 50% reads (PostgreSQL), 30% writes (Convex), 20% AI generation');
  
  const healthCheck = http.get(`${BASE_URL}/api/health`);
  check(healthCheck, {
    'API is accessible': (r) => r.status === 200,
  });
  
  return { baseUrl: BASE_URL };
}

export function teardown(data) {
  console.log('Mixed workload test completed');
  console.log(`Tested against: ${data.baseUrl}`);
}
