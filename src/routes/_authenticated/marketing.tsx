import { useState, useEffect } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import {
  Megaphone, Plus, Mail, MessageSquare, Send, BarChart2,
  Users, CheckCircle2, Clock, Play, Trash2, Sparkles, RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { campaignsApi } from '@/lib/api';
import { authStorage } from '@/lib/api/client';

export const Route = createFileRoute('/_authenticated/marketing')({
  component: MarketingPage,
});

function MarketingPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    description: '',
    type: 'email',
    targetSegment: { criteria: 'inactive_60_days' },
  });

  const orgId = authStorage.getOrgId() || 'default';

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      const res = await campaignsApi.list(orgId);
      setCampaigns(res || []);
    } catch (err: any) {
      setCampaigns([]);
      toast.error('Failed to load campaigns from server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await campaignsApi.create(orgId, newCampaign);
      toast.success('Campaign created successfully');
      setShowAddModal(false);
      setNewCampaign({ name: '', description: '', type: 'email', targetSegment: { criteria: 'inactive_60_days' } });
      loadCampaigns();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create campaign');
    }
  };

  const handleLaunch = async (id: string) => {
    try {
      await campaignsApi.launch(orgId, id);
      toast.success('Campaign launched! Messages are queued for delivery.');
      loadCampaigns();
    } catch (err: any) {
      toast.error(err.message || 'Failed to launch campaign');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5EAF1] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900">Marketing &amp; Campaigns</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Automated customer outreach via Email, WhatsApp, and SMS triggered by business events.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadCampaigns} className="text-xs gap-1.5 h-9">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-[#008080] hover:bg-[#006666] text-white text-xs gap-1.5 h-9 font-medium shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Campaign
          </Button>
        </div>
      </div>

      {/* AI Campaign Generator Banner */}
      <div className="p-5 rounded-xl bg-blue-50/60 border border-blue-200 flex flex-col md:flex-row items-center justify-between gap-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-lg bg-blue-100 text-blue-600 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">optera AI Smart Recommendation</h3>
            <p className="text-xs text-gray-600 mt-0.5 max-w-xl leading-relaxed">
              "We identified 37 high-value customers who haven't made a purchase in 60+ days. Launching a targeted re-engagement campaign could recover an estimated ₹1,42,000 in monthly revenue."
            </p>
          </div>
        </div>
        <Button
          onClick={() => {
            setNewCampaign({
              name: 'Autonomous AI Win-Back Sequence',
              description: 'Target inactive high-value accounts with dynamic discount and product recommendations.',
              type: 'whatsapp',
              targetSegment: { criteria: 'high_value_inactive' },
            });
            setShowAddModal(true);
          }}
          className="bg-[#008080] hover:bg-[#006666] text-white font-medium text-xs px-3.5 py-1.5 shrink-0 rounded-lg"
        >
          Auto-Create Campaign →
        </Button>
      </div>

      {/* Campaigns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {campaigns.map((camp) => (
          <div
            key={camp.id}
            className="p-5 rounded-xl bg-white border border-[#E5EAF1] shadow-[0_1px_3px_rgba(0,0,0,0.05)] space-y-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gray-50 border border-[#E5EAF1] text-gray-600">
                  {camp.type === 'whatsapp' ? <MessageSquare className="w-4 h-4 text-green-600" /> : <Mail className="w-4 h-4 text-blue-600" />}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">{camp.name}</h3>
                  <div className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">{camp.type} channel</div>
                </div>
              </div>
              <Badge className={camp.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-600 border border-gray-200'}>
                {camp.status}
              </Badge>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">{camp.description}</p>

            {camp.stats && (
              <div className="grid grid-cols-4 gap-2 pt-3 border-t border-[#E5EAF1] text-center">
                <div className="p-2 rounded-lg bg-[#F8FAFC]">
                  <div className="text-[10px] text-gray-500">Sent</div>
                  <div className="font-bold text-gray-900 text-sm mt-0.5">{camp.stats.sent}</div>
                </div>
                <div className="p-2 rounded-lg bg-[#F8FAFC]">
                  <div className="text-[10px] text-gray-500">Delivered</div>
                  <div className="font-bold text-green-700 text-sm mt-0.5">{camp.stats.delivered}</div>
                </div>
                <div className="p-2 rounded-lg bg-[#F8FAFC]">
                  <div className="text-[10px] text-gray-500">Opened</div>
                  <div className="font-bold text-blue-600 text-sm mt-0.5">{camp.stats.opened}</div>
                </div>
                <div className="p-2 rounded-lg bg-[#F8FAFC]">
                  <div className="text-[10px] text-gray-500">Clicked</div>
                  <div className="font-bold text-purple-600 text-sm mt-0.5">{camp.stats.clicked}</div>
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end gap-2">
              {camp.status !== 'ACTIVE' && (
                <Button
                  size="sm"
                  onClick={() => handleLaunch(camp.id)}
                  className="bg-[#008080] hover:bg-[#006666] text-white text-xs gap-1.5 rounded-lg h-8"
                >
                  <Play className="w-3 h-3" /> Launch Now
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* New Campaign Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-[#E5EAF1] rounded-xl p-6 max-w-md w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5EAF1] pb-3">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-blue-600" />
                Create Campaign
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-gray-700">Campaign Name *</label>
                <Input
                  required
                  placeholder="e.g. Flash Sale WhatsApp Broadcast"
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700">Channel Type</label>
                <select
                  value={newCampaign.type}
                  onChange={(e) => setNewCampaign({ ...newCampaign, type: e.target.value })}
                  className="w-full mt-1 bg-white border border-[#E5EAF1] rounded-lg p-2 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="email">Email Broadcast</option>
                  <option value="whatsapp">WhatsApp Business Message</option>
                  <option value="sms">Transactional SMS</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-gray-700">Target Segment</label>
                <select
                  className="w-full mt-1 bg-white border border-[#E5EAF1] rounded-lg p-2 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option>Inactive Customers (60+ days)</option>
                  <option>Top 20% High Revenue Accounts</option>
                  <option>New Leads (Past 7 Days)</option>
                  <option>All Active Customers</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-gray-700">Description / Goal</label>
                <Input
                  placeholder="e.g. Bring back inactive accounts with 10% promo"
                  value={newCampaign.description}
                  onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E5EAF1]">
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
                <Button type="submit" className="bg-[#008080] hover:bg-[#006666] text-white">Save Campaign</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
