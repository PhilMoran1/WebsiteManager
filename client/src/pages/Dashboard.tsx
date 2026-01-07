import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  DollarSign, 
  Eye, 
  Globe, 
  TrendingUp,
  ArrowRight,
  AlertTriangle
} from 'lucide-react';
import StatCard from '../components/StatCard';
import RevenueChart from '../components/RevenueChart';
import { useApi } from '../hooks/useApi';
import { sitesApi, revenueApi, alertsApi, Site, RevenueOverview, AlertSummary } from '../api/client';

export default function Dashboard() {
  const { data: sites, loading: sitesLoading } = useApi<Site[]>(
    useCallback(() => sitesApi.getAll(), [])
  );
  
  const { data: revenueData, loading: revenueLoading } = useApi<RevenueOverview>(
    useCallback(() => revenueApi.getOverview(30), [])
  );
  
  const { data: alertSummary } = useApi<AlertSummary>(
    useCallback(() => alertsApi.getSummary(), [])
  );

  const loading = sitesLoading || revenueLoading;

  // Calculate totals (parse strings to numbers since DB returns decimals as strings)
  const totalSites = sites?.length || 0;
  const activeSites = sites?.filter(s => s.is_active).length || 0;
  const totalRevenue = parseFloat(String(revenueData?.summary?.total_revenue || 0)) || 0;
  const totalPageviews = sites?.reduce((sum, site) => sum + (parseInt(String(site.today_pageviews)) || 0), 0) || 0;

  // Chart data
  const chartData = revenueData?.daily?.map(d => ({
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-100">Dashboard</h1>
          <p className="text-dark-400 mt-1">Overview of all your websites</p>
        </div>
        {alertSummary && alertSummary.totalUnresolved > 0 && (
          <Link 
            to="/alerts"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>{alertSummary.totalUnresolved} unresolved alerts</span>
          </Link>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue (30d)"
          value={`$${totalRevenue.toFixed(2)}`}
          icon={DollarSign}
          color="green"
          delay={1}
        />
        <StatCard
          title="Total Sites"
          value={totalSites}
          icon={Globe}
          color="blue"
          delay={2}
        />
        <StatCard
          title="Active Sites"
          value={activeSites}
          icon={TrendingUp}
          color="yellow"
          delay={3}
        />
        <StatCard
          title="Today's Pageviews"
          value={totalPageviews}
          icon={Eye}
          color="green"
          delay={4}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-dark-100">Revenue Trend</h2>
            <Link 
              to="/revenue" 
              className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1"
            >
              View details <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {chartData.length > 0 ? (
            <RevenueChart data={chartData} />
          ) : (
            <div className="h-[300px] flex items-center justify-center text-dark-500">
              No revenue data available yet
            </div>
          )}
        </div>

        {/* Top Sites */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-dark-100">Top Performers</h2>
            <Link 
              to="/sites" 
              className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1"
            >
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {revenueData?.topSites?.slice(0, 5).map((site, index) => (
              <Link
                key={site.id}
                to={`/sites/${site.id}`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-dark-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-dark-700 flex items-center justify-center text-sm font-bold text-dark-300">
                    {index + 1}
                  </div>
                  <div>
                    <div className="text-dark-200 font-medium truncate max-w-[150px]">
                      {site.name}
                    </div>
                    <div className="text-xs text-dark-500 truncate max-w-[150px]">
                      {site.url}
                    </div>
                  </div>
                </div>
                <div className="text-primary-400 font-semibold">
                  ${parseFloat(String(site.total_revenue)).toFixed(2)}
                </div>
              </Link>
            ))}
            {(!revenueData?.topSites || revenueData.topSites.length === 0) && (
              <div className="text-center text-dark-500 py-8">
                No revenue data yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Sites */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-dark-100">Recent Sites</h2>
          <Link 
            to="/sites" 
            className="btn btn-secondary text-sm"
          >
            Manage Sites
          </Link>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>URL</th>
                <th>Category</th>
                <th>Status</th>
                <th>Today's Views</th>
                <th>Today's Revenue</th>
              </tr>
            </thead>
            <tbody>
              {sites?.slice(0, 5).map((site) => (
                <tr key={site.id}>
                  <td>
                    <Link 
                      to={`/sites/${site.id}`}
                      className="text-dark-200 hover:text-primary-400 font-medium"
                    >
                      {site.name}
                    </Link>
                  </td>
                  <td>
                    <a 
                      href={site.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-dark-400 hover:text-dark-200 text-sm"
                    >
                      {site.url}
                    </a>
                  </td>
                  <td>
                    <span className="badge badge-info">{site.category}</span>
                  </td>
                  <td>
                    <span className={`badge ${site.is_active ? 'badge-success' : 'badge-warning'}`}>
                      {site.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="text-dark-300">
                    {(parseInt(String(site.today_pageviews)) || 0).toLocaleString()}
                  </td>
                  <td className="text-primary-400 font-medium">
                    ${(parseFloat(String(site.today_revenue)) || 0).toFixed(2)}
                  </td>
                </tr>
              ))}
              {(!sites || sites.length === 0) && (
                <tr>
                  <td colSpan={6} className="text-center text-dark-500 py-8">
                    No sites added yet. <Link to="/sites" className="text-primary-400 hover:underline">Add your first site</Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
