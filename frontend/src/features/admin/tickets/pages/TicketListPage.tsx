import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ticketService, TicketSummary } from '@/services/ticketService';
import { PagedResponse } from '@/services/assetService';
import { MaintenanceTicket, User } from '@/shared/types';
import { Pagination } from '@/shared/components/Pagination';
import { TicketStatsCards } from '../components/TicketStatsCards';
import { TicketFilters } from '../components/TicketFilters';
import { TicketTable } from '../components/TicketTable';

const PAGE_SIZE = 10;

export default function TicketListPage() {
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState('ALL');
  const [page, setPage] = useState(0);

  const { data: summary } = useQuery<TicketSummary>({
    queryKey: ['tickets-summary'],
    queryFn: ticketService.getTicketsSummary,
    staleTime: 60 * 1000,
  });

  const { data: technicians = [] } = useQuery<User[]>({
    queryKey: ['technicians'],
    queryFn: ticketService.getTechnicians,
    staleTime: 5 * 60 * 1000,
  });

  const { data: ticketData, isLoading } = useQuery<PagedResponse<MaintenanceTicket>>({
    queryKey: ['tickets', page, statusFilter, priorityFilter, assigneeFilter],
    queryFn: () => ticketService.getTickets({
      status: statusFilter,
      priority: priorityFilter,
      assigneeId: assigneeFilter !== 'ALL' ? Number(assigneeFilter) : undefined,
    }, page, PAGE_SIZE),
  });

  const tickets = ticketData?.content ?? [];
  const totalPages = ticketData?.totalPages ?? 1;
  const totalElements = ticketData?.totalElements ?? 0;

  const handleFilterChange = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setPage(0);
  };

  return (
    <div className="space-y-8 text-left">
      <TicketStatsCards
        total={summary?.total ?? 0}
        open={summary?.OPEN ?? 0}
        inProgress={summary?.IN_PROGRESS ?? 0}
        resolved={summary?.RESOLVED ?? 0}
      />

      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h2 className="text-xl font-bold text-slate-800">Danh sách Phiếu Bảo trì</h2>
          <TicketFilters
            statusFilter={statusFilter}
            onStatusChange={handleFilterChange(setStatusFilter)}
            priorityFilter={priorityFilter}
            onPriorityChange={handleFilterChange(setPriorityFilter)}
            assigneeFilter={assigneeFilter}
            onAssigneeChange={handleFilterChange(setAssigneeFilter)}
            technicians={technicians}
          />
        </div>

        <TicketTable tickets={tickets} isLoading={isLoading} page={page} pageSize={PAGE_SIZE} />

        <Pagination
          page={page}
          totalPages={totalPages}
          totalCount={totalElements}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          itemLabel="phiếu"
        />
      </div>
    </div>
  );
}
