import { apiClient } from './apiClient';
import { MaintenanceTicket, User } from '../shared/types';

export interface CreateTicketParams {
  assetId: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export const ticketService = {
  getTickets: async (filters?: { assigneeId?: number; assetId?: string }): Promise<MaintenanceTicket[]> => {
    const params = new URLSearchParams();
    if (filters?.assigneeId !== undefined) {
      params.append('assigneeId', String(filters.assigneeId));
    }
    if (filters?.assetId) {
      params.append('assetId', filters.assetId);
    }
    const response = await apiClient.get<MaintenanceTicket[]>(`/tickets?${params.toString()}`);
    return response.data;
  },

  getTicketById: async (id: number): Promise<MaintenanceTicket> => {
    const response = await apiClient.get<MaintenanceTicket>(`/tickets/${id}`);
    return response.data;
  },

  createTicket: async (params: CreateTicketParams): Promise<MaintenanceTicket> => {
    const response = await apiClient.post<MaintenanceTicket>('/tickets', params);
    return response.data;
  },

  assignTicket: async (id: number, assigneeId: number): Promise<MaintenanceTicket> => {
    const response = await apiClient.put<MaintenanceTicket>(`/tickets/${id}/assign`, { assigneeId });
    return response.data;
  },

  updateTicketStatus: async (
    id: number,
    status: MaintenanceTicket['ticketStatus'],
    imageBefore?: string,
    imageAfter?: string
  ): Promise<MaintenanceTicket> => {
    const response = await apiClient.put<MaintenanceTicket>(`/tickets/${id}/status`, {
      status,
      imageBefore,
      imageAfter,
    });
    return response.data;
  },

  getTechnicians: async (): Promise<User[]> => {
    const response = await apiClient.get<User[]>('/users/technicians');
    return response.data;
  },
};
