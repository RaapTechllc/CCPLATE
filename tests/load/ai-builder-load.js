/**
 * AI Builder Load Test
 * Simulates concurrent AI component generation requests
 * 
 * Usage: k6 run tests/load/ai-builder-load.js
 */

/* eslint-disable import/no-anonymous-default-export, @typescript-eslint/no-unused-vars */
// k6 load test - ESLint rules disabled for k6 scripting patterns

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const generationSuccessRate = new Rate('generation_success_rate');
const generationResponseTime = new Trend('generation_response_time');
const queueCounter = new Counter('queued_requests');

// Test configuration
export const options = {
  stages: [
    { duration: '1m', target: 10 },    // Ramp up to 10 users
    { duration: '2m', target: 50 },    // Ramp up to 50 users
    { duration: '3m', target: 50 },    // Stay at 50 users
    { duration: '1m', target: 0 },     // Ramp down
  ],
  thresholds: {
    // 99% of AI generation requests must complete under 5 seconds
    http_req_duration: ['p(99)<5000'],
    // Error rate must be below 5% (AI has higher variance)
    http_req_failed: ['rate<0.05'],
    // Generation success rate must be above 90%
    generation_success_rate: ['rate>0.90'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_KEY = __ENV.API_KEY || 'test-api-key';

// Component generation templates
const componentPrompts = [
  {
    description: 'A blue button with hover effects',
    preferences: { type: 'client', styling: 'tailwind' },
  },
  {
    description: 'A modal dialog with form inputs',
    preferences: { type: 'client', styling: 'tailwind' },
  },
  {
    description: 'A navigation sidebar with collapsible sections',
    preferences: { type: 'server', styling: 'tailwind' },
  },
  {
    description: 'A data table with sorting and pagination',
    preferences: { type: 'server', styling: 'tailwind' },
  },
  {
    description: 'A card component with image and text',
    preferences: { type: 'client', styling: 'tailwind' },
  },
];

export default function () {
  const componentIndex = __VU % componentPrompts.length;
  const prompt = componentPrompts[componentIndex];
  
  group('Component Builder Generation', () => {
    const generateUrl = `${BASE_URL}/api/component-builder/generate`;
    
    const payload = JSON.stringify({
      description: prompt.description,
      preferences: prompt.preferences,
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

    // Track response time
    generationResponseTime.add(duration);

    // Check response conditions
    check(res, {
      'status is 200 or 202 (queued)': (r) => r.status === 200 || r.status === 202,
      'response time < 5s': (r) => r.timings.duration < 5000,
      'no server error (5xx)': (r) => r.status < 500,
      'valid JSON response': (r) => {
        try {
          JSON.parse(r.body);
          return true;
        } catch {
          return false;
        }
      },
    });

    // Track queued requests
    if (res.status === 202) {
      queueCounter.add(1);
    }

    // Calculate success
    const success = res.status === 200 || res.status === 202;
    generationSuccessRate.add(success);
  });

  // Sleep between requests (5-10 seconds for AI generation pacing)
  sleep(Math.random() * 5 + 5);
}

export function setup() {
  console.log(`Starting AI builder load test against: ${BASE_URL}`);
  console.log('Target: 50 concurrent users, p99 < 5s');
  
  // Verify API is accessible
  const healthCheck = http.get(`${BASE_URL}/api/health`);
  check(healthCheck, {
    'API is accessible': (r) => r.status === 200,
  });
  
  return { 
    baseUrl: BASE_URL,
    prompts: componentPrompts.length,
  };
}

export function teardown(data) {
  console.log('AI builder load test completed');
  console.log(`Tested with ${data.prompts} different component prompts`);
}
