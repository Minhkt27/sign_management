import { apiClient } from './apiClient';
import { MaintenanceTicket, User } from '../shared/types';
import { PagedResponse } from './assetService';

export interface CreateTicketParams {
  assetId: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  source?: 'MANUAL' | 'QR_SCAN';
}

export const ticketService = {
  getTickets: async (filters?: { assigneeId?: number; assetId?: string }, page = 0, size = 20): Promise<PagedResponse<MaintenanceTicket>> => {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('size', String(size));
    if (filters?.assigneeId !== undefined) params.append('assigneeId', String(filters.assigneeId));
    if (filters?.assetId) params.append('assetId', filters.assetId);
    const response = await apiClient.get<PagedResponse<MaintenanceTicket>>(`/tickets?${params.toString()}`);
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
    imageAfter?: string,
    rejectionNote?: string
  ): Promise<MaintenanceTicket> => {
    const response = await apiClient.put<MaintenanceTicket>(`/tickets/${id}/status`, {
      status,
      imageBefore,
      imageAfter,
      rejectionNote,
    });
    return response.data;
  },

  takeTicket: async (id: number): Promise<MaintenanceTicket> => {
    const response = await apiClient.put<MaintenanceTicket>(`/tickets/${id}/take`);
    return response.data;
  },

  getTechnicians: async (): Promise<User[]> => {
    const response = await apiClient.get<User[]>('/users/technicians');
    return response.data;
  },
};
