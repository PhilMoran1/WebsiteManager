import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool, testConnection } from './config/database';
import { redis, testRedisConnection } from './config/redis';
import sitesRouter from './routes/sites';
import trackingRouter from './routes/tracking';
import revenueRouter from './routes/revenue';
import alertsRouter from './routes/alerts';
import { startRevenueSync } from './jobs/revenueSync';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', database: 'disconnected' });
  }
});

// API Routes
app.use('/api/sites', sitesRouter);
app.use('/api/tracking', trackingRouter);
app.use('/api/revenue', revenueRouter);
app.use('/api/alerts', alertsRouter);

// Tracking script endpoint (served to websites)
app.get('/tracker.js', (req, res) => {
  const siteId = req.query.siteId as string;
  const trackerScript = `
(function() {
  var siteId = "${siteId || ''}";
  var endpoint = "${process.env.TRACKER_ENDPOINT || 'http://localhost:3001'}/api/tracking/event";
  
  function generateSessionId() {
    return 'sess_' + Math.random().toString(36).substr(2, 9);
  }
  
  function getSessionId() {
    var sessionId = sessionStorage.getItem('wm_session');
    if (!sessionId) {
      sessionId = generateSessionId();
      sessionStorage.setItem('wm_session', sessionId);
    }
    return sessionId;
  }
  
  function track(eventType, data) {
    var payload = {
      siteId: siteId,
      sessionId: getSessionId(),
      eventType: eventType,
      url: window.location.href,
      referrer: document.referrer,
      timestamp: new Date().toISOString(),
      data: data || {}
    };
    
    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, JSON.stringify(payload));
    } else {
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true
      });
    }
  }
  
  // Track page view
  track('pageview', {
    title: document.title,
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight
  });
  
  // Track session duration on unload
  var startTime = Date.now();
  window.addEventListener('beforeunload', function() {
    track('session_end', { duration: Date.now() - startTime });
  });
  
  // Expose tracking function globally
  window.WebsiteManagerTrack = track;
})();
`;
  res.type('application/javascript').send(trackerScript);
});

// Start server
async function start() {
  try {
    await testConnection();
    console.log('✅ Database connected');
    
    await testRedisConnection();
    console.log('✅ Redis connected');
    
    // Start revenue sync job
    startRevenueSync();
    console.log('✅ Revenue sync job started');
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

start();

export default app;
