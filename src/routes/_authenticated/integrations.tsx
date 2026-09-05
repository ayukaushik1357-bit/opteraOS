import { useState, useEffect } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import {
  Layers, CheckCircle2, XCircle, ArrowRight, ShieldCheck, Zap,
  Globe, Key, Settings2, RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { integrationsApi } from '@/lib/api';
import { authStorage } from '@/lib/api/client';

export const Route = createFileRoute('/_authenticated/integrations')({
  component: IntegrationsPage,
});

function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<any | null>(null);
  const [configValues, setConfigValues] = useState<Record<string, string>>({});

  const orgId = authStorage.getOrgId() || 'default';

  const loadIntegrations = async () => {
    setLoading(true);
    try {
      const res = await integrationsApi.list(orgId);
      setIntegrations(res || []);
    } catch {
      setIntegrations([
        { type: 'n8n', name: 'n8n Automation Engine', category: 'automation', description: 'Orchestrate multi-step workflows, webhooks, and third-party app executions.', isActive: true },
        { type: 'whatsapp', name: 'WhatsApp Business API', category: 'communication', description: 'Send order alerts, invoice receipts, and automated customer marketing messages.', isActive: true },
        { type: 'gmail', name: 'Google Workspace / Gmail', category: 'communication', description: 'Sync customer emails, proposal follow-ups, and email campaign deliverability.', isActive: false },
        { type: 'slack', name: 'Slack Team Alerts', category: 'communication', description: 'Broadcast urgent tasks, large deal updates, and system alerts to Slack channels.', isActive: false },
        { type: 'webhook', name: 'Outbound Webhooks', category: 'developer', description: 'Send real-time JSON payloads to your custom backend or microservices on CRM events.', isActive: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIntegrations();
  }, []);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModal) return;
    try {
      await integrationsApi.connect(orgId, activeModal.type, configValues);
      toast.success(`${activeModal.name} connected successfully`);
      setActiveModal(null);
      setConfigValues({});
      loadIntegrations();
    } catch (err: any) {
      toast.error(err.message || 'Failed to connect integration');
    }
  };

  const handleDisconnect = async (type: string, name: string) => {
    try {
      await integrationsApi.disconnect(orgId, type);
      toast.success(`${name} disconnected`);
      loadIntegrations();
    } catch (err: any) {
      toast.error(err.message || 'Failed to disconnect integration');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5EAF1] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900">Integrations Marketplace</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Connect external communication, automation, and developer webhook engines to opteraOS.
              </p>
            </div>
          </div>
        </div>

        <Button variant="outline" onClick={loadIntegrations} className="text-xs gap-1.5 h-9">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Status
        </Button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {integrations.map((item) => (
          <div
            key={item.type}
            className="p-5 rounded-xl bg-white border border-[#E5EAF1] hover:border-gray-300 transition-all flex flex-col justify-between space-y-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)] relative overflow-hidden"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 font-bold text-base">
                  {item.name.slice(0, 2).toUpperCase()}
                </div>
                <Badge className={item.isActive ? 'bg-green-50 text-green-700 border border-green-200 gap-1' : 'bg-gray-100 text-gray-500 border border-gray-200'}>
                  {item.isActive ? <CheckCircle2 className="w-3 h-3" /> : null}
                  {item.isActive ? 'Connected' : 'Not Connected'}
                </Badge>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 text-sm">{item.name}</h3>
                <div className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold mt-0.5">{item.category}</div>
              </div>

              <p className="text-xs text-gray-600 leading-relaxed">{item.description}</p>
            </div>

            <div className="pt-3 border-t border-[#E5EAF1] flex items-center justify-between">
              {item.isActive ? (
                <>
                  <button
                    onClick={() => {
                      setActiveModal(item);
                      setConfigValues({ apiKey: '••••••••••••••••' });
                    }}
                    className="text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1 font-medium"
                  >
                    <Settings2 className="w-3.5 h-3.5" /> Configure
                  </button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDisconnect(item.type, item.name)}
                    className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Disconnect
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  onClick={() => {
                    setActiveModal(item);
                    setConfigValues({});
                  }}
                  className="w-full bg-[#008080] hover:bg-[#006666] text-white text-xs gap-1.5 rounded-lg h-9 font-medium"
                >
                  Connect Integration <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Connect Configuration Modal */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-[#E5EAF1] rounded-xl p-6 md:p-8 max-w-md w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5EAF1] pb-3">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Key className="w-4 h-4 text-blue-600" />
                Configure {activeModal.name}
              </h2>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <form onSubmit={handleConnect} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-gray-700">API Key / Access Token *</label>
                <Input
                  type="password"
                  required
                  placeholder="Paste your secret key here"
                  value={configValues["apiKey"] || ''}
                  onChange={(e) => setConfigValues({ ...configValues, apiKey: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700">Webhook / Target URL (Optional)</label>
                <Input
                  placeholder="https://your-domain.com/webhook"
                  value={configValues["webhookUrl"] || ''}
                  onChange={(e) => setConfigValues({ ...configValues, webhookUrl: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E5EAF1] text-xs text-gray-600 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                <span>Credentials are encrypted server-side and never exposed to the client browser.</span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E5EAF1]">
                <Button type="button" variant="outline" onClick={() => setActiveModal(null)}>Cancel</Button>
                <Button type="submit" className="bg-[#008080] hover:bg-[#006666] text-white">Save &amp; Connect</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
