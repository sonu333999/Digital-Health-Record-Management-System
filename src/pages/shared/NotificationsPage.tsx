import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bell, Check, CheckCheck, Loader2 } from 'lucide-react';
import { AppShell } from '../../components/AppShell.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { api, extractApiError } from '../../services/api.ts';

interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  linkUrl: string | null;
  createdAt: string;
}

function formatDateTime(iso: string) {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatTypeLabel(type: string) {
  return type
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function NotificationsPage() {
  const { t, pushToast } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [markingAll, setMarkingAll] = useState(false);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ notifications: NotificationItem[] }>('/notifications');
      setItems(res.data.notifications);
    } catch (error) {
      pushToast('error', extractApiError(error));
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, isRead: true } : item)));
    } catch (error) {
      pushToast('error', extractApiError(error));
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await api.post('/notifications/read-all');
      setItems((prev) => prev.map((item) => ({ ...item, isRead: true })));
      pushToast('success', 'All notifications marked as read.');
    } catch (error) {
      pushToast('error', extractApiError(error));
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = items.filter((item) => !item.isRead).length;
  const visibleItems = filter === 'unread' ? items.filter((item) => !item.isRead) : items;

  return (
    <AppShell
      breadcrumb="Account / Alerts"
      title={t.navNotifications}
      action={
        unreadCount > 0 ? (
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={markingAll}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0 disabled:opacity-60"
          >
            <CheckCheck className="h-4 w-4 text-[#0D7A6F]" />
            <span>{t.markAllRead}</span>
          </button>
        ) : undefined
      }
    >
      <div className="space-y-5">
        {/* Filter Switch */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${
                filter === 'all'
                  ? 'bg-[#EEF7F6] text-[#0D7A6F]'
                  : 'text-slate-600 hover:text-[#0F1E2E]'
              }`}
            >
              All ({items.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${
                filter === 'unread'
                  ? 'bg-[#EEF7F6] text-[#0D7A6F]'
                  : 'text-slate-600 hover:text-[#0F1E2E]'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Consent updates, provider access alerts, and document processing notices.
          </p>
        </div>

        {/* Notification List */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {loading ? (
            <div className="flex min-h-[240px] items-center justify-center text-sm text-slate-500">
              <Loader2 className="mr-2.5 h-5 w-5 animate-spin text-[#0D7A6F]" />
              <span>{t.loadingText}</span>
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                <Bell className="h-5 w-5" />
              </div>
              <h2 className="mt-3 text-base font-semibold text-[#0F1E2E]">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              </h2>
              <p className="mt-1 max-w-md text-sm text-slate-500">
                {filter === 'unread'
                  ? 'You have reviewed all recent activity notifications.'
                  : 'Activity alerts for consent requests, document OCR, and record access will appear here.'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {visibleItems.map((item) => (
                <li
                  key={item.id}
                  className={`px-6 py-5 transition-colors ${
                    item.isRead ? 'bg-white' : 'bg-[#F4FAF9]'
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="font-semibold text-[#0D7A6F]">
                          {formatTypeLabel(item.type)}
                        </span>
                        <span>·</span>
                        <span className="font-mono tabular-nums">
                          {formatDateTime(item.createdAt)}
                        </span>
                        {!item.isRead && (
                          <>
                            <span>·</span>
                            <span className="font-semibold text-[#0F1E2E]">Unread</span>
                          </>
                        )}
                      </div>
                      <h3
                        className={`mt-1.5 text-sm text-[#0F1E2E] ${
                          item.isRead ? 'font-medium' : 'font-semibold'
                        }`}
                      >
                        {item.title}
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.message}</p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {item.linkUrl && (
                        <Link
                          to={item.linkUrl}
                          onClick={() => {
                            if (!item.isRead) handleMarkRead(item.id);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-[#0F1E2E] hover:bg-slate-50 whitespace-nowrap shrink-0"
                        >
                          <span>Open</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      )}
                      {!item.isRead && (
                        <button
                          type="button"
                          onClick={() => handleMarkRead(item.id)}
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#0D7A6F] hover:bg-[#EEF7F6] whitespace-nowrap shrink-0"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>Mark read</span>
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
