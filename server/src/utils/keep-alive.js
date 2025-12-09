/**
 * Keep-Alive Service
 * 
 * Prevents Render free tier from sleeping by pinging the health endpoint.
 * Runs every 14 minutes (Render sleeps after 15 minutes of inactivity).
 */

const https = require('https');
const http = require('http');

const PING_INTERVAL = 14 * 60 * 1000; // 14 minutes in milliseconds
const HEALTH_ENDPOINT = '/api/health';

let pingInterval = null;

/**
 * Start the keep-alive pinger
 */
function startKeepAlive() {
  // Only run in production
  if (process.env.NODE_ENV !== 'production') {
    console.log('⏸️  Keep-alive disabled in development');
    return;
  }

  const appUrl = process.env.RENDER_EXTERNAL_URL || process.env.APP_URL;
  
  if (!appUrl) {
    console.log('⚠️  Keep-alive: No APP_URL configured');
    return;
  }

  const fullUrl = `${appUrl}${HEALTH_ENDPOINT}`;
  console.log(`🏓 Keep-alive started: pinging ${fullUrl} every 14 minutes`);

  // Initial ping after 1 minute
  setTimeout(() => ping(fullUrl), 60 * 1000);

  // Regular pings every 14 minutes
  pingInterval = setInterval(() => ping(fullUrl), PING_INTERVAL);
}

/**
 * Stop the keep-alive pinger
 */
function stopKeepAlive() {
  if (pingInterval) {
    clearInterval(pingInterval);
    pingInterval = null;
    console.log('🛑 Keep-alive stopped');
  }
}

/**
 * Ping the health endpoint
 */
function ping(url) {
  const protocol = url.startsWith('https') ? https : http;
  
  const req = protocol.get(url, (res) => {
    const timestamp = new Date().toISOString();
    if (res.statusCode === 200) {
      console.log(`🏓 [${timestamp}] Keep-alive ping successful`);
    } else {
      console.log(`⚠️ [${timestamp}] Keep-alive ping returned ${res.statusCode}`);
    }
  });

  req.on('error', (err) => {
    console.error(`❌ Keep-alive ping failed:`, err.message);
  });

  req.setTimeout(10000, () => {
    req.destroy();
    console.error('❌ Keep-alive ping timeout');
  });
}

module.exports = {
  startKeepAlive,
  stopKeepAlive
};

