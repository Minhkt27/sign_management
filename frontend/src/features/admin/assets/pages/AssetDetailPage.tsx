import { useState, useEffect, useRef } from 'react';
import { QRCode } from 'react-qr-code';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assetService } from '@/services/assetService';
import { locationService } from '@/services/locationService';
import { ticketService } from '@/services/ticketService';
import { signTypeService } from '@/services/signTypeService';
import { fileService } from '@/services/fileService';
import { getBackendUrl } from '@/shared/helpers/imageUrl';
import { getFullLocationPath, resolveLocationLevels } from '@/shared/helpers/locationHelper';
import { Asset, Location, SignType } from '@/shared/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, QrCode, Calendar, Wrench, CheckCircle2, AlertCircle, HardDrive, PenTool, FileText, MapPin, Layers, Maximize2, Building, Image as ImageIcon, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Editing State
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [assetCode, setAssetCode] = useState('');
  const [assetName, setAssetName] = useState('');
  const [description, setDescription] = useState('');
  const [locationDescription, setLocationDescription] = useState('');
  const [selectedBuildingId, setSelectedBuildingId] = useState<number | ''>('');
  const [selectedFloorId, setSelectedFloorId] = useState<number | ''>('');
  const [selectedRoomId, setSelectedRoomId] = useState<number | ''>('');
  const locationId = selectedRoomId || selectedFloorId || selectedBuildingId || undefined;
  const [editSignTypeId, setEditSignTypeId] = useState<number | undefined>(undefined);
  const [material, setMaterial] = useState<'MICA' | 'INOX' | 'LED' | 'ALU'>('MICA');
  const [size, setSize] = useState('');
  const [supplier, setSupplier] = useState('');
  const [installedAt, setInstalledAt] = useState('');
  const [status, setStatus] = useState<Asset['status']>('ACTIVE');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  // Create Ticket State
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);
  const [ticketDesc, setTicketDesc] = useState('');
  const [ticketPriority, setTicketPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');

  // Fetch Asset Detail
  const { data: asset, isLoading: isAssetLoading } = useQuery<Asset>({
    queryKey: ['asset', id],
    queryFn: () => assetService.getAssetById(id!),
    enabled: !!id,
  });

  // Fetch Locations
  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ['locations'],
    queryFn: locationService.getAllLocations,
  });

  // Fetch Tickets for this asset
  const { data: ticketData } = useQuery({
    queryKey: ['assetTickets', id],
    queryFn: () => ticketService.getTickets({ assetId: id }),
    enabled: !!id,
  });
  const tickets = ticketData?.content ?? [];

  // Fetch Sign Types
  const { data: signTypes = [] } = useQuery<SignType[]>({
    queryKey: ['signTypes'],
    queryFn: signTypeService.getAllSignTypes,
  });

  // Initialize edit fields when asset and locations are loaded
  useEffect(() => {
    if (asset && locations.length > 0 && !assetCode) {
      setAssetCode(asset.assetCode);
      setAssetName(asset.name || '');
      setDescription(asset.description || '');
      setLocationDescription(asset.locationDescription || '');
      
      const levels = resolveLocationLevels(asset.location?.id, locations);
      setSelectedBuildingId(levels.buildingId);
      setSelectedFloorId(levels.floorId);
      setSelectedRoomId(levels.roomId);

      setEditSignTypeId(asset.signTypeId);
      setMaterial(asset.material);
      setSize(asset.size);
      setSupplier(asset.supplier || '');
      setInstalledAt(asset.installedAt ? asset.installedAt.split('T')[0] : '');
      setStatus(asset.status);
    }
  }, [asset, locations, assetCode]);

  const signTypeMap = new Map(signTypes.map(st => [st.id, st.name]));

  // Mutations
  const updateMutation = useMutation({
    mutationFn: (data: Omit<Partial<Asset>, 'location'> & { locationId?: number }) =>
      assetService.updateAsset(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset', id] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setImageFile(null);
      setIsEditDialogOpen(false);
    },
  });

  const createTicketMutation = useMutation({
    mutationFn: ticketService.createTicket,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assetTickets', id] });
      queryClient.invalidateQueries({ queryKey: ['asset', id] });
      setTicketDesc('');
      setTicketPriority('MEDIUM');
      setIsTicketDialogOpen(false);
    },
  });

  const handleUpdateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !asset || locationId === undefined) return;

    setIsUploading(true);
    try {
      let uploadedUrl = asset.imageUrl || '';
      if (imageFile) {
        uploadedUrl = await fileService.uploadFile(imageFile);
      }

      updateMutation.mutate({
        assetCode,
        name: assetName,
        description,
        locationDescription,
        locationId,
        signTypeId: editSignTypeId,
        material,
        size,
        supplier,
        installedAt: installedAt || undefined,
        status,
        imageUrl: uploadedUrl,
      });
    } catch (err) {
      alert('Lỗi tải ảnh lên. Vui lòng thử lại.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !ticketDesc) return;

    createTicketMutation.mutate({
      assetId: id,
      description: ticketDesc,
      priority: ticketPriority,
    });
  };

  const handleDownloadQR = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg || !asset) return;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svg);
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 300, 300);
      ctx.drawImage(img, 0, 0, 300, 300);
      const link = document.createElement('a');
      link.download = `QR-${asset.assetCode}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgStr)));
  };

  if (isAssetLoading) {
    return <div className="text-center py-12 text-slate-500 font-medium">Đang tải thông tin biển hiệu...</div>;
  }

  if (!asset) {

    return (
      <div className="text-center p-12">
        <p className="text-slate-500 font-medium">Không tìm thấy biển báo vật lý hoặc đã bị xóa.</p>
        <Button onClick={() => navigate('/admin/assets')} className="mt-4 bg-blue-600 text-white rounded-lg">Quay lại danh sách</Button>
      </div>
    );
  }

  const locationName = getFullLocationPath(asset.location?.id, locations);

  // Helper: Render status badge
  const renderStatusBadge = (status: Asset['status']) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border border-emerald-200 flex items-center space-x-1 w-fit text-xs px-2 py-0.5"><CheckCircle2 size={12} /> <span>Hoạt động</span></Badge>;
      case 'DAMAGED':
        return <Badge className="bg-rose-50 text-rose-700 hover:bg-rose-50 border border-rose-200 flex items-center space-x-1 w-fit text-xs px-2 py-0.5"><AlertCircle size={12} /> <span>Gặp sự cố (Báo hỏng)</span></Badge>;
      case 'REPAIRING':
        return <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50 border border-amber-200 flex items-center space-x-1 w-fit text-xs px-2 py-0.5"><Wrench size={12} /> <span>Đang sửa chữa</span></Badge>;
      case 'SCRAPPED':
        return <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 border border-slate-200 flex items-center space-x-1 w-fit text-xs px-2 py-0.5"><HardDrive size={12} /> <span>Đã thanh lý</span></Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto text-left">
      {/* Back Button */}
      <button 
        onClick={() => navigate('/admin/assets')}
        className="flex items-center space-x-2 text-slate-500 hover:text-slate-800 transition-colors font-semibold text-sm"
      >
        <ArrowLeft size={18} />
        <span>Quay lại Quản lý Biển báo</span>
      </button>

      {/* Main Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Card: QR Code & Actions */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col items-center justify-between text-center space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Mã QR Biển Báo</h3>
            <div ref={qrRef} className="w-48 h-48 border-2 border-slate-200 rounded-xl p-3 bg-white flex flex-col items-center justify-center relative shadow-inner">
              <QRCode
                value={`${window.location.origin}/tech/assets/${asset.assetCode}`}
                size={160}
                level="M"
              />
            </div>
            <p className="text-xs text-slate-400 max-w-[200px]">Quét mã để truy cập thông tin biển trên điện thoại.</p>
            <Button
              type="button"
              variant="outline"
              onClick={handleDownloadQR}
              className="w-full text-xs font-semibold flex items-center justify-center gap-2"
            >
              <QrCode size={14} />
              Tải QR về máy (PNG)
            </Button>
            
            <div className="space-y-2 text-left pt-2 border-t border-slate-100 w-full">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                <ImageIcon size={12} />
                <span>Hình ảnh thực tế</span>
              </h3>
              <div className="w-full aspect-video rounded-xl bg-slate-50 border border-slate-200/80 overflow-hidden flex items-center justify-center relative shadow-inner">
                {asset.imageUrl ? (
                  <img 
                    src={getBackendUrl(asset.imageUrl)} 
                    alt={asset.name} 
                    onClick={() => setZoomedImage(getBackendUrl(asset.imageUrl))}
                    className="w-full h-full object-cover cursor-zoom-in hover:opacity-85 transition-opacity" 
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400 py-3 space-y-1">
                    <ImageIcon size={20} />
                    <span className="text-[9px] font-bold uppercase tracking-wider">Chưa có ảnh</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="w-full space-y-2">
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogTrigger render={
                <Button className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl flex items-center justify-center space-x-2 border border-slate-200 py-3">
                  <PenTool size={16} />
                  <span>Sửa thông tin</span>
                </Button>
              } />

              <DialogContent className="bg-white sm:max-w-[550px] rounded-2xl border-slate-100 p-0 overflow-hidden shadow-2xl">
                <form onSubmit={handleUpdateAsset} className="flex flex-col h-full">
                  <div className="bg-slate-50/80 backdrop-blur px-6 py-5 border-b border-slate-100">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-bold text-slate-800 flex items-center space-x-2">
                        <PenTool className="text-blue-600" size={20} />
                        <span>Cập nhật Biển báo</span>
                      </DialogTitle>
                      <DialogDescription className="text-slate-500 text-sm mt-1">
                        Chỉnh sửa thông số kỹ thuật, trạng thái hoạt động hoặc vị trí lắp đặt của biển báo.
                      </DialogDescription>
                    </DialogHeader>
                  </div>

                  <div className="px-6 py-5 space-y-4 text-left max-h-[480px] overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Mã biển hiệu</label>
                        <Input
                          id="edit-asset-code"
                          required
                          value={assetCode}
                          onChange={(e) => setAssetCode(e.target.value)}
                          className="border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg bg-slate-50 font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Trạng thái</label>
                        <select
                          id="edit-asset-status"
                          value={status}
                          onChange={(e) => setStatus(e.target.value as any)}
                          className="w-full border border-slate-200 bg-white text-slate-750 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 hover:border-slate-300"
                        >
                          <option value="ACTIVE">Hoạt động</option>
                          <option value="DAMAGED">Báo hỏng</option>
                          <option value="REPAIRING">Đang sửa</option>
                          <option value="SCRAPPED">Đã thanh lý</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Tên biển</label>
                        <Input
                          placeholder="Tên hiển thị của biển..."
                          value={assetName}
                          onChange={(e) => setAssetName(e.target.value)}
                          className="border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Loại biển</label>
                        <select
                          value={editSignTypeId ?? ''}
                          onChange={(e) => setEditSignTypeId(e.target.value ? Number(e.target.value) : undefined)}
                          className="w-full border border-slate-200 bg-white text-slate-700 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 hover:border-slate-300"
                        >
                          <option value="">— Không phân loại —</option>
                          {signTypes.map(st => (
                            <option key={st.id} value={st.id}>{st.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center space-x-1">
                        <Calendar size={13} className="text-slate-400" />
                        <span>Ngày lắp đặt</span>
                      </label>
                      <Input
                        type="date"
                        value={installedAt}
                        onChange={(e) => setInstalledAt(e.target.value)}
                        className="border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center space-x-1">
                        <FileText size={13} className="text-slate-400" />
                        <span>Mô tả biển báo *</span>
                      </label>
                      <Input
                        id="edit-asset-description"
                        required
                        placeholder="Mô tả hiển thị trên biển báo..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-500 flex items-center space-x-1">
                        <MapPin size={13} className="text-slate-400" />
                        <span>Vị trí lắp đặt *</span>
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <span className="block text-xs font-bold text-slate-400 uppercase mb-1">Tòa nhà</span>
                          <select
                            value={selectedBuildingId}
                            onChange={(e) => {
                              const val = e.target.value ? Number(e.target.value) : '';
                              setSelectedBuildingId(val);
                              setSelectedFloorId('');
                              setSelectedRoomId('');
                            }}
                            className="w-full border border-slate-200 bg-white text-slate-700 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="">— Chọn Tòa nhà —</option>
                            {locations.filter(loc => loc.parentId === null).map(loc => (
                              <option key={loc.id} value={loc.id}>{loc.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <span className="block text-xs font-bold text-slate-400 uppercase mb-1">Tầng</span>
                          <select
                            disabled={!selectedBuildingId}
                            value={selectedFloorId}
                            onChange={(e) => {
                              const val = e.target.value ? Number(e.target.value) : '';
                              setSelectedFloorId(val);
                              setSelectedRoomId('');
                            }}
                            className="w-full border border-slate-200 bg-white text-slate-700 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                          >
                            <option value="">— Chọn Tầng —</option>
                            {locations.filter(loc => loc.parentId === selectedBuildingId).map(loc => (
                              <option key={loc.id} value={loc.id}>{loc.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <span className="block text-xs font-bold text-slate-400 uppercase mb-1">Khoa / Phòng</span>
                          <select
                            disabled={!selectedFloorId}
                            value={selectedRoomId}
                            onChange={(e) => setSelectedRoomId(e.target.value ? Number(e.target.value) : '')}
                            className="w-full border border-slate-200 bg-white text-slate-700 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                          >
                            <option value="">— Chọn Khoa / Phòng —</option>
                            {locations.filter(loc => loc.parentId === selectedFloorId).map(loc => (
                              <option key={loc.id} value={loc.id}>{loc.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      {!locationId && <p className="text-xs text-rose-500 font-medium">Vui lòng chọn ít nhất Tòa nhà.</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center space-x-1">
                        <Building size={13} className="text-slate-400" />
                        <span>Nhà cung cấp</span>
                      </label>
                      <Input
                        placeholder="Đơn vị sản xuất..."
                        value={supplier}
                        onChange={(e) => setSupplier(e.target.value)}
                        className="border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center space-x-1">
                        <ImageIcon size={13} className="text-slate-400" />
                        <span>Hình ảnh biển báo mới</span>
                      </label>
                      <input
                        id="edit-asset-image"
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
                        id="edit-asset-location-description"
                        required
                        rows={2}
                        placeholder="Mô tả cụ thể vị trí lắp đặt..."
                        value={locationDescription}
                        onChange={(e) => setLocationDescription(e.target.value)}
                        className="w-full border border-slate-200 bg-white text-slate-700 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 hover:border-slate-300 transition-colors"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center space-x-1">
                          <Layers size={13} className="text-slate-400" />
                          <span>Chất liệu</span>
                        </label>
                        <select
                          id="edit-asset-material"
                          value={material}
                          onChange={(e) => setMaterial(e.target.value as any)}
                          className="w-full border border-slate-200 bg-white text-slate-700 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 hover:border-slate-300"
                        >
                          <option value="MICA">MICA</option>
                          <option value="INOX">INOX</option>
                          <option value="LED">LED</option>
                          <option value="ALU">ALU</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center space-x-1">
                          <Maximize2 size={13} className="text-slate-400" />
                          <span>Kích thước</span>
                        </label>
                        <Input
                          id="edit-asset-size"
                          required
                          value={size}
                          onChange={(e) => setSize(e.target.value)}
                          className="border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end space-x-3">
                    <Button id="edit-asset-cancel" type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} className="rounded-xl px-4 py-2 border-slate-250 hover:bg-slate-100">
                      Hủy bỏ
                    </Button>
                    <Button id="edit-asset-submit" type="submit" disabled={isUploading} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 py-2 font-semibold">
                      {isUploading ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={isTicketDialogOpen} onOpenChange={setIsTicketDialogOpen}>
              <DialogTrigger render={
                <Button className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl flex items-center justify-center space-x-2 py-3">
                  <AlertCircle size={16} />
                  <span>Báo hỏng biển báo</span>
                </Button>
              } />

              <DialogContent className="bg-white sm:max-w-[440px]">
                <form onSubmit={handleCreateTicket}>
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-slate-800">Tạo phiếu báo hỏng</DialogTitle>
                    <DialogDescription className="text-slate-500 text-sm">Gửi phản ánh sự cố kỹ thuật về biển hiệu này.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 my-6 text-left">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Mô tả sự cố</label>
                      <textarea
                        required
                        rows={3}
                        placeholder="Mô tả chi tiết tình trạng hư hỏng..."
                        value={ticketDesc}
                        onChange={(e) => setTicketDesc(e.target.value)}
                        className="w-full border border-slate-200 bg-white text-slate-700 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Độ ưu tiên</label>
                      <select
                        value={ticketPriority}
                        onChange={(e) => setTicketPriority(e.target.value as any)}
                        className="w-full border border-slate-200 bg-white text-slate-700 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="LOW">Thấp (Low)</option>
                        <option value="MEDIUM">Trung bình (Medium)</option>
                        <option value="HIGH">Cao (High)</option>
                        <option value="CRITICAL">Khẩn cấp (Critical)</option>
                      </select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsTicketDialogOpen(false)} className="rounded-lg">Hủy</Button>
                    <Button type="submit" className="bg-rose-600 hover:bg-rose-700 text-white rounded-lg">Gửi phản ánh</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Right Info: Details */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm md:col-span-2 space-y-6">
          <div className="flex items-start justify-between border-b border-slate-100 pb-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Mã QR / Định danh</span>
              <h2 className="text-2xl font-bold text-slate-800">{asset.assetCode}</h2>
              {asset.name && (
                <p className="text-base font-semibold text-slate-705 mt-1">{asset.name}</p>
              )}
              {asset.signTypeId && signTypeMap.has(asset.signTypeId) && (
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs font-semibold mt-1">
                  {signTypeMap.get(asset.signTypeId)}
                </Badge>
              )}
              {asset.description && (
                <p className="text-sm text-slate-500 mt-1 flex items-center space-x-1.5">
                  <FileText size={15} className="text-slate-400" />
                  <span>{asset.description}</span>
                </p>
              )}
            </div>
            <div>{renderStatusBadge(asset.status)}</div>
          </div>

          <div className="grid grid-cols-2 gap-y-5 gap-x-6">
            <div className="space-y-1 col-span-2 bg-slate-50/50 p-4 rounded-xl border border-slate-100/80">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center space-x-1">
                <MapPin size={12} className="text-blue-500" />
                <span>Vị trí chi tiết lắp đặt</span>
              </span>
              <p className="text-sm font-semibold text-slate-800 mt-1">{locationName}</p>
              {asset.locationDescription && (
                <p className="text-xs text-slate-500 mt-1.5 bg-white px-3 py-2 rounded border border-slate-100 italic">
                  {asset.locationDescription}
                </p>
              )}
            </div>
            
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Chất liệu</span>
              <p className="text-sm font-semibold text-slate-700">{asset.material}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Kích thước</span>
              <p className="text-sm font-semibold text-slate-700">{asset.size}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nhà cung cấp</span>
              <p className="text-sm font-semibold text-slate-700">{asset.supplier || 'Không xác định'}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center space-x-1">
                <Calendar size={12} /> <span>Ngày lắp đặt</span>
              </span>
              <p className="text-sm font-semibold text-slate-700">
                {asset.installedAt ? new Date(asset.installedAt).toLocaleDateString('vi-VN') : ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Maintenance History */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm space-y-5">
        <h3 className="text-lg font-bold text-slate-850 flex items-center space-x-2">
          <Wrench size={18} className="text-slate-500" />
          <span>Lịch sử Bảo trì & Khắc phục sự cố</span>
        </h3>

        <div className="space-y-4">
          {tickets.length > 0 ? (
            tickets.map((t) => (
              <div 
                key={t.id} 
                className="p-4 border border-slate-100 rounded-xl hover:bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
                onClick={() => navigate(`/admin/tickets/${t.id}`)}
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-400">#{t.id}</span>
                    <Badge className={
                      t.priority === 'CRITICAL' ? 'bg-red-50 text-red-600 hover:bg-red-50 border border-red-200' :
                      t.priority === 'HIGH' ? 'bg-orange-50 text-orange-600 hover:bg-orange-50 border border-orange-200' :
                      t.priority === 'MEDIUM' ? 'bg-blue-50 text-blue-600 hover:bg-blue-50 border border-blue-200' :
                      'bg-slate-100 text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }>
                      {t.priority}
                    </Badge>
                    <Badge className={
                      t.ticketStatus === 'RESOLVED' ? 'bg-green-50 text-green-700 hover:bg-green-50' :
                      t.ticketStatus === 'IN_PROGRESS' ? 'bg-amber-50 text-amber-700 hover:bg-amber-50' :
                      'bg-slate-100 text-slate-700 hover:bg-slate-100'
                    }>
                      {t.ticketStatus}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium text-slate-700 truncate max-w-[500px]">{t.description}</p>
                </div>

                <div className="text-right text-xs text-slate-400">
                  <span>Khởi tạo: {new Date(t.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center py-6 text-slate-400 font-medium border border-dashed border-slate-200 rounded-xl">
              Chưa có lịch sử bảo trì nào được ghi nhận cho biển báo này.
            </p>
          )}
        </div>
      </div>
      {/* Image Preview Overlay Modal */}
      {zoomedImage && (
        <Dialog open={!!zoomedImage} onOpenChange={(open) => !open && setZoomedImage(null)}>
          <DialogContent className="max-w-4xl p-0 bg-transparent border-none shadow-none flex items-center justify-center">
            <div className="relative max-h-[85vh] max-w-full overflow-hidden rounded-2xl bg-slate-950/40 backdrop-blur-md border border-white/10 p-2 shadow-2xl">
              <img 
                src={zoomedImage} 
                alt="Zoomed Signage" 
                className="max-h-[80vh] max-w-full rounded-xl object-contain"
              />
              <button 
                onClick={() => setZoomedImage(null)}
                className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 border border-white/20 hover:scale-105 transition-all focus:outline-none"
              >
                <Plus className="rotate-45" size={20} />
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
