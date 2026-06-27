import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { signTypeService } from '@/services/signTypeService';
import { SignType } from '@/shared/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Tags, FileText, HelpCircle } from 'lucide-react';
import { StatCard } from '@/shared/components/StatCard';
import { Pagination } from '@/shared/components/Pagination';
import { SignTypeTable } from '../components/SignTypeTable';
import { SignTypeFormDialog } from '../components/SignTypeFormDialog';
import { getApiError } from '@/shared/helpers/apiError';

const PAGE_SIZE = 10;

export default function SignTypeListPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get('page') ?? '0');
  const setPage = (p: number) => setSearchParams(
    prev => { const n = new URLSearchParams(prev); if (p === 0) n.delete('page'); else n.set('page', String(p)); return n; },
    { replace: true },
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SignType | null>(null);

  const { data: pagedData } = useQuery({
    queryKey: ['signTypes', page, search],
    queryFn: () => signTypeService.getPage(page, PAGE_SIZE, search),
  });

  const signTypes = pagedData?.content ?? [];
  const totalPages = pagedData?.totalPages ?? 0;
  const totalElements = pagedData?.totalElements ?? 0;

  const createMutation = useMutation({
    mutationFn: signTypeService.createSignType,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['signTypes'] }); setIsDialogOpen(false); },
    onError: (e: unknown) => alert(getApiError(e, 'Có lỗi xảy ra khi tạo loại biển.')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<SignType> }) => signTypeService.updateSignType(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['signTypes'] }); setIsDialogOpen(false); },
    onError: (e: unknown) => alert(getApiError(e, 'Có lỗi xảy ra khi cập nhật loại biển.')),
  });

  const deleteMutation = useMutation({
    mutationFn: signTypeService.deleteSignType,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['signTypes'] }),
    onError: (e: unknown) => alert(getApiError(e, 'Có lỗi xảy ra khi xóa loại biển.')),
  });

  const handleOpenCreate = () => { setEditingItem(null); setIsDialogOpen(true); };
  const handleOpenEdit = (st: SignType) => { setEditingItem(st); setIsDialogOpen(true); };
  const handleDelete = (st: SignType) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa loại biển "${st.name}"?`)) deleteMutation.mutate(st.id);
  };
  const handleSubmit = (data: { code: string; name: string; description: string }) => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const withDescCount = signTypes.filter(st => !!st.description).length;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Tổng loại biển" value={totalElements} icon={<Tags size={24} />} iconBg="bg-blue-50 text-blue-600" />
        <StatCard label="Có mô tả" value={withDescCount} valueColor="text-emerald-600" icon={<FileText size={24} />} iconBg="bg-emerald-50 text-emerald-600" />
        <StatCard label="Chưa có mô tả" value={signTypes.length - withDescCount} valueColor="text-slate-400" icon={<HelpCircle size={24} />} iconBg="bg-slate-100 text-slate-400" />
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
            <Input
              placeholder="Tìm mã hoặc tên loại biển..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="pl-11 pr-4 py-3 text-base text-slate-800 placeholder:text-slate-400 border-slate-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <Button onClick={handleOpenCreate} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 flex items-center space-x-2 font-semibold hover:shadow-lg hover:shadow-blue-500/20 active:scale-[0.98]">
            <Plus size={18} /><span>Thêm Loại biển</span>
          </Button>
        </div>

        <SignTypeTable signTypes={signTypes} page={page} pageSize={PAGE_SIZE} search={search} onEdit={handleOpenEdit} onDelete={handleDelete} />

        <Pagination page={page} totalPages={totalPages} totalCount={totalElements} pageSize={PAGE_SIZE} onPageChange={setPage} itemLabel="loại biển" />
      </div>

      <SignTypeFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        editingItem={editingItem}
        onSubmit={handleSubmit}
        isPending={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}
