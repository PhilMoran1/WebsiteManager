import { Router, Request, Response } from 'express';
import { query } from '../config/database';

const router = Router();

// Get all alerts
router.get('/', async (req: Request, res: Response) => {
  try {
    const { resolved = 'false', limit = 50 } = req.query;
    
    const result = await query(`
      SELECT 
        a.*,
        s.name as site_name,
        s.url as site_url
      FROM alerts a
      JOIN sites s ON a.site_id = s.id
      WHERE a.is_resolved = $1
      ORDER BY a.created_at DESC
      LIMIT $2
    `, [resolved === 'true', limit]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// Get alerts for a specific site
router.get('/site/:siteId', async (req: Request, res: Response) => {
  try {
    const { siteId } = req.params;
    const { resolved = 'false' } = req.query;
    
    const result = await query(`
      SELECT * FROM alerts
      WHERE site_id = $1 AND is_resolved = $2
      ORDER BY created_at DESC
    `, [siteId, resolved === 'true']);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching site alerts:', error);
    res.status(500).json({ error: 'Failed to fetch site alerts' });
  }
});

// Create alert
router.post('/', async (req: Request, res: Response) => {
  try {
    const { site_id, alert_type, severity, message } = req.body;
    
    if (!site_id || !alert_type || !message) {
      return res.status(400).json({ error: 'site_id, alert_type, and message are required' });
    }
    
    const result = await query(`
      INSERT INTO alerts (site_id, alert_type, severity, message)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [site_id, alert_type, severity || 'warning', message]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating alert:', error);
    res.status(500).json({ error: 'Failed to create alert' });
  }
});

// Resolve alert
router.put('/:id/resolve', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await query(`
      UPDATE alerts
      SET is_resolved = true, resolved_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error resolving alert:', error);
    res.status(500).json({ error: 'Failed to resolve alert' });
  }
});

// Get alert rules
router.get('/rules', async (req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT 
        ar.*,
        s.name as site_name
      FROM alert_rules ar
      JOIN sites s ON ar.site_id = s.id
      WHERE ar.is_active = true
      ORDER BY ar.created_at DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching alert rules:', error);
    res.status(500).json({ error: 'Failed to fetch alert rules' });
  }
});

// Create alert rule
router.post('/rules', async (req: Request, res: Response) => {
  try {
    const { site_id, rule_type, threshold, comparison } = req.body;
    
    if (!site_id || !rule_type || threshold === undefined || !comparison) {
      return res.status(400).json({ 
        error: 'site_id, rule_type, threshold, and comparison are required' 
      });
    }
    
    // Valid rule types
    const validRuleTypes = ['revenue_drop', 'traffic_drop', 'error_spike', 'uptime'];
    if (!validRuleTypes.includes(rule_type)) {
      return res.status(400).json({ 
        error: `Invalid rule_type. Must be one of: ${validRuleTypes.join(', ')}` 
      });
    }
    
    // Valid comparisons
    const validComparisons = ['less_than', 'greater_than', 'percent_decrease', 'percent_increase'];
    if (!validComparisons.includes(comparison)) {
      return res.status(400).json({ 
        error: `Invalid comparison. Must be one of: ${validComparisons.join(', ')}` 
      });
    }
    
    const result = await query(`
      INSERT INTO alert_rules (site_id, rule_type, threshold, comparison)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [site_id, rule_type, threshold, comparison]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating alert rule:', error);
    res.status(500).json({ error: 'Failed to create alert rule' });
  }
});

// Delete alert rule
router.delete('/rules/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await query('DELETE FROM alert_rules WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alert rule not found' });
    }
    
    res.json({ message: 'Alert rule deleted successfully' });
  } catch (error) {
    console.error('Error deleting alert rule:', error);
    res.status(500).json({ error: 'Failed to delete alert rule' });
  }
});

// Get alert summary (counts by type)
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT 
        alert_type,
        severity,
        COUNT(*) as count
      FROM alerts
      WHERE is_resolved = false
      GROUP BY alert_type, severity
      ORDER BY 
        CASE severity 
          WHEN 'critical' THEN 1 
          WHEN 'warning' THEN 2 
          ELSE 3 
        END
    `);
    
    const totalUnresolved = await query(`
      SELECT COUNT(*) as count FROM alerts WHERE is_resolved = false
    `);
    
    res.json({
      byType: result.rows,
      totalUnresolved: parseInt(totalUnresolved.rows[0].count)
    });
  } catch (error) {
    console.error('Error fetching alert summary:', error);
    res.status(500).json({ error: 'Failed to fetch alert summary' });
  }
});

export default router;
