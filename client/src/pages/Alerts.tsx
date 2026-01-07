import { useState, useCallback } from 'react';
import { 
  Bell, 
  CheckCircle, 
  AlertTriangle, 
  AlertCircle,
  Plus,
  Trash2,
  Filter
} from 'lucide-react';
import Modal from '../components/Modal';
import { useApi, useMutation } from '../hooks/useApi';
import { 
  alertsApi, 
  sitesApi, 
  Alert, 
  AlertRule, 
  AlertSummary,
  Site,
  CreateAlertRuleData 
} from '../api/client';
import clsx from 'clsx';

const severityIcons = {
  critical: AlertCircle,
  warning: AlertTriangle,
  info: Bell,
};

const severityColors = {
  critical: 'text-red-400 bg-red-500/10',
  warning: 'text-yellow-400 bg-yellow-500/10',
  info: 'text-blue-400 bg-blue-500/10',
};

export default function Alerts() {
  const [showResolved, setShowResolved] = useState(false);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [ruleForm, setRuleForm] = useState<CreateAlertRuleData>({
    site_id: '',
    rule_type: 'revenue_drop',
    threshold: 20,
    comparison: 'percent_decrease',
  });

  const { data: alerts, loading: alertsLoading, refetch: refetchAlerts } = useApi<Alert[]>(
    useCallback(() => alertsApi.getAll(showResolved), [showResolved])
  );

  const { data: summary } = useApi<AlertSummary>(
    useCallback(() => alertsApi.getSummary(), [])
  );

  const { data: rules, refetch: refetchRules } = useApi<AlertRule[]>(
    useCallback(() => alertsApi.getRules(), [])
  );

  const { data: sites } = useApi<Site[]>(
    useCallback(() => sitesApi.getAll(), [])
  );

  const resolveMutation = useMutation((id: string) => alertsApi.resolve(id));
  const createRuleMutation = useMutation((data: CreateAlertRuleData) => alertsApi.createRule(data));
  const deleteRuleMutation = useMutation((id: string) => alertsApi.deleteRule(id));

  const handleResolve = async (id: string) => {
    try {
      await resolveMutation.mutate(id);
      refetchAlerts();
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createRuleMutation.mutate(ruleForm);
      setIsRuleModalOpen(false);
      setRuleForm({
        site_id: '',
        rule_type: 'revenue_drop',
        threshold: 20,
        comparison: 'percent_decrease',
      });
      refetchRules();
    } catch (error) {
      console.error('Failed to create rule:', error);
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (confirm('Are you sure you want to delete this alert rule?')) {
      try {
        await deleteRuleMutation.mutate(id);
        refetchRules();
      } catch (error) {
        console.error('Failed to delete rule:', error);
      }
    }
  };

  if (alertsLoading) {
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
          <h1 className="text-2xl font-bold text-dark-100">Alerts</h1>
          <p className="text-dark-400 mt-1">Monitor issues across your sites</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowResolved(!showResolved)}
            className={clsx(
              "btn flex items-center gap-2",
              showResolved ? "btn-primary" : "btn-secondary"
            )}
          >
            <Filter className="w-4 h-4" />
            {showResolved ? 'Showing Resolved' : 'Show Resolved'}
          </button>
          <button 
            onClick={() => setIsRuleModalOpen(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Rule
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <div className="text-sm text-dark-400">Unresolved Alerts</div>
                <div className="text-2xl font-bold text-dark-100">{summary.totalUnresolved}</div>
              </div>
            </div>
          </div>
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <div className="text-sm text-dark-400">Warnings</div>
                <div className="text-2xl font-bold text-dark-100">
                  {summary.byType?.filter(t => t.severity === 'warning').reduce((sum, t) => sum + t.count, 0) || 0}
                </div>
              </div>
            </div>
          </div>
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <div className="text-sm text-dark-400">Active Rules</div>
                <div className="text-2xl font-bold text-dark-100">{rules?.length || 0}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alerts List */}
      <div className="card">
        <div className="px-6 py-4 border-b border-dark-700/50">
          <h2 className="text-lg font-semibold text-dark-100">
            {showResolved ? 'Resolved Alerts' : 'Active Alerts'}
          </h2>
        </div>
        <div className="divide-y divide-dark-700/30">
          {alerts?.map((alert) => {
            const Icon = severityIcons[alert.severity] || Bell;
            const colorClass = severityColors[alert.severity] || severityColors.info;
            
            return (
              <div key={alert.id} className="p-4 hover:bg-dark-800/30 transition-colors">
                <div className="flex items-start gap-4">
                  <div className={clsx("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", colorClass)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-dark-200 font-medium">{alert.message}</div>
                        <div className="text-sm text-dark-500 mt-1">
                          {alert.site_name && <span>{alert.site_name} • </span>}
                          <span className="capitalize">{alert.alert_type.replace('_', ' ')}</span>
                          {' • '}
                          {new Date(alert.created_at).toLocaleString()}
                        </div>
                      </div>
                      {!alert.is_resolved && (
                        <button
                          onClick={() => handleResolve(alert.id)}
                          disabled={resolveMutation.loading}
                          className="btn btn-secondary text-sm"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {(!alerts || alerts.length === 0) && (
            <div className="p-8 text-center text-dark-500">
              {showResolved ? 'No resolved alerts' : 'No active alerts - everything looks good!'}
            </div>
          )}
        </div>
      </div>

      {/* Alert Rules */}
      <div className="card">
        <div className="px-6 py-4 border-b border-dark-700/50">
          <h2 className="text-lg font-semibold text-dark-100">Alert Rules</h2>
        </div>
        <div className="table-container border-0">
          <table>
            <thead>
              <tr>
                <th>Site</th>
                <th>Rule Type</th>
                <th>Threshold</th>
                <th>Comparison</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules?.map((rule) => (
                <tr key={rule.id}>
                  <td className="text-dark-200">{rule.site_name || 'Unknown'}</td>
                  <td>
                    <span className="badge badge-info capitalize">
                      {rule.rule_type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="text-dark-300">{rule.threshold}%</td>
                  <td className="text-dark-300 capitalize">
                    {rule.comparison.replace('_', ' ')}
                  </td>
                  <td>
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="text-dark-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {(!rules || rules.length === 0) && (
                <tr>
                  <td colSpan={5} className="text-center text-dark-500 py-8">
                    No alert rules configured yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Rule Modal */}
      <Modal
        isOpen={isRuleModalOpen}
        onClose={() => setIsRuleModalOpen(false)}
        title="Create Alert Rule"
      >
        <form onSubmit={handleCreateRule} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              Site
            </label>
            <select
              value={ruleForm.site_id}
              onChange={(e) => setRuleForm({ ...ruleForm, site_id: e.target.value })}
              required
              className="w-full"
            >
              <option value="">Select a site</option>
              {sites?.map((site) => (
                <option key={site.id} value={site.id}>{site.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              Rule Type
            </label>
            <select
              value={ruleForm.rule_type}
              onChange={(e) => setRuleForm({ ...ruleForm, rule_type: e.target.value })}
              className="w-full"
            >
              <option value="revenue_drop">Revenue Drop</option>
              <option value="traffic_drop">Traffic Drop</option>
              <option value="error_spike">Error Spike</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              Threshold (%)
            </label>
            <input
              type="number"
              value={ruleForm.threshold}
              onChange={(e) => setRuleForm({ ...ruleForm, threshold: Number(e.target.value) })}
              min="1"
              max="100"
              required
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              Comparison
            </label>
            <select
              value={ruleForm.comparison}
              onChange={(e) => setRuleForm({ ...ruleForm, comparison: e.target.value })}
              className="w-full"
            >
              <option value="percent_decrease">Percent Decrease</option>
              <option value="percent_increase">Percent Increase</option>
              <option value="less_than">Less Than</option>
              <option value="greater_than">Greater Than</option>
            </select>
          </div>

          {createRuleMutation.error && (
            <div className="text-red-400 text-sm">{createRuleMutation.error.message}</div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsRuleModalOpen(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createRuleMutation.loading}
              className="btn btn-primary"
            >
              {createRuleMutation.loading ? 'Creating...' : 'Create Rule'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
