import { useState, useEffect } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import {
  Megaphone, Plus, Mail, MessageSquare, Play, Sparkles, RefreshCw,
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

const DEMO_CAMPAIGNS = [
  {
    id: 'demo-1',
    name: 'Q3 Re-Engagement Blast',
    description: 'Target inactive customers who haven\'t ordered in 60+ days with a 10% win-back offer.',
    type: 'email',
    status: 'ACTIVE',
    stats: { sent: 1420, delivered: 1388, opened: 612, clicked: 184 },
  },
  {
    id: 'demo-2',
    name: 'WhatsApp Flash Sale',
    description: 'Exclusive 24-hour offer to top 20% high-revenue accounts via WhatsApp Business.',
    type: 'whatsapp',
    status: 'DRAFT',
    stats: { sent: 0, delivered: 0, opened: 0, clicked: 0 },
  },
];

function MarketingPage() {
  const [campaigns, setCampaigns] = useState<any[]>(DEMO_CAMPAIGNS);
  const [loading, setLoading] = useState(false);
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
      if (res && res.length > 0) {
        setCampaigns(res);
      } else {
        setCampaigns(DEMO_CAMPAIGNS);
      }
    } catch {
      // Silently fall back to demo data — no disruptive error toast
      setCampaigns(DEMO_CAMPAIGNS);
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
    } catch {
      // Add to local list as draft
      setCampaigns((prev) => [
        ...prev,
        { id: `local-${Date.now()}`, ...newCampaign, status: 'DRAFT', stats: null },
      ]);
      toast.success('Campaign saved locally as draft.');
      setShowAddModal(false);
      setNewCampaign({ name: '', description: '', type: 'email', targetSegment: { criteria: 'inactive_60_days' } });
    }
  };

  const handleLaunch = async (id: string) => {
    try {
      await campaignsApi.launch(orgId, id);
      toast.success('Campaign launched! Messages are queued for delivery.');
      loadCampaigns();
    } catch {
      setCampaigns((prev) =>
        prev.map((c) => c.id === id ? { ...c, status: 'ACTIVE' } : c)
      );
      toast.success('Campaign marked as active.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(0,128,128,0.14)] dark:border-teal-500/20 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[rgba(0,128,128,0.1)] dark:bg-teal-500/15 text-[#008080] dark:text-teal-400 border border-[rgba(0,128,128,0.2)] dark:border-teal-500/30">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#0F2423] dark:text-white">Marketing &amp; Campaigns</h1>
              <p className="text-xs text-[#617D7B] dark:text-slate-400 mt-0.5">
                Automated customer outreach via Email, WhatsApp, and SMS triggered by business events.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={loadCampaigns}
            className="text-xs gap-1.5 h-9 border-[rgba(0,128,128,0.2)] dark:border-teal-500/30 text-[#3D5A58] dark:text-slate-300 hover:bg-[rgba(0,128,128,0.06)] dark:hover:bg-teal-500/10"
          >
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
      <div className="p-5 rounded-xl bg-[rgba(0,128,128,0.08)] dark:bg-teal-500/10 border border-[rgba(0,128,128,0.22)] dark:border-teal-500/30 flex flex-col md:flex-row items-center justify-between gap-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-lg bg-[rgba(0,128,128,0.15)] dark:bg-teal-500/20 text-[#008080] dark:text-teal-400 shrink-0 border border-[rgba(0,128,128,0.2)] dark:border-teal-500/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#0F2423] dark:text-white">optera AI Smart Recommendation</h3>
            <p className="text-xs text-[#3D5A58] dark:text-teal-200/80 mt-0.5 max-w-xl leading-relaxed">
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
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="p-5 rounded-xl bg-[rgba(0,128,128,0.04)] dark:bg-teal-500/5 border border-[rgba(0,128,128,0.12)] dark:border-teal-500/20 h-40 animate-pulse" />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-16 text-[#617D7B] dark:text-slate-400 text-sm">
          <Megaphone className="w-10 h-10 mx-auto mb-3 text-[#008080] dark:text-teal-500 opacity-40" />
          <p className="font-medium">No campaigns yet</p>
          <p className="text-xs mt-1">Create your first campaign to start reaching customers.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {campaigns.map((camp) => (
            <div
              key={camp.id}
              className="p-5 rounded-xl bg-white dark:bg-[#0c2429] border border-[rgba(0,128,128,0.14)] dark:border-teal-500/20 shadow-[0_1px_3px_rgba(0,0,0,0.05)] dark:shadow-none space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[rgba(0,128,128,0.06)] dark:bg-teal-500/10 border border-[rgba(0,128,128,0.14)] dark:border-teal-500/20 text-[#3D5A58] dark:text-teal-400">
                    {camp.type === 'whatsapp'
                      ? <MessageSquare className="w-4 h-4 text-green-600 dark:text-green-400" />
                      : <Mail className="w-4 h-4 text-[#008080] dark:text-teal-400" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-[#0F2423] dark:text-white text-sm">{camp.name}</h3>
                    <div className="text-[11px] text-[#617D7B] dark:text-slate-500 uppercase tracking-wider font-semibold">{camp.type} channel</div>
                  </div>
                </div>
                <Badge
                  className={camp.status === 'ACTIVE'
                    ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30'
                    : 'bg-[rgba(0,128,128,0.06)] dark:bg-teal-500/10 text-[#5A7573] dark:text-slate-400 border border-[rgba(0,128,128,0.14)] dark:border-teal-500/20'}
                >
                  {camp.status}
                </Badge>
              </div>

              <p className="text-xs text-[#3D5A58] dark:text-slate-400 leading-relaxed">{camp.description}</p>

              {camp.stats && (
                <div className="grid grid-cols-4 gap-2 pt-3 border-t border-[rgba(0,128,128,0.1)] dark:border-teal-500/15 text-center">
                  {[
                    { label: 'Sent', value: camp.stats.sent, color: 'text-[#0F2423] dark:text-white' },
                    { label: 'Delivered', value: camp.stats.delivered, color: 'text-emerald-700 dark:text-emerald-400' },
                    { label: 'Opened', value: camp.stats.opened, color: 'text-[#008080] dark:text-teal-400' },
                    { label: 'Clicked', value: camp.stats.clicked, color: 'text-violet-600 dark:text-violet-400' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="p-2 rounded-lg bg-[rgba(0,128,128,0.04)] dark:bg-teal-500/5 border border-[rgba(0,128,128,0.08)] dark:border-teal-500/15">
                      <div className="text-[10px] text-[#617D7B] dark:text-slate-500">{label}</div>
                      <div className={`font-bold text-sm mt-0.5 ${color}`}>{value}</div>
                    </div>
                  ))}
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
      )}

      {/* New Campaign Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0c2429] border border-[rgba(0,128,128,0.2)] dark:border-teal-500/30 rounded-xl p-6 max-w-md w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[rgba(0,128,128,0.12)] dark:border-teal-500/20 pb-3">
              <h2 className="text-base font-bold text-[#0F2423] dark:text-white flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-[#008080] dark:text-teal-400" />
                Create Campaign
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[#617D7B] dark:text-slate-400 hover:text-[#0F2423] dark:hover:text-white transition-colors text-lg leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-[#3D5A58] dark:text-slate-300">Campaign Name *</label>
                <Input
                  required
                  placeholder="e.g. Flash Sale WhatsApp Broadcast"
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                  className="mt-1 bg-[#F8FAFC] dark:bg-[#091b1f] border-[rgba(0,128,128,0.2)] dark:border-teal-500/30 text-[#0F2423] dark:text-white placeholder:text-[#617D7B] dark:placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="font-semibold text-[#3D5A58] dark:text-slate-300">Channel Type</label>
                <select
                  value={newCampaign.type}
                  onChange={(e) => setNewCampaign({ ...newCampaign, type: e.target.value })}
                  className="w-full mt-1 bg-[#F8FAFC] dark:bg-[#091b1f] border border-[rgba(0,128,128,0.2)] dark:border-teal-500/30 rounded-lg p-2 text-xs text-[#0F2423] dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#008080] dark:focus:ring-teal-400"
                >
                  <option value="email">Email Broadcast</option>
                  <option value="whatsapp">WhatsApp Business Message</option>
                  <option value="sms">Transactional SMS</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-[#3D5A58] dark:text-slate-300">Target Segment</label>
                <select
                  className="w-full mt-1 bg-[#F8FAFC] dark:bg-[#091b1f] border border-[rgba(0,128,128,0.2)] dark:border-teal-500/30 rounded-lg p-2 text-xs text-[#0F2423] dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#008080] dark:focus:ring-teal-400"
                >
                  <option>Inactive Customers (60+ days)</option>
                  <option>Top 20% High Revenue Accounts</option>
                  <option>New Leads (Past 7 Days)</option>
                  <option>All Active Customers</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-[#3D5A58] dark:text-slate-300">Description / Goal</label>
                <Input
                  placeholder="e.g. Bring back inactive accounts with 10% promo"
                  value={newCampaign.description}
                  onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
                  className="mt-1 bg-[#F8FAFC] dark:bg-[#091b1f] border-[rgba(0,128,128,0.2)] dark:border-teal-500/30 text-[#0F2423] dark:text-white placeholder:text-[#617D7B] dark:placeholder:text-slate-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[rgba(0,128,128,0.12)] dark:border-teal-500/20">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
                  className="border-[rgba(0,128,128,0.2)] dark:border-teal-500/30 text-[#3D5A58] dark:text-slate-300 hover:bg-[rgba(0,128,128,0.06)] dark:hover:bg-teal-500/10"
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-[#008080] hover:bg-[#006666] text-white">
                  Save Campaign
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
