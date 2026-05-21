import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { signTypeService } from '@/services/signTypeService';
import { SignType } from '@/shared/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Tags, Search, FileText, HelpCircle } from 'lucide-react';

export default function SignTypeListPage() {
  const queryClient = useQueryClient();

  // Search
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 15;

  // Form State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');

  // Queries
  const { data: signTypes = [], isLoading } = useQuery<SignType[]>({
    queryKey: ['signTypes'],
    queryFn: signTypeService.getAllSignTypes,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: signTypeService.createSignType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signTypes'] });
      closeDialog();
    },
    onError: (error: any) => {
      alert(error?.response?.data?.message || 'Có lỗi xảy ra khi tạo loại biển.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<SignType> }) =>
      signTypeService.updateSignType(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signTypes'] });
      closeDialog();
    },
    onError: (error: any) => {
      alert(error?.response?.data?.message || 'Có lỗi xảy ra khi cập nhật loại biển.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: signTypeService.deleteSignType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signTypes'] });
    },
    onError: (error: any) => {
      alert(error?.response?.data?.message || 'Có lỗi xảy ra khi xóa loại biển.');
    },
  });

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingId(null);
    setFormCode('');
    setFormName('');
    setFormDescription('');
  };

  const openCreateDialog = () => {
    setEditingId(null);
    setFormCode('');
    setFormName('');
    setFormDescription('');
    setIsDialogOpen(true);
  };

  const openEditDialog = (st: SignType) => {
    setEditingId(st.id);
    setFormCode(st.code);
    setFormName(st.name);
    setFormDescription(st.description || '');
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCode || !formName) return;

    const data = { code: formCode, name: formName, description: formDescription };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (st: SignType) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa loại biển "${st.name}"?`)) {
      deleteMutation.mutate(st.id);
    }
  };

  if (isLoading) {
    return <div className="text-center py-12 text-slate-500 font-medium">Đang tải danh sách loại biển...</div>;
  }

  const filtered = signTypes.filter(st => {
    const term = search.toLowerCase();
    return (
      st.code.toLowerCase().includes(term) ||
      st.name.toLowerCase().includes(term) ||
      (st.description && st.description.toLowerCase().includes(term))
    );
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pagedSignTypes = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const withDescCount = signTypes.filter(st => !!st.description).length;
  const withoutDescCount = signTypes.length - withDescCount;

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500">Tổng loại biển</p>
            <h3 className="text-3xl font-extrabold text-slate-800 mt-1">{signTypes.length}</h3>
          </div>
          <div className="bg-blue-50 text-blue-600 p-3.5 rounded-xl">
            <Tags size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500">Có mô tả</p>
            <h3 className="text-3xl font-extrabold text-emerald-600 mt-1">{withDescCount}</h3>
          </div>
          <div className="bg-emerald-50 text-emerald-600 p-3.5 rounded-xl">
            <FileText size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500">Chưa có mô tả</p>
            <h3 className="text-3xl font-extrabold text-slate-400 mt-1">{withoutDescCount}</h3>
          </div>
          <div className="bg-slate-100 text-slate-400 p-3.5 rounded-xl">
            <HelpCircle size={24} />
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-3 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <Input
                placeholder="Tìm mã hoặc tên loại biển..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="pl-10 pr-4 py-2 border-slate-200 hover:border-slate-350 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <Button
            onClick={openCreateDialog}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 flex items-center space-x-2 font-semibold transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/20 active:scale-[0.98]"
          >
            <Plus size={18} />
            <span>Thêm Loại biển</span>
          </Button>
        </div>

        {/* Stats */}
        <div className="flex items-center space-x-2 text-xs text-slate-500 font-medium">
          <Tags size={14} className="text-slate-400" />
          <span>Tổng cộng: <strong className="text-slate-700">{signTypes.length}</strong> loại biển</span>
        </div>

        {/* Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="text-sm font-bold text-slate-700 text-left w-[60px]">#</TableHead>
                <TableHead className="text-sm font-bold text-slate-700 text-left">Mã loại</TableHead>
                <TableHead className="text-sm font-bold text-slate-700 text-left">Tên loại biển</TableHead>
                <TableHead className="text-sm font-bold text-slate-700 text-left">Mô tả</TableHead>
                <TableHead className="text-sm font-bold text-slate-700 text-left w-[120px]">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length > 0 ? (
                pagedSignTypes.map((st, idx) => (
                  <TableRow key={st.id} className="hover:bg-slate-50/50">
                    <TableCell className="text-sm text-slate-400 text-left">{page * PAGE_SIZE + idx + 1}</TableCell>
                    <TableCell className="text-sm text-left">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-semibold text-xs">{st.code}</Badge>
                    </TableCell>
                    <TableCell className="text-sm font-semibold text-slate-800 text-left">{st.name}</TableCell>
                    <TableCell className="text-sm text-slate-500 text-left max-w-[300px] truncate">{st.description || '—'}</TableCell>
                    <TableCell className="text-left">
                      <div className="flex items-center space-x-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(st)}
                          className="hover:bg-amber-50 text-amber-600 p-2 rounded-lg"
                          title="Sửa"
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(st)}
                          className="hover:bg-red-50 text-red-600 p-2 rounded-lg"
                          title="Xóa"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-sm text-slate-400 font-medium">
                    {search ? 'Không tìm thấy loại biển phù hợp.' : 'Chưa có loại biển nào. Hãy tạo loại biển đầu tiên!'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {filtered.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-sm text-slate-500">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} / <strong>{filtered.length}</strong> loại biển
            </span>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
                className="text-sm px-4 py-2 rounded-lg disabled:opacity-40"
              >
                ← Trước
              </Button>
              <span className="text-sm font-semibold text-slate-700 px-2">
                Trang {page + 1} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
                className="text-sm px-4 py-2 rounded-lg disabled:opacity-40"
              >
                Sau →
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[480px] bg-white rounded-2xl border-slate-100 p-0 overflow-hidden shadow-2xl">
          <form onSubmit={handleSubmit}>
            <div className="bg-slate-50/80 backdrop-blur px-6 py-5 border-b border-slate-100">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-slate-800 flex items-center space-x-2">
                  {editingId ? <Pencil className="text-amber-600" size={20} /> : <Plus className="text-blue-600" size={20} />}
                  <span>{editingId ? 'Sửa loại biển' : 'Thêm loại biển mới'}</span>
                </DialogTitle>
                <DialogDescription className="text-slate-500 text-sm mt-1">
                  {editingId ? 'Cập nhật thông tin loại biển.' : 'Điền mã và tên loại biển để thêm vào danh sách.'}
                </DialogDescription>
              </DialogHeader>
            </div>
            <div className="px-6 py-5 space-y-4 text-left">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Mã loại biển *</label>
                <Input
                  required
                  placeholder="Ví dụ: CHI_DAN, PHONG_BAN, CANH_BAO..."
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  className="border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Tên loại biển *</label>
                <Input
                  required
                  placeholder="Ví dụ: Biển chỉ dẫn, Biển phòng ban, Biển cảnh báo..."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Mô tả</label>
                <Input
                  placeholder="Mô tả ngắn gọn..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg"
                />
              </div>
            </div>
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end space-x-3">
              <Button type="button" variant="outline" onClick={closeDialog} className="rounded-xl px-4 py-2 border-slate-250 hover:bg-slate-100">Hủy</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 py-2 font-semibold">
                {editingId ? 'Lưu' : 'Thêm'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
