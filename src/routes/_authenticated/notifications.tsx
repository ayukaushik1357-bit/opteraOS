import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Trash2,
  Check,
  RefreshCw,
  Layers,
  DollarSign,
  UserCheck,
  CheckCheck,
  Sparkles,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { notificationsApi } from '@/lib/api';
import { useWorkspace } from '@/components/app/AppShell';
import { shortDate } from '@/lib/format';

export const Route = createFileRoute('/_authenticated/notifications')({
  component: NotificationsPage,
});

function NotificationsPage() {
  const { current } = useWorkspace();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | 'URGENT'>('ALL');

  // Fetch notifications
  const { data: notificationsData, isLoading, refetch } = useQuery({
    queryKey: ['notifications-page', current?.id, filter],
    queryFn: async () => {
      if (!current?.id) return { rows: [], total: 0 };
      const params: any = { pageSize: 50 };
      if (filter === 'UNREAD') params.unreadOnly = 'true';
      if (filter === 'URGENT') params.priority = 'URGENT';
      const res = await notificationsApi.list(current.id, params);
      if (Array.isArray(res)) return { rows: res, total: res.length };
      if (res?.data && Array.isArray(res.data)) return { rows: res.data, total: res.data.length };
      return res || { rows: [], total: 0 };
    },
    enabled: !!current?.id,
  });

  // Mark Read Mutation
  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id, current?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-page', current?.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications', current?.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count', current?.id] });
    },
  });

  // Mark All Read Mutation
  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(current?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-page', current?.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications', current?.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count', current?.id] });
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.delete(id, current?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-page', current?.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications', current?.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count', current?.id] });
    },
  });

  const getIcon = (n: any) => {
    if (n.priority === 'URGENT' || n.priority === 'HIGH') {
      return <ShieldAlert className="w-5 h-5 text-red-600" />;
    }
    switch (n.type) {
      case 'PAYMENT_RECEIVED':
      case 'PAYMENT_FAILED':
        return <DollarSign className="w-5 h-5 text-green-600" />;
      case 'INVOICE_OVERDUE':
        return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      case 'AI_ACTION_REQUIRED':
        return <Sparkles className="w-5 h-5 text-blue-600" />;
      case 'TASK_ASSIGNED':
        return <CheckCircle2 className="w-5 h-5 text-cyan-600" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const notifications = Array.isArray(notificationsData)
    ? notificationsData
    : (notificationsData?.rows || []);

  const unreadCount = notifications.filter((n: any) => !n.isRead && !n.read).length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5EAF1] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                Notifications Center
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Real-time operational alerts, tasks, AI insights, and system activities.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              variant="outline"
              size="sm"
              className="text-xs gap-1.5 h-8 font-medium"
            >
              <CheckCheck className="w-3.5 h-3.5" /> Mark All as Read
            </Button>
          )}
          <Button
            onClick={() => refetch()}
            variant="ghost"
            size="sm"
            className="text-gray-500 hover:text-gray-900 h-8 w-8 p-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 border-b border-[#E5EAF1] pb-3 text-xs">
        <button
          onClick={() => setFilter('ALL')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
            filter === 'ALL'
              ? 'bg-blue-50 text-blue-700 border border-blue-200 font-semibold'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          All Notifications ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('UNREAD')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
            filter === 'UNREAD'
              ? 'bg-blue-50 text-blue-700 border border-blue-200 font-semibold'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          Unread Only
        </button>
        <button
          onClick={() => setFilter('URGENT')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
            filter === 'URGENT'
              ? 'bg-blue-50 text-blue-700 border border-blue-200 font-semibold'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          High Priority
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-500 rounded-xl border border-[#E5EAF1] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
            No notifications matching this filter. You're all caught up!
          </div>
        ) : (
          notifications.map((n: any) => {
            const isRead = n.isRead ?? n.read ?? false;
            return (
              <div
                key={n.id}
                className={`p-4 rounded-xl border transition-all flex items-start justify-between gap-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)] ${
                  !isRead
                    ? 'bg-blue-50/40 border-blue-200'
                    : 'bg-white border-[#E5EAF1] hover:bg-[#F8FAFC]'
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="p-2 rounded-lg bg-[#F8FAFC] border border-[#E5EAF1] shrink-0 mt-0.5">
                    {getIcon(n)}
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900 truncate">{n.title}</span>
                      {!isRead && (
                        <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0" />
                      )}
                      {n.priority && n.priority !== 'NORMAL' && (
                        <Badge
                          variant="outline"
                          className="text-[9px] uppercase font-mono border-red-200 text-red-700 bg-red-50"
                        >
                          {n.priority}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">{n.message}</p>
                    <span className="text-[10px] text-gray-400 font-mono block">
                      {shortDate(n.createdAt || n.created_at)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {!isRead && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markReadMutation.mutate(n.id)}
                      className="h-7 w-7 p-0 text-gray-400 hover:text-gray-700"
                      title="Mark as read"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMutation.mutate(n.id)}
                    className="h-7 w-7 p-0 text-gray-400 hover:text-red-600"
                    title="Dismiss"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
