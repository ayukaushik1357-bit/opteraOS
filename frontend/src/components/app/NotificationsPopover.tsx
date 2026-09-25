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
        <Button variant="ghost" size="sm" className="relative h-9 w-9 p-0 rounded-full hover:bg-[rgba(0,128,128,0.08)] dark:hover:bg-teal-500/15">
          <Bell className="h-4 w-4 text-[#374151] dark:text-teal-300" />
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
      <PopoverContent align="end" className="w-88 p-0 bg-white dark:bg-[#091b1f] border border-[rgba(0,128,128,0.2)] dark:border-teal-500/30 text-[#0F2423] dark:text-slate-100 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-[rgba(0,128,128,0.14)] dark:border-teal-500/20 p-3 bg-[#F8FBFA] dark:bg-[#061417]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#0F2423] dark:text-slate-200">
              Notifications
            </span>
            {unreadCount > 0 && (
              <Badge className="bg-[rgba(0,128,128,0.15)] dark:bg-teal-500/25 text-[#008080] dark:text-teal-300 border border-[rgba(0,128,128,0.25)] dark:border-teal-500/40 text-[10px]">
                {unreadCount} unread
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllReadMutation.mutate()}
              className="h-6 text-[11px] text-[#008080] dark:text-teal-400 hover:text-[#006666] dark:hover:text-teal-300 hover:bg-[rgba(0,128,128,0.06)] dark:hover:bg-teal-500/15 px-2 font-medium"
            >
              <CheckCheck className="h-3 w-3 mr-1" /> Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto divide-y divide-[rgba(0,128,128,0.08)] dark:divide-teal-500/15">
          {items.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#5A7573] dark:text-slate-400">
              No notifications yet. You're all caught up!
            </div>
          ) : (
            items.map((n: any) => {
              const isRead = n.isRead ?? n.read ?? false;
              return (
                <div
                  key={n.id}
                  className={`p-3 text-xs transition-colors hover:bg-[rgba(0,128,128,0.05)] dark:hover:bg-teal-500/10 ${
                    !isRead ? "bg-[rgba(0,128,128,0.08)] dark:bg-teal-500/15" : ""
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {n.priority === "URGENT" || n.priority === "HIGH" ? (
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500 dark:text-rose-400" />
                    ) : n.type === "AI_ACTION_REQUIRED" ? (
                      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#008080] dark:text-teal-400" />
                    ) : (
                      <Info className="mt-0.5 h-4 w-4 shrink-0 text-cyan-600 dark:text-cyan-400" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#0F2423] dark:text-white truncate">{n.title}</p>
                      <p className="text-[#3D5A58] dark:text-slate-300 mt-0.5 leading-relaxed text-[11px]">{n.message}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] text-[#617D7B] dark:text-slate-400 font-mono">
                          {shortDate(n.createdAt || n.created_at)}
                        </span>
                        {n.actionUrl && (
                          <Link
                            to={n.actionUrl}
                            onClick={() => setOpen(false)}
                            className="text-[10px] text-[#008080] dark:text-teal-400 hover:underline font-semibold"
                          >
                            View details →
                          </Link>
                        )}
                      </div>
                    </div>
                    {!isRead && (
                      <button
                        onClick={() => markReadMutation.mutate(n.id)}
                        className="text-[#617D7B] dark:text-slate-400 hover:text-[#0F2423] dark:hover:text-white p-1 rounded hover:bg-[rgba(0,128,128,0.1)]"
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
        <div className="border-t border-[rgba(0,128,128,0.14)] dark:border-teal-500/20 p-2 text-center bg-[#F8FBFA] dark:bg-[#061417]">
          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className="text-[11px] text-[#008080] dark:text-teal-400 hover:text-[#006666] dark:hover:text-teal-300 font-semibold block py-1"
          >
            View all notifications →
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
