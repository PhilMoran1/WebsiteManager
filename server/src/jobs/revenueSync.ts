import cron from 'node-cron';
import { query } from '../config/database';
import { google } from 'googleapis';

// AdSense API client setup
function getAdSenseClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  
  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }
  
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  
  return google.adsense({ version: 'v2', auth: oauth2Client });
}

// Sync AdSense revenue data
async function syncAdSenseRevenue() {
  const adsense = getAdSenseClient();
  
  if (!adsense) {
    console.log('AdSense API not configured, skipping sync');
    return;
  }
  
  const accountId = process.env.ADSENSE_ACCOUNT_ID;
  if (!accountId) {
    console.log('AdSense account ID not configured');
    return;
  }
  
  try {
    console.log('🔄 Syncing AdSense revenue...');
    
    // Get yesterday's date (AdSense data is typically available with 1-day delay)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];
    
    // Fetch report from AdSense
    const response = await adsense.accounts.reports.generate({
      account: `accounts/${accountId}`,
      dateRange: 'CUSTOM',
      startDate: { year: yesterday.getFullYear(), month: yesterday.getMonth() + 1, day: yesterday.getDate() },
      endDate: { year: yesterday.getFullYear(), month: yesterday.getMonth() + 1, day: yesterday.getDate() },
      metrics: ['ESTIMATED_EARNINGS', 'IMPRESSIONS', 'CLICKS', 'PAGE_VIEWS'],
      dimensions: ['DOMAIN_NAME'],
    });
    
    const rows = response.data.rows || [];
    
    for (const row of rows) {
      const domain = row.cells?.[0]?.value;
      const earnings = parseFloat(row.cells?.[1]?.value || '0');
      const impressions = parseInt(row.cells?.[2]?.value || '0');
      const clicks = parseInt(row.cells?.[3]?.value || '0');
      
      if (!domain) continue;
      
      // Find matching site by URL
      const siteResult = await query(
        `SELECT id FROM sites WHERE url LIKE $1`,
        [`%${domain}%`]
      );
      
      if (siteResult.rows.length === 0) {
        console.log(`No site found for domain: ${domain}`);
        continue;
      }
      
      const siteId = siteResult.rows[0].id;
      
      // Upsert revenue data
      await query(`
        INSERT INTO revenue (site_id, source, amount, impressions, clicks, date, metadata)
        VALUES ($1, 'adsense', $2, $3, $4, $5, $6)
        ON CONFLICT (site_id, source, date)
        DO UPDATE SET 
          amount = $2,
          impressions = $3,
          clicks = $4,
          metadata = $6,
          updated_at = NOW()
      `, [siteId, earnings, impressions, clicks, dateStr, JSON.stringify({ domain })]);
      
      // Update daily stats
      await query(`
        UPDATE daily_stats 
        SET total_revenue = (
          SELECT COALESCE(SUM(amount), 0) 
          FROM revenue 
          WHERE site_id = $1 AND date = $2
        )
        WHERE site_id = $1 AND date = $2
      `, [siteId, dateStr]);
    }
    
    console.log(`✅ AdSense sync complete. Processed ${rows.length} domains.`);
  } catch (error) {
    console.error('❌ AdSense sync failed:', error);
  }
}

