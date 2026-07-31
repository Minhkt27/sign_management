import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil } from 'lucide-react';
import { Hospital } from '@/shared/types';

export interface HospitalFormValues {
  name: string;
  shortCode: string;
  address: string;
  phone: string;
  email: string;
  latitude: number | null;
  longitude: number | null;
  gpsRadiusM: number;
  active: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: Hospital | null;
  onSubmit: (data: HospitalFormValues) => void;
  isPending: boolean;
}

const DEFAULT_RADIUS_M = 300;

export function HospitalFormDialog({ open, onOpenChange, editingItem, onSubmit, isPending }: Props) {
  const [name, setName] = useState('');
  const [shortCode, setShortCode] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [gpsRadiusM, setGpsRadiusM] = useState(String(DEFAULT_RADIUS_M));
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(editingItem?.name ?? '');
      setShortCode(editingItem?.shortCode ?? '');
      setAddress(editingItem?.address ?? '');
      setPhone(editingItem?.phone ?? '');
      setEmail(editingItem?.email ?? '');
      setLatitude(editingItem?.latitude != null ? String(editingItem.latitude) : '');
      setLongitude(editingItem?.longitude != null ? String(editingItem.longitude) : '');
      setGpsRadiusM(editingItem ? String(editingItem.gpsRadiusM) : String(DEFAULT_RADIUS_M));
      setActive(editingItem?.active ?? true);
    }
  }, [open, editingItem]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !shortCode) return;
    onSubmit({
      name,
      shortCode,
      address,
      phone,
      email,
      latitude: latitude.trim() === '' ? null : Number(latitude),
      longitude: longitude.trim() === '' ? null : Number(longitude),
      gpsRadiusM: gpsRadiusM.trim() === '' ? DEFAULT_RADIUS_M : Number(gpsRadiusM),
      active,
    });
  };

  const isEdit = !!editingItem;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] bg-white rounded-2xl border-slate-100 p-0 overflow-hidden shadow-2xl">
        <form onSubmit={handleSubmit}>
          <div className="bg-slate-50/80 backdrop-blur px-6 py-5 border-b border-slate-100">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-slate-800 flex items-center space-x-2">
                {isEdit ? <Pencil className="text-amber-600" size={20} /> : <Plus className="text-blue-600" size={20} />}
                <span>{isEdit ? 'Sửa bệnh viện' : 'Thêm bệnh viện mới'}</span>
              </DialogTitle>
              <DialogDescription className="text-slate-500 text-sm mt-1">
                {isEdit ? 'Cập nhật thông tin bệnh viện.' : 'Điền thông tin để thêm bệnh viện vào hệ thống.'}
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="px-6 py-5 space-y-4 text-left max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Tên bệnh viện *</label>
                <Input required placeholder="Ví dụ: Bệnh viện Đa khoa..." value={name} onChange={(e) => setName(e.target.value)} className="border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Mã viện *</label>
                <Input required placeholder="Ví dụ: bvdk-a" value={shortCode} onChange={(e) => setShortCode(e.target.value)} className="border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Số điện thoại</label>
                <Input placeholder="0xxxxxxxxx" value={phone} onChange={(e) => setPhone(e.target.value)} className="border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Địa chỉ</label>
              <Input placeholder="Địa chỉ đầy đủ..." value={address} onChange={(e) => setAddress(e.target.value)} className="border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Email liên hệ</label>
              <Input type="email" placeholder="contact@benhvien.vn" value={email} onChange={(e) => setEmail(e.target.value)} className="border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg" />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Latitude</label>
                <Input type="number" step="any" placeholder="21.0278" value={latitude} onChange={(e) => setLatitude(e.target.value)} className="border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Longitude</label>
                <Input type="number" step="any" placeholder="105.8342" value={longitude} onChange={(e) => setLongitude(e.target.value)} className="border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Bán kính GPS (m)</label>
                <Input type="number" min="0" step="1" value={gpsRadiusM} onChange={(e) => setGpsRadiusM(e.target.value)} className="border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg" />
              </div>
            </div>
            <p className="text-xs text-slate-400 -mt-2">
              Latitude/Longitude dùng để tự động nhận diện bệnh viện qua GPS khi bệnh nhân mở app chưa quét QR. Để trống nếu chưa có tọa độ.
            </p>

            <label className="flex items-center gap-2.5 pt-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-semibold text-slate-700">Đang hoạt động</span>
            </label>
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
