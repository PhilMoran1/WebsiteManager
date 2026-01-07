import { Router, Request, Response } from 'express';
import { query } from '../config/database';

const router = Router();

// Get revenue overview (all sites)
router.get('/overview', async (req: Request, res: Response) => {
  try {
    const { days = 30 } = req.query;
    
    // Total revenue by date
    const dailyRevenue = await query(`
      SELECT 
        date,
        SUM(amount) as total_revenue,
        SUM(impressions) as total_impressions,
        SUM(clicks) as total_clicks
      FROM revenue
      WHERE date >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY date
      ORDER BY date ASC
    `);
    
    // Revenue by source
    const bySource = await query(`
      SELECT 
        source,
        SUM(amount) as total_revenue,
        SUM(impressions) as total_impressions,
        SUM(clicks) as total_clicks
      FROM revenue
      WHERE date >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY source
      ORDER BY total_revenue DESC
    `);
    
    // Top performing sites
    const topSites = await query(`
      SELECT 
        s.id,
        s.name,
        s.url,
        SUM(r.amount) as total_revenue
      FROM sites s
      JOIN revenue r ON s.id = r.site_id
      WHERE r.date >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY s.id, s.name, s.url
      ORDER BY total_revenue DESC
      LIMIT 10
    `);
    
    // Summary stats
    const summary = await query(`
      SELECT 
        SUM(amount) as total_revenue,
        SUM(impressions) as total_impressions,
        SUM(clicks) as total_clicks,
        CASE WHEN SUM(impressions) > 0 
          THEN (SUM(clicks)::decimal / SUM(impressions)) * 100 
          ELSE 0 
        END as ctr,
        CASE WHEN SUM(impressions) > 0 
          THEN (SUM(amount) / SUM(impressions)) * 1000 
          ELSE 0 
        END as rpm
      FROM revenue
      WHERE date >= CURRENT_DATE - INTERVAL '${days} days'
    `);
    
    res.json({
      daily: dailyRevenue.rows,
      bySource: bySource.rows,
      topSites: topSites.rows,
      summary: summary.rows[0]
    });
  } catch (error) {
    console.error('Error fetching revenue overview:', error);
    res.status(500).json({ error: 'Failed to fetch revenue overview' });
  }
});

// Get revenue for a specific site
router.get('/site/:siteId', async (req: Request, res: Response) => {
  try {
    const { siteId } = req.params;
    const { days = 30 } = req.query;
    
    const dailyRevenue = await query(`
      SELECT 
        date,
        source,
        amount,
        impressions,
        clicks
      FROM revenue
      WHERE site_id = $1 AND date >= CURRENT_DATE - INTERVAL '${days} days'
      ORDER BY date ASC
    `, [siteId]);
    
    const summary = await query(`
      SELECT 
        SUM(amount) as total_revenue,
        SUM(impressions) as total_impressions,
        SUM(clicks) as total_clicks,
        AVG(amount) as avg_daily_revenue
      FROM revenue
      WHERE site_id = $1 AND date >= CURRENT_DATE - INTERVAL '${days} days'
    `, [siteId]);
    
    res.json({
      daily: dailyRevenue.rows,
      summary: summary.rows[0]
    });
  } catch (error) {
    console.error('Error fetching site revenue:', error);
    res.status(500).json({ error: 'Failed to fetch site revenue' });
  }
});

// Manually add revenue entry (for non-API sources)
router.post('/', async (req: Request, res: Response) => {
  try {
    const { site_id, source, amount, currency, impressions, clicks, date, metadata } = req.body;
    
    if (!site_id || !source || amount === undefined || !date) {
      return res.status(400).json({ error: 'site_id, source, amount, and date are required' });
    }
    
    const result = await query(`
      INSERT INTO revenue (site_id, source, amount, currency, impressions, clicks, date, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (site_id, source, date)
      DO UPDATE SET 
        amount = $3,
        impressions = $5,
        clicks = $6,
        metadata = $8,
        updated_at = NOW()
      RETURNING *
    `, [
      site_id,
      source,
      amount,
      currency || 'USD',
      impressions || 0,
      clicks || 0,
      date,
      JSON.stringify(metadata || {})
    ]);
    
    // Update daily stats total revenue
    await query(`
      UPDATE daily_stats 
      SET total_revenue = (
        SELECT COALESCE(SUM(amount), 0) 
        FROM revenue 
        WHERE site_id = $1 AND date = $2
      )
      WHERE site_id = $1 AND date = $2
    `, [site_id, date]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding revenue:', error);
    res.status(500).json({ error: 'Failed to add revenue' });
  }
});

// Get revenue comparison (current vs previous period)
router.get('/comparison', async (req: Request, res: Response) => {
  try {
    const { days = 7 } = req.query;
    
    const current = await query(`
      SELECT SUM(amount) as revenue
      FROM revenue
      WHERE date >= CURRENT_DATE - INTERVAL '${days} days'
    `);
    
    const previous = await query(`
      SELECT SUM(amount) as revenue
      FROM revenue
      WHERE date >= CURRENT_DATE - INTERVAL '${Number(days) * 2} days'
        AND date < CURRENT_DATE - INTERVAL '${days} days'
    `);
    
    const currentRevenue = parseFloat(current.rows[0].revenue) || 0;
    const previousRevenue = parseFloat(previous.rows[0].revenue) || 0;
    const change = previousRevenue > 0 
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 
      : 0;
    
    res.json({
      current: currentRevenue,
      previous: previousRevenue,
      change: change.toFixed(2),
      trend: change >= 0 ? 'up' : 'down'
    });
  } catch (error) {
    console.error('Error fetching revenue comparison:', error);
    res.status(500).json({ error: 'Failed to fetch revenue comparison' });
  }
});

export default router;
