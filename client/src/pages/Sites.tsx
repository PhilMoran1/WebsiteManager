import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, ExternalLink, Copy, Check, Trash2 } from 'lucide-react';
import Modal from '../components/Modal';
import { useApi, useMutation } from '../hooks/useApi';
import { sitesApi, Site, CreateSiteData } from '../api/client';

export default function Sites() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateSiteData>({
    name: '',
    url: '',
    category: 'other',
  });

  const { data: sites, loading, refetch } = useApi<Site[]>(
    useCallback(() => sitesApi.getAll(), [])
  );

  const createMutation = useMutation((data: CreateSiteData) => sitesApi.create(data));
  const deleteMutation = useMutation((id: string) => sitesApi.delete(id));

  const filteredSites = sites?.filter(site =>
    site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    site.url.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMutation.mutate(formData);
      setIsModalOpen(false);
      setFormData({ name: '', url: '', category: 'other' });
      refetch();
    } catch (error) {
      console.error('Failed to create site:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this site? This action cannot be undone.')) {
      try {
        await deleteMutation.mutate(id);
        refetch();
      } catch (error) {
        console.error('Failed to delete site:', error);
      }
    }
  };

  const copyTrackingId = async (trackingId: string) => {
    await navigator.clipboard.writeText(trackingId);
    setCopiedId(trackingId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const categories = ['game', 'blog', 'ecommerce', 'portfolio', 'tool', 'other'];

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
          <h1 className="text-2xl font-bold text-dark-100">Sites</h1>
          <p className="text-dark-400 mt-1">Manage your websites and tracking codes</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Site
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
        <input
          type="text"
          placeholder="Search sites..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4"
        />
      </div>

      {/* Sites Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSites.map((site) => (
          <div key={site.id} className="card card-hover p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 min-w-0">
                <Link 
                  to={`/sites/${site.id}`}
                  className="text-lg font-semibold text-dark-100 hover:text-primary-400 transition-colors block truncate"
                >
                  {site.name}
                </Link>
                <a 
                  href={site.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-dark-400 hover:text-dark-300 flex items-center gap-1 mt-1"
                >
                  <span className="truncate">{site.url}</span>
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
              </div>
              <span className={`badge ml-2 ${site.is_active ? 'badge-success' : 'badge-warning'}`}>
                {site.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <span className="badge badge-info">{site.category}</span>
            </div>

            {/* Tracking ID */}
            <div className="bg-dark-900/50 rounded-lg p-3 mb-4">
              <div className="text-xs text-dark-500 mb-1">Tracking ID</div>
              <div className="flex items-center justify-between">
                <code className="text-sm text-dark-300 font-mono">{site.tracking_id}</code>
                <button
                  onClick={() => copyTrackingId(site.tracking_id)}
                  className="text-dark-400 hover:text-primary-400 transition-colors"
                >
                  {copiedId === site.tracking_id ? (
                    <Check className="w-4 h-4 text-primary-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-xs text-dark-500">Today's Views</div>
                <div className="text-lg font-semibold text-dark-200">
                  {(parseInt(String(site.today_pageviews)) || 0).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-dark-500">Today's Revenue</div>
                <div className="text-lg font-semibold text-primary-400">
                  ${(parseFloat(String(site.today_revenue)) || 0).toFixed(2)}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-dark-700/50">
              <Link 
                to={`/sites/${site.id}`}
                className="text-sm text-primary-400 hover:text-primary-300"
              >
                View Details
              </Link>
              <button
                onClick={() => handleDelete(site.id)}
                className="text-dark-500 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {filteredSites.length === 0 && (
          <div className="col-span-full text-center py-12">
            <div className="text-dark-500 mb-4">
              {searchTerm ? 'No sites match your search' : 'No sites added yet'}
            </div>
            {!searchTerm && (
              <button 
                onClick={() => setIsModalOpen(true)}
                className="btn btn-primary"
              >
                Add Your First Site
              </button>
            )}
          </div>
        )}
      </div>

      {/* Add Site Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Site"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              Site Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="My Awesome Game"
              required
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              URL
            </label>
            <input
              type="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="https://example.com"
              required
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {createMutation.error && (
            <div className="text-red-400 text-sm">{createMutation.error.message}</div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.loading}
              className="btn btn-primary"
            >
              {createMutation.loading ? 'Adding...' : 'Add Site'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
