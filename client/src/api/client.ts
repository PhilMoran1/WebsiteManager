const API_BASE = '/api';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body } = options;

  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

// Sites API
export const sitesApi = {
  getAll: () => request<Site[]>('/sites'),
  getById: (id: string) => request<Site>(`/sites/${id}`),
  create: (data: CreateSiteData) => request<Site>('/sites', { method: 'POST', body: data }),
  update: (id: string, data: Partial<Site>) => request<Site>(`/sites/${id}`, { method: 'PUT', body: data }),
  delete: (id: string) => request<void>(`/sites/${id}`, { method: 'DELETE' }),
  getTrackingCode: (id: string) => request<TrackingCodeResponse>(`/sites/${id}/tracking-code`),
  getStats: (id: string, days?: number) => request<SiteStats>(`/sites/${id}/stats?days=${days || 30}`),
};

// Revenue API
export const revenueApi = {
  getOverview: (days?: number) => request<RevenueOverview>(`/revenue/overview?days=${days || 30}`),
  getSiteRevenue: (siteId: string, days?: number) => request<SiteRevenue>(`/revenue/site/${siteId}?days=${days || 30}`),
  addRevenue: (data: AddRevenueData) => request<Revenue>('/revenue', { method: 'POST', body: data }),
  getComparison: (days?: number) => request<RevenueComparison>(`/revenue/comparison?days=${days || 7}`),
};

// Alerts API
export const alertsApi = {
  getAll: (resolved?: boolean) => request<Alert[]>(`/alerts?resolved=${resolved || false}`),
  getSiteAlerts: (siteId: string) => request<Alert[]>(`/alerts/site/${siteId}`),
  resolve: (id: string) => request<Alert>(`/alerts/${id}/resolve`, { method: 'PUT' }),
  getSummary: () => request<AlertSummary>('/alerts/summary'),
  getRules: () => request<AlertRule[]>('/alerts/rules'),
  createRule: (data: CreateAlertRuleData) => request<AlertRule>('/alerts/rules', { method: 'POST', body: data }),
  deleteRule: (id: string) => request<void>(`/alerts/rules/${id}`, { method: 'DELETE' }),
};

// Tracking API
export const trackingApi = {
  getEvents: (siteId: string, limit?: number) => request<TrackingEvent[]>(`/tracking/events/${siteId}?limit=${limit || 100}`),
  getRealtime: (siteId: string) => request<RealtimeStats>(`/tracking/realtime/${siteId}`),
};

// Types
export interface Site {
  id: string;
  name: string;
  url: string;
  category: string;
  tracking_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  today_pageviews?: number;
  today_revenue?: number;
}

export interface CreateSiteData {
  name: string;
  url: string;
  category?: string;
}

export interface TrackingCodeResponse {
  trackingId: string;
  trackingCode: string;
  instructions: string;
}

export interface SiteStats {
  daily: DailyStats[];
  totals: StatsTotals;
}

export interface DailyStats {
  date: string;
  pageviews: number;
  unique_visitors: number;
  sessions: number;
  avg_session_duration: number;
  bounce_rate: number;
  total_revenue: number;
}

export interface StatsTotals {
  total_pageviews: number;
  total_visitors: number;
  total_sessions: number;
  avg_duration: number;
  avg_bounce_rate: number;
  total_revenue: number;
}

export interface RevenueOverview {
  daily: DailyRevenue[];
  bySource: SourceRevenue[];
  topSites: TopSite[];
  summary: RevenueSummary;
}

export interface DailyRevenue {
  date: string;
  total_revenue: number;
  total_impressions: number;
  total_clicks: number;
}

export interface SourceRevenue {
  source: string;
  total_revenue: number;
  total_impressions: number;
  total_clicks: number;
}

export interface TopSite {
  id: string;
  name: string;
  url: string;
  total_revenue: number;
}

export interface RevenueSummary {
  total_revenue: number;
  total_impressions: number;
  total_clicks: number;
  ctr: number;
  rpm: number;
}

export interface SiteRevenue {
  daily: Revenue[];
  summary: {
    total_revenue: number;
    total_impressions: number;
    total_clicks: number;
    avg_daily_revenue: number;
  };
}

export interface Revenue {
  id: string;
  site_id: string;
  source: string;
  amount: number;
  currency: string;
  impressions: number;
  clicks: number;
  date: string;
  metadata: Record<string, any>;
}

export interface AddRevenueData {
  site_id: string;
  source: string;
  amount: number;
  currency?: string;
  impressions?: number;
  clicks?: number;
  date: string;
  metadata?: Record<string, any>;
}

export interface RevenueComparison {
  current: number;
  previous: number;
  change: string;
  trend: 'up' | 'down';
}

export interface Alert {
  id: string;
  site_id: string;
  site_name?: string;
  site_url?: string;
  alert_type: string;
  severity: 'warning' | 'critical' | 'info';
  message: string;
  is_resolved: boolean;
  resolved_at?: string;
  created_at: string;
}

export interface AlertSummary {
  byType: { alert_type: string; severity: string; count: number }[];
  totalUnresolved: number;
}

export interface AlertRule {
  id: string;
  site_id: string;
  site_name?: string;
  rule_type: string;
  threshold: number;
  comparison: string;
  is_active: boolean;
}

export interface CreateAlertRuleData {
  site_id: string;
  rule_type: string;
  threshold: number;
  comparison: string;
}

export interface TrackingEvent {
  id: string;
  site_id: string;
  session_id: string;
  event_type: string;
  url: string;
  referrer: string;
  data: Record<string, any>;
  created_at: string;
}

export interface RealtimeStats {
  pageviews: number;
  active_users: number;
}
