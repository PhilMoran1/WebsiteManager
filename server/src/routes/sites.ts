import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';

const router = Router();

// Generate a unique tracking ID
function generateTrackingId(): string {
  return 'wm_' + uuidv4().replace(/-/g, '').substring(0, 12);
}

// Get all sites
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT 
        s.*,
        COALESCE(ds.pageviews, 0) as today_pageviews,
        COALESCE(ds.total_revenue, 0) as today_revenue
      FROM sites s
      LEFT JOIN daily_stats ds ON s.id = ds.site_id AND ds.date = CURRENT_DATE
      ORDER BY s.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching sites:', error);
    res.status(500).json({ error: 'Failed to fetch sites' });
  }
});

// Get single site
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM sites WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Site not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching site:', error);
    res.status(500).json({ error: 'Failed to fetch site' });
  }
});

// Create new site
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, url, category } = req.body;
    
    if (!name || !url) {
      return res.status(400).json({ error: 'Name and URL are required' });
    }
    
    const trackingId = generateTrackingId();
    
    const result = await query(
      `INSERT INTO sites (name, url, category, tracking_id) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [name, url, category || 'other', trackingId]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating site:', error);
    res.status(500).json({ error: 'Failed to create site' });
  }
});

// Update site
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, url, category, is_active } = req.body;
    
    const result = await query(
      `UPDATE sites 
       SET name = COALESCE($1, name),
           url = COALESCE($2, url),
           category = COALESCE($3, category),
           is_active = COALESCE($4, is_active)
       WHERE id = $5
       RETURNING *`,
      [name, url, category, is_active, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Site not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating site:', error);
    res.status(500).json({ error: 'Failed to update site' });
  }
});

// Delete site
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await query('DELETE FROM sites WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Site not found' });
    }
    
    res.json({ message: 'Site deleted successfully' });
  } catch (error) {
    console.error('Error deleting site:', error);
    res.status(500).json({ error: 'Failed to delete site' });
  }
});

// Get tracking code for a site
router.get('/:id/tracking-code', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT tracking_id FROM sites WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Site not found' });
    }
    
    const trackingId = result.rows[0].tracking_id;
    const baseUrl = process.env.TRACKER_ENDPOINT || 'http://localhost:3001';
    
    const trackingCode = `<!-- Website Manager Tracking -->
<script src="${baseUrl}/tracker.js?siteId=${trackingId}" async></script>`;
    
    res.json({ 
      trackingId,
      trackingCode,
      instructions: 'Add this code to the <head> section of your website.'
    });
  } catch (error) {
    console.error('Error generating tracking code:', error);
    res.status(500).json({ error: 'Failed to generate tracking code' });
  }
});

// Get site statistics
router.get('/:id/stats', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { days = 30 } = req.query;
    
    const statsResult = await query(`
      SELECT 
        date,
        pageviews,
        unique_visitors,
        sessions,
        avg_session_duration,
        bounce_rate,
        total_revenue
      FROM daily_stats
      WHERE site_id = $1 AND date >= CURRENT_DATE - INTERVAL '${days} days'
      ORDER BY date ASC
    `, [id]);
    
    const totalsResult = await query(`
      SELECT 
        SUM(pageviews) as total_pageviews,
        SUM(unique_visitors) as total_visitors,
        SUM(sessions) as total_sessions,
        AVG(avg_session_duration) as avg_duration,
        AVG(bounce_rate) as avg_bounce_rate,
        SUM(total_revenue) as total_revenue
      FROM daily_stats
      WHERE site_id = $1 AND date >= CURRENT_DATE - INTERVAL '${days} days'
    `, [id]);
    
    res.json({
      daily: statsResult.rows,
      totals: totalsResult.rows[0]
    });
  } catch (error) {
    console.error('Error fetching site stats:', error);
    res.status(500).json({ error: 'Failed to fetch site statistics' });
  }
});

export default router;
