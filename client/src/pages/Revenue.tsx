import { useState, useCallback } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  MousePointer, 
  Eye,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import StatCard from '../components/StatCard';
import RevenueChart from '../components/RevenueChart';
import { useApi } from '../hooks/useApi';
import { revenueApi, RevenueOverview, RevenueComparison } from '../api/client';

export default function Revenue() {
  const [days, setDays] = useState(30);

  const { data: overview, loading } = useApi<RevenueOverview>(
    useCallback(() => revenueApi.getOverview(days), [days])
  );

  const { data: comparison } = useApi<RevenueComparison>(
    useCallback(() => revenueApi.getComparison(7), [])
  );

  const chartData = overview?.daily?.map(d => ({
    date: d.date,
    revenue: parseFloat(String(d.total_revenue)) || 0
  })) || [];

  const totalRevenue = parseFloat(String(overview?.summary?.total_revenue)) || 0;
  const totalImpressions = parseInt(String(overview?.summary?.total_impressions)) || 0;
  const totalClicks = parseInt(String(overview?.summary?.total_clicks)) || 0;
  const ctr = parseFloat(String(overview?.summary?.ctr)) || 0;
  const rpm = parseFloat(String(overview?.summary?.rpm)) || 0;

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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-100">Revenue</h1>
          <p className="text-dark-400 mt-1">Track your earnings across all sites</p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="bg-dark-800 border-dark-700"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Period Comparison */}
      {comparison && (
        <div className="card p-6">
          <div className="flex items-center gap-6">
            <div>
              <div className="text-sm text-dark-400 mb-1">This week vs last week</div>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold text-dark-100">
                  ${comparison.current.toFixed(2)}
                </span>
                <div className={`flex items-center gap-1 ${
                  comparison.trend === 'up' ? 'text-primary-400' : 'text-red-400'
                }`}>
                  {comparison.trend === 'up' ? (
                    <ArrowUpRight className="w-5 h-5" />
                  ) : (
                    <ArrowDownRight className="w-5 h-5" />
                  )}
                  <span className="font-semibold">{Math.abs(parseFloat(comparison.change))}%</span>
                </div>
              </div>
            </div>
            <div className="text-dark-500">
              Previous: ${comparison.previous.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Revenue"
          value={`$${totalRevenue.toFixed(2)}`}
          icon={DollarSign}
          color="green"
          delay={1}
        />
        <StatCard
          title="Impressions"
          value={totalImpressions.toLocaleString()}
          icon={Eye}
          color="blue"
          delay={2}
        />
        <StatCard
          title="Clicks"
          value={totalClicks.toLocaleString()}
          icon={MousePointer}
          color="yellow"
          delay={3}
        />
        <StatCard
          title="CTR"
          value={`${ctr.toFixed(2)}%`}
          icon={TrendingUp}
          color="green"
          delay={4}
        />
        <StatCard
          title="RPM"
          value={`$${rpm.toFixed(2)}`}
          icon={DollarSign}
          color="green"
          delay={5}
        />
      </div>

      {/* Chart */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-dark-100 mb-6">Revenue Over Time</h2>
        {chartData.length > 0 ? (
          <RevenueChart data={chartData} height={350} />
        ) : (
          <div className="h-[350px] flex items-center justify-center text-dark-500">
            No revenue data available for this period
          </div>
        )}
      </div>

      {/* Revenue by Source and Top Sites */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Source */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-dark-100 mb-6">Revenue by Source</h2>
          <div className="space-y-4">
            {overview?.bySource?.map((source) => {
              const percentage = totalRevenue > 0 
                ? (parseFloat(String(source.total_revenue)) / totalRevenue) * 100 
                : 0;
              
              return (
                <div key={source.source}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-dark-300 capitalize">{source.source}</span>
                    <span className="text-primary-400 font-semibold">
                      ${parseFloat(String(source.total_revenue)).toFixed(2)}
                    </span>
                  </div>
                  <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {(!overview?.bySource || overview.bySource.length === 0) && (
              <div className="text-center text-dark-500 py-8">
                No revenue sources recorded yet
              </div>
            )}
          </div>
        </div>

        {/* Top Earning Sites */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-dark-100 mb-6">Top Earning Sites</h2>
          <div className="space-y-3">
            {overview?.topSites?.map((site, index) => (
              <div 
                key={site.id}
                className="flex items-center justify-between p-3 rounded-lg bg-dark-800/30"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-dark-700 flex items-center justify-center text-sm font-bold text-dark-300">
                    {index + 1}
                  </div>
                  <div>
                    <div className="text-dark-200 font-medium">{site.name}</div>
                    <div className="text-xs text-dark-500">{site.url}</div>
                  </div>
                </div>
                <div className="text-primary-400 font-semibold">
                  ${parseFloat(String(site.total_revenue)).toFixed(2)}
                </div>
              </div>
            ))}
            {(!overview?.topSites || overview.topSites.length === 0) && (
              <div className="text-center text-dark-500 py-8">
                No revenue data yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Daily Breakdown Table */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-dark-100 mb-6">Daily Breakdown</h2>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Revenue</th>
                <th>Impressions</th>
                <th>Clicks</th>
                <th>CTR</th>
              </tr>
            </thead>
            <tbody>
              {overview?.daily?.slice().reverse().slice(0, 14).map((day) => {
                const dayCtr = day.total_impressions > 0 
                  ? (day.total_clicks / day.total_impressions) * 100 
                  : 0;
                
                return (
                  <tr key={day.date}>
                    <td className="text-dark-300">
                      {new Date(day.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="text-primary-400 font-medium">
                      ${parseFloat(String(day.total_revenue)).toFixed(2)}
                    </td>
                    <td className="text-dark-300">
                      {day.total_impressions.toLocaleString()}
                    </td>
                    <td className="text-dark-300">
                      {day.total_clicks.toLocaleString()}
                    </td>
                    <td className="text-dark-300">
                      {dayCtr.toFixed(2)}%
                    </td>
                  </tr>
                );
              })}
              {(!overview?.daily || overview.daily.length === 0) && (
                <tr>
                  <td colSpan={5} className="text-center text-dark-500 py-8">
                    No data available
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
