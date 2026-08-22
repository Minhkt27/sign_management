import { apiClient } from './apiClient';
import { PagedResponse } from './assetService';

export interface Notification {
    id: number;
    userId: number;
    hospitalId: number | null;
    title: string;
    message: string;
    type: string;
    referenceId: number | null;
    isRead: boolean;
    createdAt: string;
    updatedAt: string;
}

export const notificationService = {
    getMyNotifications: async (page = 0, size = 10) => {
        const response = await apiClient.get<PagedResponse<Notification>>(`/notifications?page=${page}&size=${size}`);
        return response.data;
    },

    getUnreadCount: async () => {
        const response = await apiClient.get<number>('/notifications/unread-count');
        return response.data;
    },

    markAsRead: async (id: number) => {
        await apiClient.put(`/notifications/${id}/read`);
    },

    markAllAsRead: async () => {
        await apiClient.put('/notifications/read-all');
    }
};
