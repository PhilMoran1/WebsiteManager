import { Router, Request, Response } from 'express';
import { query } from '../config/database';

const router = Router();

interface TrackingEvent {
  siteId: string;
  sessionId: string;
  eventType: string;
  url?: string;
  referrer?: string;
  timestamp?: string;
  data?: Record<string, any>;
}

// Receive tracking events from websites
router.post('/event', async (req: Request, res: Response) => {
  try {
    const event: TrackingEvent = req.body;
    
    if (!event.siteId || !event.sessionId || !event.eventType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Look up site by tracking ID
    const siteResult = await query(
      'SELECT id FROM sites WHERE tracking_id = $1 AND is_active = true',
      [event.siteId]
    );
    
    if (siteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Site not found or inactive' });
    }
    
    const siteId = siteResult.rows[0].id;
    
    // Insert event
    await query(
      `INSERT INTO events (site_id, session_id, event_type, url, referrer, data)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        siteId,
        event.sessionId,
        event.eventType,
        event.url || null,
        event.referrer || null,
        JSON.stringify(event.data || {})
      ]
    );
    
    // Update daily stats (upsert)
    if (event.eventType === 'pageview') {
      await updateDailyStats(siteId, event);
    }
    
    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Error recording event:', error);
    res.status(500).json({ error: 'Failed to record event' });
  }
});

// Helper function to update daily stats
async function updateDailyStats(siteId: string, event: TrackingEvent) {
  try {
    await query(`
      INSERT INTO daily_stats (site_id, date, pageviews, sessions)
      VALUES ($1, CURRENT_DATE, 1, 1)
      ON CONFLICT (site_id, date) 
      DO UPDATE SET 
        pageviews = daily_stats.pageviews + 1,
        updated_at = NOW()
    `, [siteId]);
    
    // Update unique visitors (based on session_id count)
    await query(`
      UPDATE daily_stats 
      SET unique_visitors = (
        SELECT COUNT(DISTINCT session_id) 
        FROM events 
        WHERE site_id = $1 AND DATE(created_at) = CURRENT_DATE
      )
      WHERE site_id = $1 AND date = CURRENT_DATE
    `, [siteId]);
    
  } catch (error) {
    console.error('Error updating daily stats:', error);
  }
}

// Get events for a site (for debugging/analysis)
router.get('/events/:siteId', async (req: Request, res: Response) => {
  try {
    const { siteId } = req.params;
    const { limit = 100, offset = 0, eventType } = req.query;
    
    let queryStr = `
      SELECT * FROM events 
      WHERE site_id = $1
    `;
    const params: any[] = [siteId];
    
    if (eventType) {
      queryStr += ` AND event_type = $2`;
      params.push(eventType);
    }
    
    queryStr += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    
    const result = await query(queryStr, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Get real-time stats (last 30 minutes)
router.get('/realtime/:siteId', async (req: Request, res: Response) => {
  try {
    const { siteId } = req.params;
    
    const result = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE event_type = 'pageview') as pageviews,
        COUNT(DISTINCT session_id) as active_users
      FROM events
      WHERE site_id = $1 AND created_at >= NOW() - INTERVAL '30 minutes'
    `, [siteId]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching realtime stats:', error);
    res.status(500).json({ error: 'Failed to fetch realtime stats' });
  }
});

export default router;
