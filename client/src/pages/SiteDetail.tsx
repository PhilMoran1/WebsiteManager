import { useCallback, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  ExternalLink, 
  Copy, 
  Check, 
  Eye, 
  DollarSign,
  Users,
  Clock
} from 'lucide-react';
import StatCard from '../components/StatCard';
import RevenueChart from '../components/RevenueChart';
import { useApi } from '../hooks/useApi';
import { sitesApi, revenueApi, Site, SiteStats, SiteRevenue } from '../api/client';

export default function SiteDetail() {
  const { id } = useParams<{ id: string }>();
  const [copied, setCopied] = useState(false);
  const [showCode, setShowCode] = useState(false);

  const { data: site, loading: siteLoading } = useApi<Site>(
    useCallback(() => sitesApi.getById(id!), [id])
  );

  const { data: stats, loading: statsLoading } = useApi<SiteStats>(
    useCallback(() => sitesApi.getStats(id!, 30), [id])
  );

  const { data: revenue, loading: revenueLoading } = useApi<SiteRevenue>(
    useCallback(() => revenueApi.getSiteRevenue(id!, 30), [id])
  );

  const { data: trackingCode } = useApi(
    useCallback(() => sitesApi.getTrackingCode(id!), [id])
  );

  const loading = siteLoading || statsLoading || revenueLoading;

  const copyCode = async () => {
    if (trackingCode?.trackingCode) {
      await navigator.clipboard.writeText(trackingCode.trackingCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const chartData = stats?.daily?.map(d => ({
    date: d.date,
    revenue: parseFloat(String(d.total_revenue)) || 0
  })) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!site) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-dark-200 mb-4">Site not found</h2>
        <Link to="/sites" className="btn btn-primary">Back to Sites</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link 
          to="/sites"
          className="mt-1 text-dark-400 hover:text-dark-200 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-dark-100">{site.name}</h1>
            <span className={`badge ${site.is_active ? 'badge-success' : 'badge-warning'}`}>
              {site.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <a 
            href={site.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-dark-400 hover:text-primary-400 flex items-center gap-1"
          >
            {site.url}
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue (30d)"
          value={`$${(parseFloat(String(stats?.totals?.total_revenue)) || 0).toFixed(2)}`}
          icon={DollarSign}
          color="green"
          delay={1}
        />
        <StatCard
          title="Total Pageviews"
          value={parseInt(String(stats?.totals?.total_pageviews)) || 0}
          icon={Eye}
          color="blue"
          delay={2}
        />
        <StatCard
          title="Unique Visitors"
          value={parseInt(String(stats?.totals?.total_visitors)) || 0}
          icon={Users}
          color="yellow"
          delay={3}
        />
        <StatCard
          title="Avg Session Duration"
          value={`${Math.round((parseFloat(String(stats?.totals?.avg_duration)) || 0) / 1000)}s`}
          icon={Clock}
          color="green"
          delay={4}
        />
      </div>

      {/* Charts and Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 card p-6">
          <h2 className="text-lg font-semibold text-dark-100 mb-6">Revenue Trend</h2>
          {chartData.length > 0 ? (
            <RevenueChart data={chartData} />
          ) : (
            <div className="h-[300px] flex items-center justify-center text-dark-500">
              No revenue data available yet
            </div>
          )}
        </div>

        {/* Site Info */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-dark-100 mb-6">Site Information</h2>
          <div className="space-y-4">
            <div>
              <div className="text-xs text-dark-500 uppercase tracking-wider mb-1">Category</div>
              <span className="badge badge-info">{site.category}</span>
            </div>
            <div>
              <div className="text-xs text-dark-500 uppercase tracking-wider mb-1">Tracking ID</div>
              <code className="text-sm text-dark-300 font-mono">{site.tracking_id}</code>
            </div>
            <div>
              <div className="text-xs text-dark-500 uppercase tracking-wider mb-1">Created</div>
              <div className="text-dark-300">
                {new Date(site.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tracking Code */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-dark-100">Tracking Code</h2>
          <button
            onClick={() => setShowCode(!showCode)}
            className="text-sm text-primary-400 hover:text-primary-300"
          >
            {showCode ? 'Hide' : 'Show'} Code
          </button>
        </div>
        <p className="text-dark-400 mb-4">
          Add this code to the <code className="text-primary-400">&lt;head&gt;</code> section of your website to start tracking.
        </p>
        {showCode && trackingCode && (
          <div className="relative">
            <pre className="bg-dark-900 rounded-lg p-4 overflow-x-auto">
              <code className="text-sm text-dark-300 font-mono">
                {trackingCode.trackingCode}
              </code>
            </pre>
            <button
              onClick={copyCode}
              className="absolute top-3 right-3 text-dark-400 hover:text-primary-400 transition-colors"
            >
              {copied ? (
                <Check className="w-5 h-5 text-primary-400" />
              ) : (
                <Copy className="w-5 h-5" />
              )}
            </button>
          </div>
        )}
      </div>

      {/* Revenue Breakdown */}
      {revenue && revenue.daily.length > 0 && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-dark-100 mb-6">Revenue Breakdown</h2>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Source</th>
                  <th>Impressions</th>
                  <th>Clicks</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {revenue.daily.slice(0, 10).map((entry, index) => (
                  <tr key={index}>
                    <td className="text-dark-300">
                      {new Date(entry.date).toLocaleDateString()}
                    </td>
                    <td>
                      <span className="badge badge-info">{entry.source}</span>
                    </td>
                    <td className="text-dark-300">
                      {entry.impressions.toLocaleString()}
                    </td>
                    <td className="text-dark-300">
                      {entry.clicks.toLocaleString()}
                    </td>
                    <td className="text-primary-400 font-medium">
                      ${parseFloat(String(entry.amount)).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
