import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, Info, AlertTriangle, AlertCircle, Sparkles, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useWorkspace } from "@/components/app/AppShell";
import { notificationsApi } from "@/lib/api";
import { shortDate } from "@/lib/format";
import { Link } from "@tanstack/react-router";

export function NotificationsPopover() {
  const { current } = useWorkspace();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: notificationsData } = useQuery({
    queryKey: ["notifications", current?.id],
    queryFn: async () => {
      if (!current?.id) return { rows: [], total: 0 };
      const res = await notificationsApi.list(current.id, { pageSize: 15 });
      if (Array.isArray(res)) return { rows: res, total: res.length };
      if (res?.data && Array.isArray(res.data)) return { rows: res.data, total: res.data.length };
      return res || { rows: [], total: 0 };
    },
    enabled: !!current?.id,
    refetchInterval: 15000,
  });

  const { data: unreadData } = useQuery({
    queryKey: ["notifications-unread-count", current?.id],
    queryFn: () => (current?.id ? notificationsApi.getUnreadCount(current.id) : { count: 0 }),
    enabled: !!current?.id,
    refetchInterval: 15000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id, current?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", current?.id] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count", current?.id] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(current?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", current?.id] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count", current?.id] });
    },
  });

  const items = Array.isArray(notificationsData)
    ? notificationsData
    : (notificationsData?.rows || []);

  const unreadCount = unreadData?.count ?? items.filter((n: any) => !n.isRead && !n.read).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative h-9 w-9 p-0 rounded-full hover:bg-white/10">
          <Bell className="h-4 w-4 text-[#374151]" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] bg-rose-500 text-white font-bold"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-88 p-0 bg-white border-[#E2E8F0] text-[#1F2937] shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] p-3 bg-[#F8FAFC]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#374151]">
              Notifications
            </span>
            {unreadCount > 0 && (
              <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-[10px]">
                {unreadCount} unread
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllReadMutation.mutate()}
              className="h-6 text-[11px] text-indigo-400 hover:text-indigo-300 hover:bg-white/5 px-2"
            >
              <CheckCheck className="h-3 w-3 mr-1" /> Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
          {items.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#6B7280]">
              No notifications yet. You're all caught up!
            </div>
          ) : (
            items.map((n: any) => {
              const isRead = n.isRead ?? n.read ?? false;
              return (
                <div
                  key={n.id}
                  className={`p-3 text-xs transition-colors hover:bg-[#F8FAFC] ${
                    !isRead ? "bg-indigo-500/[0.07]" : ""
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {n.priority === "URGENT" || n.priority === "HIGH" ? (
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                    ) : n.type === "AI_ACTION_REQUIRED" ? (
                      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
                    ) : (
                      <Info className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-100 truncate">{n.title}</p>
                      <p className="text-[#6B7280] mt-0.5 leading-relaxed text-[11px]">{n.message}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] text-[#6B7280] font-mono">
                          {shortDate(n.createdAt || n.created_at)}
                        </span>
                        {n.actionUrl && (
                          <Link
                            to={n.actionUrl}
                            onClick={() => setOpen(false)}
                            className="text-[10px] text-indigo-400 hover:underline"
                          >
                            View details →
                          </Link>
                        )}
                      </div>
                    </div>
                    {!isRead && (
                      <button
                        onClick={() => markReadMutation.mutate(n.id)}
                        className="text-[#6B7280] hover:text-white p-1 rounded hover:bg-white/10"
                        title="Mark as read"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="border-t border-[#E2E8F0] p-2 text-center bg-[#F8FAFC]">
          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium block py-1"
          >
            View all notifications →
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
