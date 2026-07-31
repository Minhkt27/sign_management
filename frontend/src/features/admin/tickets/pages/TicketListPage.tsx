import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ticketService, TicketSummary } from '@/services/ticketService';
import { PagedResponse } from '@/services/assetService';
import { MaintenanceTicket, User } from '@/shared/types';
import { Pagination } from '@/shared/components/Pagination';
import { useAdminStore } from '@/app/store/adminStore';
import { TicketStatsCards } from '../components/TicketStatsCards';
import { TicketFilters } from '../components/TicketFilters';
import { TicketTable } from '../components/TicketTable';
import { exportService } from '@/services/exportService';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';

const PAGE_SIZE = 10;

export default function TicketListPage() {
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState('ALL');
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get('page') ?? '0');
  const setPage = (p: number) => setSearchParams(
    prev => { const n = new URLSearchParams(prev); if (p === 0) n.delete('page'); else n.set('page', String(p)); return n; },
    { replace: true },
  );
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportService.exportTickets({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        assigneeId: assigneeFilter !== 'ALL' ? Number(assigneeFilter) : undefined,
      });
    } finally {
      setExporting(false);
    }
  };

  const { selectedHospitalId } = useAdminStore();
  const hospitalIdParam = selectedHospitalId === 'ALL' ? undefined : selectedHospitalId;

  const { data: summary } = useQuery<TicketSummary>({
    queryKey: ['tickets-summary', hospitalIdParam],
    queryFn: () => ticketService.getTicketsSummary(hospitalIdParam),
    staleTime: 60 * 1000,
  });

  const { data: technicians = [] } = useQuery<User[]>({
    queryKey: ['technicians'],
    queryFn: ticketService.getTechnicians,
    staleTime: 5 * 60 * 1000,
  });

  const { data: ticketData, isLoading } = useQuery<PagedResponse<MaintenanceTicket>>({
    queryKey: ['tickets', page, statusFilter, priorityFilter, assigneeFilter, hospitalIdParam],
    queryFn: () => ticketService.getTickets({
      status: statusFilter,
      priority: priorityFilter,
      assigneeId: assigneeFilter !== 'ALL' ? Number(assigneeFilter) : undefined,
      hospitalId: hospitalIdParam,
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
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-800">Danh sách Phiếu Bảo trì</h2>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}
              className="flex items-center gap-1.5 text-green-700 border-green-300 hover:bg-green-50">
              <FileDown size={15} />
              {exporting ? 'Đang xuất...' : 'Xuất Excel'}
            </Button>
          </div>
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
