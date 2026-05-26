import { apiClient } from './apiClient';
import { MaintenanceTicket, User } from '../shared/types';
import { PagedResponse } from './assetService';

export interface CreateTicketParams {
  assetId: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  source?: 'MANUAL' | 'QR_SCAN';
}

export interface TicketSummary {
  OPEN: number;
  IN_PROGRESS: number;
  RESOLVED: number;
  CLOSED: number;
  total: number;
}

export const ticketService = {
  getTickets: async (
    filters?: { assigneeId?: number; assetId?: string; status?: string; priority?: string },
    page = 0,
    size = 10
  ): Promise<PagedResponse<MaintenanceTicket>> => {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('size', String(size));
    if (filters?.assigneeId !== undefined) params.append('assigneeId', String(filters.assigneeId));
    if (filters?.assetId) params.append('assetId', filters.assetId);
    if (filters?.status && filters.status !== 'ALL') params.append('status', filters.status);
    if (filters?.priority && filters.priority !== 'ALL') params.append('priority', filters.priority);
    const response = await apiClient.get<PagedResponse<MaintenanceTicket>>(`/tickets?${params.toString()}`);
    return response.data;
  },

  getTicketsSummary: async (): Promise<TicketSummary> => {
    const response = await apiClient.get<Record<string, number>>('/tickets/summary');
    const data = response.data;
    return {
      OPEN: data.OPEN ?? 0,
      IN_PROGRESS: data.IN_PROGRESS ?? 0,
      RESOLVED: data.RESOLVED ?? 0,
      CLOSED: data.CLOSED ?? 0,
      total: Object.values(data).reduce((a, b) => a + b, 0),
    };
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
