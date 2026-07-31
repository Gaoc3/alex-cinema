'use strict';

const https = require('https');

const hostname = process.env.TUNNEL_HEALTH_HOST || 'cinemana.shabakaty.com';
const path = process.env.TUNNEL_HEALTH_PATH || '/api/android/banner/level/1';
const intervalMs = Math.max(5_000, Number(process.env.TUNNEL_CHECK_INTERVAL_MS) || 15_000);
const timeoutMs = Math.max(1_000, Number(process.env.TUNNEL_CHECK_TIMEOUT_MS) || 6_000);
const failureThreshold = Math.max(1, Number(process.env.TUNNEL_FAILURE_THRESHOLD) || 2);

let consecutiveFailures = 0;
let lastState = 'starting';

function report(state, detail) {
  if (state === lastState && state === 'healthy') return;
  lastState = state;
  const payload = {
    time: new Date().toISOString(),
    state,
    target: `${hostname}${path}`,
    detail,
  };
  const writer = state === 'unhealthy' ? console.error : console.log;
  writer(JSON.stringify(payload));
}

function checkTunnel() {
  const request = https.request(
    {
      hostname,
      path,
      method: 'GET',
      timeout: timeoutMs,
      rejectUnauthorized: true,
      headers: {
        'User-Agent': 'AleXCinema-Tunnel-Monitor/1.0',
        Accept: 'application/json,*/*;q=0.8',
      },
    },
    (response) => {
      response.resume();
      if (response.statusCode && response.statusCode >= 200 && response.statusCode < 400) {
        consecutiveFailures = 0;
        report('healthy', `HTTP ${response.statusCode}`);
        return;
      }

      consecutiveFailures += 1;
      if (consecutiveFailures >= failureThreshold) {
        report('unhealthy', `HTTP ${response.statusCode || 'unknown'}`);
      }
    },
  );

  request.on('timeout', () => request.destroy(new Error('timeout')));
  request.on('error', (error) => {
    consecutiveFailures += 1;
    if (consecutiveFailures >= failureThreshold) report('unhealthy', error.message);
  });
  request.end();
}

console.log(`Monitoring Shabakaty tunnel every ${intervalMs}ms`);
checkTunnel();
setInterval(checkTunnel, intervalMs);

