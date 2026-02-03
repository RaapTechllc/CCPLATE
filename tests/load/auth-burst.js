/**
 * Auth Burst Load Test
 * Tests concurrent authentication requests to validate Convex auth performance
 * 
 * Usage: k6 run tests/load/auth-burst.js
 * Usage with custom URL: BASE_URL=https://staging.example.com k6 run tests/load/auth-burst.js
 */

/* eslint-disable import/no-anonymous-default-export, @typescript-eslint/no-unused-vars */
// k6 load test - ESLint rules disabled for k6 scripting patterns

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const authSuccessRate = new Rate('auth_success_rate');
const authResponseTime = new Trend('auth_response_time');
const rateLimitCounter = new Counter('rate_limit_hits');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Ramp up to 10 users
    { duration: '1m', target: 100 },   // Ramp up to 100 users
    { duration: '2m', target: 100 },   // Stay at 100 users
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    // 99% of requests must complete under 200ms
    http_req_duration: ['p(99)<200'],
    // Error rate must be below 1%
    http_req_failed: ['rate<0.01'],
    // Auth success rate must be above 95%
    auth_success_rate: ['rate>0.95'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  const loginUrl = `${BASE_URL}/api/auth/callback/credentials`;
  
  // Test credentials (these should exist in your test environment)
  const payload = JSON.stringify({
    email: __ENV.TEST_USER_EMAIL || 'load-test@example.com',
    password: __ENV.TEST_USER_PASSWORD || 'test-password-123',
    callbackUrl: '/',
    redirect: 'false',
    csrfToken: 'test-csrf-token',
    json: 'true',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  };

  const startTime = Date.now();
  const res = http.post(loginUrl, payload, params);
  const duration = Date.now() - startTime;

  // Track response time
  authResponseTime.add(duration);

  // Check various response conditions
  check(res, {
    'status is 200, 302, or 401 (expected auth responses)': (r) =>
      r.status === 200 || r.status === 302 || r.status === 401,
    'response time < 200ms': (r) => r.timings.duration < 200,
    'no server error (5xx)': (r) => r.status < 500,
  });

  // Check for rate limiting
  if (res.status === 429) {
    rateLimitCounter.add(1);
  }

  // Calculate auth success (200 or 302 = success, 401 = expected failure for wrong creds)
  const authSuccess = res.status === 200 || res.status === 302;
  authSuccessRate.add(authSuccess);

  // Random sleep to simulate real user behavior (1-3 seconds)
  sleep(Math.random() * 2 + 1);
}

// Setup function runs once before the test
export function setup() {
  console.log(`Starting auth burst test against: ${BASE_URL}`);
  console.log('Target: 100 concurrent users, p99 < 200ms');
  
  // Health check
  const healthCheck = http.get(`${BASE_URL}/api/health`);
  if (healthCheck.status !== 200) {
    console.warn('Warning: Health check failed before test');
  }
  
  return { baseUrl: BASE_URL };
}

// Teardown function runs once after the test
export function teardown(data) {
  console.log('Auth burst test completed');
  console.log(`Target URL: ${data.baseUrl}`);
}