// Check alert rules and create alerts if needed
async function checkAlertRules() {
  try {
    const rules = await query(`
      SELECT ar.*, s.name as site_name 
      FROM alert_rules ar
      JOIN sites s ON ar.site_id = s.id
      WHERE ar.is_active = true
    `);
    
    for (const rule of rules.rows) {
      let shouldAlert = false;
      let message = '';
      
      switch (rule.rule_type) {
        case 'revenue_drop': {
          // Compare today's revenue with yesterday
          const today = await query(`
            SELECT COALESCE(SUM(amount), 0) as revenue
            FROM revenue
            WHERE site_id = $1 AND date = CURRENT_DATE
          `, [rule.site_id]);
          
          const yesterday = await query(`
            SELECT COALESCE(SUM(amount), 0) as revenue
            FROM revenue
            WHERE site_id = $1 AND date = CURRENT_DATE - 1
          `, [rule.site_id]);
          
          const todayRev = parseFloat(today.rows[0].revenue);
          const yesterdayRev = parseFloat(yesterday.rows[0].revenue);
          
          if (yesterdayRev > 0) {
            const percentChange = ((todayRev - yesterdayRev) / yesterdayRev) * 100;
            
            if (rule.comparison === 'percent_decrease' && percentChange <= -rule.threshold) {
              shouldAlert = true;
              message = `Revenue dropped ${Math.abs(percentChange).toFixed(1)}% for ${rule.site_name}`;
            }
          }
          break;
        }
        
        case 'traffic_drop': {
          // Compare today's pageviews with yesterday
          const today = await query(`
            SELECT COALESCE(pageviews, 0) as pageviews
            FROM daily_stats
            WHERE site_id = $1 AND date = CURRENT_DATE
          `, [rule.site_id]);
          
          const yesterday = await query(`
            SELECT COALESCE(pageviews, 0) as pageviews
            FROM daily_stats
            WHERE site_id = $1 AND date = CURRENT_DATE - 1
          `, [rule.site_id]);
          
          const todayViews = parseInt(today.rows[0]?.pageviews || '0');
          const yesterdayViews = parseInt(yesterday.rows[0]?.pageviews || '0');
          
          if (yesterdayViews > 0) {
            const percentChange = ((todayViews - yesterdayViews) / yesterdayViews) * 100;
            
            if (rule.comparison === 'percent_decrease' && percentChange <= -rule.threshold) {
              shouldAlert = true;
              message = `Traffic dropped ${Math.abs(percentChange).toFixed(1)}% for ${rule.site_name}`;
            }
          }
          break;
        }
      }
      
      if (shouldAlert) {
        // Check if similar unresolved alert exists
        const existingAlert = await query(`
          SELECT id FROM alerts
          WHERE site_id = $1 AND alert_type = $2 AND is_resolved = false
          AND created_at > NOW() - INTERVAL '24 hours'
        `, [rule.site_id, rule.rule_type]);
        
        if (existingAlert.rows.length === 0) {
          await query(`
            INSERT INTO alerts (site_id, alert_type, severity, message)
            VALUES ($1, $2, 'warning', $3)
          `, [rule.site_id, rule.rule_type, message]);
          
          console.log(`⚠️ Alert created: ${message}`);
        }
      }
    }
  } catch (error) {
    console.error('Error checking alert rules:', error);
  }
}

// Aggregate daily stats
async function aggregateDailyStats() {
  try {
    console.log('🔄 Aggregating daily stats...');
    
    // Calculate bounce rate and session duration for yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];
    
    await query(`
      UPDATE daily_stats ds
      SET 
        sessions = (
          SELECT COUNT(DISTINCT session_id)
          FROM events
          WHERE site_id = ds.site_id AND DATE(created_at) = ds.date
        ),
        avg_session_duration = (
          SELECT COALESCE(AVG((data->>'duration')::int), 0)
          FROM events
          WHERE site_id = ds.site_id 
            AND DATE(created_at) = ds.date 
            AND event_type = 'session_end'
        )
      WHERE date = $1
    `, [dateStr]);
    
    console.log('✅ Daily stats aggregation complete');
  } catch (error) {
    console.error('Error aggregating daily stats:', error);
  }
}

export function startRevenueSync() {
  // Sync AdSense revenue daily at 6 AM
  cron.schedule('0 6 * * *', async () => {
    await syncAdSenseRevenue();
  });
  
  // Check alert rules every hour
  cron.schedule('0 * * * *', async () => {
    await checkAlertRules();
  });
  
  // Aggregate daily stats at midnight
  cron.schedule('5 0 * * *', async () => {
    await aggregateDailyStats();
  });
  
  console.log('📅 Scheduled jobs initialized');
}

// Export for manual triggering
export { syncAdSenseRevenue, checkAlertRules, aggregateDailyStats };
