import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil } from 'lucide-react';
import { SignType } from '@/shared/types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: SignType | null;
  onSubmit: (data: { code: string; name: string; description: string }) => void;
  isPending: boolean;
}

export function SignTypeFormDialog({ open, onOpenChange, editingItem, onSubmit, isPending }: Props) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (open) {
      setCode(editingItem?.code ?? '');
      setName(editingItem?.name ?? '');
      setDescription(editingItem?.description ?? '');
    }
  }, [open, editingItem]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !name) return;
    onSubmit({ code, name, description });
  };

  const isEdit = !!editingItem;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-white rounded-2xl border-slate-100 p-0 overflow-hidden shadow-2xl">
        <form onSubmit={handleSubmit}>
          <div className="bg-slate-50/80 backdrop-blur px-6 py-5 border-b border-slate-100">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-slate-800 flex items-center space-x-2">
                {isEdit ? <Pencil className="text-amber-600" size={20} /> : <Plus className="text-blue-600" size={20} />}
                <span>{isEdit ? 'Sửa loại biển' : 'Thêm loại biển mới'}</span>
              </DialogTitle>
              <DialogDescription className="text-slate-500 text-sm mt-1">
                {isEdit ? 'Cập nhật thông tin loại biển.' : 'Điền mã và tên loại biển để thêm vào danh sách.'}
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="px-6 py-5 space-y-4 text-left">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Mã loại biển *</label>
              <Input required placeholder="Ví dụ: CHI_DAN, PHONG_BAN, CANH_BAO..." value={code} onChange={(e) => setCode(e.target.value)} className="border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Tên loại biển *</label>
              <Input required placeholder="Ví dụ: Biển chỉ dẫn, Biển phòng ban..." value={name} onChange={(e) => setName(e.target.value)} className="border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Mô tả</label>
              <Input placeholder="Mô tả ngắn gọn..." value={description} onChange={(e) => setDescription(e.target.value)} className="border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg" />
            </div>
          </div>
          <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end space-x-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl px-4 py-2 hover:bg-slate-100">Hủy</Button>
            <Button type="submit" disabled={isPending} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 py-2 font-semibold">
              {isEdit ? 'Lưu' : 'Thêm'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
