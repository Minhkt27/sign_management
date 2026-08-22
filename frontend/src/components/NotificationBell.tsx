import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, Ticket, AlertCircle } from 'lucide-react';
import { notificationService, Notification } from '@/services/notificationService';
import { useNavigate } from 'react-router-dom';
import { authStore, getUiModeFromToken } from '@/app/store/authStore';

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return `${diffInSeconds} giây trước`;
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} phút trước`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} giờ trước`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays} ngày trước`;
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) return `${diffInMonths} tháng trước`;
  
  return `${Math.floor(diffInMonths / 12)} năm trước`;
}

export default function NotificationBell({ light }: { light?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Poll for notifications every 30 seconds
  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['notifications', 'my'],
    queryFn: () => notificationService.getMyNotifications(0, 10),
    refetchInterval: 30000,
  });

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationService.getUnreadCount(),
    refetchInterval: 30000,
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id: number) => notificationService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
    setIsOpen(false);
    if (notification.referenceId) {
      const token = authStore.getToken();
      const uiMode = getUiModeFromToken(token);
      
      if (uiMode === 'TECHNICIAN') {
        navigate(`/tech/tasks/${notification.referenceId}`);
      } else {
        navigate(`/admin/tickets/${notification.referenceId}`);
      }
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'NEW_TICKET':
        return <AlertCircle className="text-orange-500" size={18} />;
      case 'TICKET_RESOLVED':
        return <Check className="text-green-500" size={18} />;
      default:
        return <Ticket className="text-blue-500" size={18} />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-full transition-colors focus:outline-none ${
          light ? 'text-white hover:bg-white/20' : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50'
        }`}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className={`absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 border-2 rounded-full animate-pulse ${light ? 'border-blue-700' : 'border-white'}`} />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-200 z-50 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <h3 className="font-semibold text-slate-800 text-sm">Thông báo</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsReadMutation.mutate()}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Đánh dấu đã đọc tất cả
              </button>
            )}
          </div>

          <div className="max-h-[350px] overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-slate-400 text-sm">Đang tải...</div>
            ) : notificationsData?.content && notificationsData.content.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {notificationsData.content.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full text-left p-4 flex gap-3 hover:bg-slate-50 transition-colors ${
                      !notification.isRead ? 'bg-blue-50/30' : ''
                    }`}
                  >
                    <div className="mt-1 shrink-0 bg-white p-1.5 rounded-full border border-slate-100 shadow-sm">
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!notification.isRead ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1.5 font-medium">
                        {formatRelativeTime(notification.createdAt)}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-2" />
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-sm flex flex-col items-center">
                <Bell size={24} className="mb-2 opacity-20" />
                Không có thông báo nào
              </div>
            )}
          </div>
          
          <div className="p-2 border-t border-slate-100 bg-slate-50 text-center">
             {/* If we had a full notifications page, we could link it here */}
             <span className="text-xs text-slate-400">Chỉ hiển thị 10 thông báo gần nhất</span>
          </div>
        </div>
      )}
    </div>
  );
}
