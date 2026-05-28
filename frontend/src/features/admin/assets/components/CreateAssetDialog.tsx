import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Tag, FileText, MapPin, Layers, Maximize2, Building, Image as ImageIcon } from 'lucide-react';
import { Location, SignType } from '@/shared/types';
import { useAssetForm } from '../hooks/useAssetForm';

interface Props {
  locations: Location[];
  signTypes: SignType[];
}

export function CreateAssetDialog({ locations, signTypes }: Props) {
  const [open, setOpen] = useState(false);
  const {
    assetCode, setAssetCode,
    assetName, setAssetName,
    description, setDescription,
    locationDescription, setLocationDescription,
    autoGenerateCode, setAutoGenerateCode,
    selectedBuildingId, setSelectedBuildingId,
    selectedFloorId, setSelectedFloorId,
    selectedRoomId, setSelectedRoomId,
    selectedSubRoomId, setSelectedSubRoomId,
    signTypeId, setSignTypeId,
    material, setMaterial,
    size, setSize,
    supplier, setSupplier,
    setImageFile,
    isSubmitting,
    handleSubmit,
  } = useAssetForm(() => setOpen(false));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 flex items-center space-x-2 font-semibold transition-all duration-205 hover:shadow-lg hover:shadow-blue-500/20 active:scale-[0.98]">
          <Plus size={18} />
          <span>Thêm Biển báo</span>
        </Button>
      } />

      <DialogContent className="bg-white sm:max-w-[620px] rounded-2xl border-slate-100 p-0 overflow-hidden shadow-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="bg-slate-50/80 backdrop-blur px-6 py-5 border-b border-slate-100">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-slate-800 flex items-center space-x-2">
                <Tag className="text-blue-600" size={20} />
                <span>Thêm Biển báo Mới</span>
              </DialogTitle>
              <DialogDescription className="text-slate-500 text-sm mt-1">
                Điền các thông số kỹ thuật và vị trí để khởi tạo biển báo và mã QR tương ứng trong hệ thống.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="px-6 py-5 space-y-5 text-left max-h-[500px] overflow-y-auto">
            {/* Mã định danh */}
            <div className="bg-blue-50/30 border border-blue-100/50 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-blue-800 uppercase tracking-wider flex items-center space-x-1">
                  <Tag size={13} />
                  <span>Mã định danh biển báo</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer select-none text-xs font-semibold text-slate-600">
                  <input
                    type="checkbox"
                    checked={autoGenerateCode}
                    onChange={(e) => setAutoGenerateCode(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span>Tự động sinh mã</span>
                </label>
              </div>
              <Input
                required={!autoGenerateCode}
                disabled={autoGenerateCode}
                placeholder={autoGenerateCode ? 'Hệ thống sẽ tự tạo mã dạng ASSET_XXXXXXXX...' : 'Ví dụ: BB-KKB-01'}
                value={assetCode}
                onChange={(e) => setAssetCode(e.target.value)}
                className={`transition-all duration-200 rounded-lg ${
                  autoGenerateCode
                    ? 'bg-slate-50/85 border-slate-200/60 text-slate-400 cursor-not-allowed'
                    : 'border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white'
                }`}
              />
            </div>

            {/* Thông tin biển báo */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-1.5">
                Thông tin biển báo
              </h4>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center space-x-1">
                  <Tag size={13} className="text-slate-400" />
                  <span>Tên biển báo *</span>
                </label>
                <Input
                  required
                  placeholder="Ví dụ: Biển phòng khám 101, Biển chỉ dẫn sảnh chính..."
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  className="border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center space-x-1">
                    <Layers size={13} className="text-slate-400" />
                    <span>Loại biển</span>
                  </label>
                  <select
                    value={signTypeId || ''}
                    onChange={(e) => setSignTypeId(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full border border-slate-200 bg-white text-slate-700 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 hover:border-slate-300"
                  >
                    <option value="">— Chọn loại biển —</option>
                    {signTypes.map(st => (
                      <option key={st.id} value={st.id}>{st.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center space-x-1">
                    <Layers size={13} className="text-slate-400" />
                    <span>Chất liệu</span>
                  </label>
                  <select
                    value={material}
                    onChange={(e) => setMaterial(e.target.value as 'MICA' | 'INOX' | 'LED' | 'ALU')}
                    className="w-full border border-slate-200 bg-white text-slate-700 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 hover:border-slate-300"
                  >
                    <option value="MICA">MICA</option>
                    <option value="INOX">INOX</option>
                    <option value="LED">LED</option>
                    <option value="ALU">ALU</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center space-x-1">
                  <FileText size={13} className="text-slate-400" />
                  <span>Mô tả biển báo</span>
                </label>
                <Input
                  placeholder="Ví dụ: Biển chỉ dẫn Khoa khám bệnh, Biển số phòng 204..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center space-x-1">
                  <Maximize2 size={13} className="text-slate-400" />
                  <span>Kích thước</span>
                </label>
                <Input
                  required
                  placeholder="Ví dụ: 40x30 cm"
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  className="border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg"
                />
              </div>
            </div>

            {/* Vị trí lắp đặt */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-1.5">
                Vị trí lắp đặt chi tiết
              </h4>

              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-655 flex items-center space-x-1">
                  <MapPin size={13} className="text-slate-400" />
                  <span>Vị trí lắp đặt *</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tòa nhà</span>
                    <select
                      value={selectedBuildingId}
                      onChange={(e) => {
                        const val = e.target.value ? Number(e.target.value) : '';
                        setSelectedBuildingId(val);
                        setSelectedFloorId('');
                        setSelectedRoomId('');
                        setSelectedSubRoomId('');
                      }}
                      className="w-full border border-slate-200 bg-white text-slate-700 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 hover:border-slate-300"
                    >
                      <option value="">— Chọn Tòa nhà —</option>
                      {locations.filter(loc => loc.parentId === null).map(loc => (
                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tầng</span>
                    <select
                      disabled={!selectedBuildingId}
                      value={selectedFloorId}
                      onChange={(e) => {
                        const val = e.target.value ? Number(e.target.value) : '';
                        setSelectedFloorId(val);
                        setSelectedRoomId('');
                        setSelectedSubRoomId('');
                      }}
                      className="w-full border border-slate-200 bg-white text-slate-700 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 hover:border-slate-300 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                    >
                      <option value="">— Chọn Tầng —</option>
                      {locations.filter(loc => loc.parentId === selectedBuildingId).map(loc => (
                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Khoa / Phòng ban</span>
                    <select
                      disabled={!selectedFloorId}
                      value={selectedRoomId}
                      onChange={(e) => {
                        const val = e.target.value ? Number(e.target.value) : '';
                        setSelectedRoomId(val);
                        setSelectedSubRoomId('');
                      }}
                      className="w-full border border-slate-200 bg-white text-slate-700 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 hover:border-slate-300 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                    >
                      <option value="">— Chọn Khoa (tuỳ chọn) —</option>
                      {locations.filter(loc => loc.parentId === selectedFloorId).map(loc => (
                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Phòng cụ thể</span>
                    <select
                      disabled={!selectedRoomId || locations.filter(loc => loc.parentId === selectedRoomId).length === 0}
                      value={selectedSubRoomId}
                      onChange={(e) => setSelectedSubRoomId(e.target.value ? Number(e.target.value) : '')}
                      className="w-full border border-slate-200 bg-white text-slate-700 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 hover:border-slate-300 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                    >
                      <option value="">— Chọn Phòng (nếu có) —</option>
                      {locations.filter(loc => loc.parentId === selectedRoomId).map(loc => (
                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center space-x-1">
                  <Building size={13} className="text-slate-400" />
                  <span>Nhà cung cấp</span>
                </label>
                <Input
                  placeholder="Tên đơn vị sản xuất..."
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  className="border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center space-x-1">
                  <ImageIcon size={13} className="text-slate-400" />
                  <span>Hình ảnh biển báo</span>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-550 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center space-x-1">
                  <MapPin size={13} className="text-slate-400" />
                  <span>Mô tả cụ thể vị trí lắp đặt *</span>
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Ví dụ: Treo trên tường hành lang, cạnh thang máy tầng 1..."
                  value={locationDescription}
                  onChange={(e) => setLocationDescription(e.target.value)}
                  className="w-full border border-slate-200 bg-white text-slate-700 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 hover:border-slate-300 transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end space-x-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-xl px-4 py-2 border-slate-250 hover:bg-slate-100">
              Hủy bỏ
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 py-2 font-semibold">
              {isSubmitting ? 'Đang tạo...' : 'Khởi tạo biển báo'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
