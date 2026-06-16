import { useState, useEffect, useRef } from 'react';
import { QRCode } from 'react-qr-code';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assetService } from '@/services/assetService';
import { locationService } from '@/services/locationService';
import { ticketService } from '@/services/ticketService';
import { signTypeService } from '@/services/signTypeService';
import { fileService } from '@/services/fileService';
import { mapService } from '@/services/mapService';
import { getBackendUrl } from '@/shared/helpers/imageUrl';
import { PRIORITY_LABELS, TICKET_STATUS_LABELS } from '@/shared/helpers/ticketBadges';
import { getFullLocationPath, resolveLocationLevels } from '@/shared/helpers/locationHelper';
import { Asset, Location, SignType } from '@/shared/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, QrCode, Calendar, Wrench, CheckCircle2, AlertCircle, HardDrive, PenTool, FileText, MapPin, Layers, Maximize2, Building, Image as ImageIcon, Plus, Map as MapIcon, Tag } from 'lucide-react';
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
  const [qrBaseUrl, setQrBaseUrl] = useState(() => {
    return localStorage.getItem('qrBaseUrl') || window.location.origin;
  });

  const handleQrBaseUrlChange = (val: string) => {
    setQrBaseUrl(val);
    localStorage.setItem('qrBaseUrl', val);
  };
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  type EditForm = {
    assetCode: string; assetName: string; description: string; locationDescription: string;
    buildingId: number | ''; floorId: number | ''; roomId: number | ''; subRoomId: number | '';
    signTypeId: number | undefined; material: 'MICA' | 'INOX' | 'LED' | 'ALU';
    size: string; supplier: string; installedAt: string; status: Asset['status'];
  };
  const [editForm, setEditForm] = useState<EditForm>({
    assetCode: '', assetName: '', description: '', locationDescription: '',
    buildingId: '', floorId: '', roomId: '', subRoomId: '',
    signTypeId: undefined, material: 'MICA', size: '', supplier: '', installedAt: '', status: 'ACTIVE',
  });
  const setField = <K extends keyof EditForm>(key: K, val: EditForm[K]) =>
    setEditForm(prev => ({ ...prev, [key]: val }));
  const locationId = editForm.subRoomId || editForm.roomId || editForm.floorId || editForm.buildingId || undefined;

  const [ticketForm, setTicketForm] = useState({ desc: '', priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' });

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
    staleTime: 5 * 60 * 1000,
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
    staleTime: 5 * 60 * 1000,
  });

  // Fetch linked map node (if asset is pinned on a floor map)
  const { data: linkedNode } = useQuery({
    queryKey: ['nodeByAsset', id],
    queryFn: () => mapService.getNodeByAsset(id!),
    enabled: !!id,
    retry: false,
  });

  const { data: allFloors = [] } = useQuery({
    queryKey: ['mapFloors'],
    queryFn: mapService.getAllFloors,
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  const linkedFloor = linkedNode ? allFloors.find(f => f.id === linkedNode.floorId) : undefined;
  const linkedFloorName = linkedFloor
    ? (locations.find(l => l.id === linkedFloor.locationId)?.name ?? `Sơ đồ #${linkedFloor.id}`)
    : undefined;

  // Initialize edit fields when asset and locations are loaded
  useEffect(() => {
    if (asset && locations.length > 0 && !editForm.assetCode) {
      const levels = resolveLocationLevels(asset.location?.id, locations);
      setEditForm({
        assetCode: asset.assetCode,
        assetName: asset.name || '',
        description: asset.description || '',
        locationDescription: asset.locationDescription || '',
        buildingId: levels.buildingId,
        floorId: levels.floorId,
        roomId: levels.roomId,
        subRoomId: levels.subRoomId,
        signTypeId: asset.signTypeId,
        material: asset.material,
        size: asset.size,
        supplier: asset.supplier || '',
        installedAt: asset.installedAt ? asset.installedAt.split('T')[0] : '',
        status: asset.status,
      });
    }
  }, [asset, locations]);

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
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      setTicketForm({ desc: '', priority: 'MEDIUM' });
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
        assetCode: editForm.assetCode,
        name: editForm.assetName,
        description: editForm.description,
        locationDescription: editForm.locationDescription,
        locationId,
        signTypeId: editForm.signTypeId,
        material: editForm.material,
        size: editForm.size,
        supplier: editForm.supplier,
        installedAt: editForm.installedAt ? `${editForm.installedAt}T00:00:00Z` : undefined,
        status: editForm.status,
        imageUrl: uploadedUrl || undefined,
      });
    } catch (err) {
      alert('Lỗi tải ảnh lên. Vui lòng thử lại.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !ticketForm.desc) return;

    createTicketMutation.mutate({
      assetId: id,
      description: ticketForm.desc,
      priority: ticketForm.priority,
      source: 'MANUAL',
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
        return <Badge className="bg-rose-50 text-rose-700 hover:bg-rose-50 border border-rose-200 flex items-center space-x-1 w-fit text-xs px-2 py-0.5"><AlertCircle size={12} /> <span>Báo hỏng</span></Badge>;
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
          <div className="space-y-4 w-full flex flex-col items-center">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Mã QR Biển Báo</h3>
            <div ref={qrRef} className="w-48 h-48 border-2 border-slate-200 rounded-xl p-3 bg-white flex flex-col items-center justify-center relative shadow-inner">
              <QRCode
                value={`${qrBaseUrl}/scan/${asset.assetCode}`}
                size={160}
                level="M"
              />
            </div>
            <p className="text-xs text-slate-400 max-w-[200px]">Quét mã để truy cập thông tin biển trên điện thoại.</p>
            
            <div className="w-full space-y-1 text-left">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Base URL của QR</label>
              <div className="flex gap-1.5 items-center">
                <input
                  value={qrBaseUrl}
                  onChange={e => handleQrBaseUrlChange(e.target.value)}
                  placeholder="https://xxxx.ngrok-free.app"
                  className="flex-1 border border-slate-350 rounded-lg px-2.5 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50"
                />
                <button
                  type="button"
                  onClick={() => handleQrBaseUrlChange(window.location.origin)}
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-800 whitespace-nowrap"
                >
                  Đặt lại
                </button>
              </div>
            </div>

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

              <DialogContent className="bg-white sm:max-w-[620px] rounded-2xl border-slate-100 p-0 overflow-hidden shadow-2xl">
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

                  <div className="px-6 py-5 space-y-5 text-left max-h-[500px] overflow-y-auto">
                    {/* Mã và Trạng thái */}
                    <div className="bg-blue-50/30 border border-blue-100/50 p-4 rounded-xl grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-blue-800 uppercase tracking-wider flex items-center space-x-1 mb-2">
                          <Tag size={13} />
                          <span>Mã biển hiệu</span>
                        </label>
                        <Input
                          id="edit-asset-code"
                          required
                          value={editForm.assetCode}
                          onChange={(e) => setField('assetCode', e.target.value)}
                          className="border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg bg-white font-medium"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-blue-800 uppercase tracking-wider flex items-center space-x-1 mb-2">
                          <AlertCircle size={13} />
                          <span>Trạng thái</span>
                        </label>
                        <select
                          id="edit-asset-status"
                          value={editForm.status}
                          onChange={(e) => setField('status', e.target.value as Asset['status'])}
                          className="w-full border border-slate-200 bg-white text-slate-750 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 hover:border-slate-300"
                        >
                          <option value="ACTIVE">Hoạt động</option>
                          <option value="DAMAGED">Báo hỏng</option>
                          <option value="REPAIRING">Đang sửa</option>
                          <option value="SCRAPPED">Đã thanh lý</option>
                        </select>
                      </div>
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
                          placeholder="Ví dụ: Biển phòng khám 101..."
                          value={editForm.assetName}
                          onChange={(e) => setField('assetName', e.target.value)}
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
                            value={editForm.signTypeId ?? ''}
                            onChange={(e) => setField('signTypeId', e.target.value ? Number(e.target.value) : undefined)}
                            className="w-full border border-slate-200 bg-white text-slate-700 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 hover:border-slate-300"
                          >
                            <option value="">— Không phân loại —</option>
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
                            id="edit-asset-material"
                            value={editForm.material}
                            onChange={(e) => setField('material', e.target.value as EditForm['material'])}
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
                          id="edit-asset-description"
                          placeholder="Mô tả chi tiết..."
                          value={editForm.description}
                          onChange={(e) => setField('description', e.target.value)}
                          className="border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center space-x-1">
                          <Maximize2 size={13} className="text-slate-400" />
                          <span>Kích thước</span>
                        </label>
                        <Input
                          id="edit-asset-size"
                          required
                          placeholder="Ví dụ: 40x30 cm"
                          value={editForm.size}
                          onChange={(e) => setField('size', e.target.value)}
                          className="border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center space-x-1">
                            <Building size={13} className="text-slate-400" />
                            <span>Nhà cung cấp</span>
                          </label>
                          <Input
                            placeholder="Đơn vị sản xuất..."
                            value={editForm.supplier}
                            onChange={(e) => setField('supplier', e.target.value)}
                            className="border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center space-x-1">
                            <Calendar size={13} className="text-slate-400" />
                            <span>Ngày lắp đặt</span>
                          </label>
                          <Input
                            type="date"
                            value={editForm.installedAt}
                            onChange={(e) => setField('installedAt', e.target.value)}
                            className="border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg"
                          />
                        </div>
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
                              value={editForm.buildingId}
                              onChange={(e) => {
                                const val = e.target.value ? Number(e.target.value) : '';
                                setEditForm(prev => ({ ...prev, buildingId: val, floorId: '', roomId: '', subRoomId: '' }));
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
                              disabled={!editForm.buildingId}
                              value={editForm.floorId}
                              onChange={(e) => {
                                const val = e.target.value ? Number(e.target.value) : '';
                                setEditForm(prev => ({ ...prev, floorId: val, roomId: '', subRoomId: '' }));
                              }}
                              className="w-full border border-slate-200 bg-white text-slate-700 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 hover:border-slate-300 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                            >
                              <option value="">— Chọn Tầng —</option>
                              {locations.filter(loc => loc.parentId === editForm.buildingId).map(loc => (
                                <option key={loc.id} value={loc.id}>{loc.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Khoa / Phòng ban</span>
                            <select
                              disabled={!editForm.floorId}
                              value={editForm.roomId}
                              onChange={(e) => {
                                const val = e.target.value ? Number(e.target.value) : '';
                                setEditForm(prev => ({ ...prev, roomId: val, subRoomId: '' }));
                              }}
                              className="w-full border border-slate-200 bg-white text-slate-700 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 hover:border-slate-300 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                            >
                              <option value="">— Chọn Khoa (tuỳ chọn) —</option>
                              {locations.filter(loc => loc.parentId === editForm.floorId).map(loc => (
                                <option key={loc.id} value={loc.id}>{loc.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Phòng cụ thể</span>
                            <select
                              disabled={!editForm.roomId || locations.filter(loc => loc.parentId === editForm.roomId).length === 0}
                              value={editForm.subRoomId}
                              onChange={(e) => setField('subRoomId', e.target.value ? Number(e.target.value) : '')}
                              className="w-full border border-slate-200 bg-white text-slate-700 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 hover:border-slate-300 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                            >
                              <option value="">— Chọn Phòng (nếu có) —</option>
                              {locations.filter(loc => loc.parentId === editForm.roomId).map(loc => (
                                <option key={loc.id} value={loc.id}>{loc.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        {!locationId && <p className="text-xs text-rose-500 font-medium mt-1">Vui lòng chọn ít nhất Tòa nhà.</p>}
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
                          placeholder="Ví dụ: Treo trên tường hành lang, cạnh thang máy tầng 1..."
                          value={editForm.locationDescription}
                          onChange={(e) => setField('locationDescription', e.target.value)}
                          className="w-full border border-slate-200 bg-white text-slate-700 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 hover:border-slate-300 transition-colors"
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

            {asset.status === 'SCRAPPED' ? (
              <div className="w-full bg-slate-100 border border-slate-300 text-slate-500 text-sm font-medium px-4 py-3 rounded-xl flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                Biển đã thanh lý, không thể báo hỏng
              </div>
            ) : tickets.some(t => t.ticketStatus !== 'CLOSED') ? (
              <div className="w-full bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium px-4 py-3 rounded-xl flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                Đang có phiếu bảo trì chưa hoàn thành
              </div>
            ) : (
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
                        value={ticketForm.desc}
                        onChange={(e) => setTicketForm(prev => ({ ...prev, desc: e.target.value }))}
                        className="w-full border border-slate-200 bg-white text-slate-700 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Độ ưu tiên</label>
                      <select
                        value={ticketForm.priority}
                        onChange={(e) => setTicketForm(prev => ({ ...prev, priority: e.target.value as typeof ticketForm.priority }))}
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
            )}
          </div>
        </div>

        {/* Right Info: Details */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm md:col-span-2 space-y-6">
          <div className="flex items-start justify-between border-b border-slate-100 pb-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Mã QR / Định danh</span>
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
                <p className="text-sm text-slate-700 mt-1 flex items-center space-x-1.5">
                  <FileText size={15} className="text-slate-500" />
                  <span>{asset.description}</span>
                </p>
              )}
            </div>
            <div>{renderStatusBadge(asset.status)}</div>
          </div>

          <div className="grid grid-cols-2 gap-y-5 gap-x-6">
            <div className="space-y-1 col-span-2 bg-slate-50/50 p-4 rounded-xl border border-slate-100/80">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center space-x-1">
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
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Chất liệu</span>
              <p className="text-sm font-semibold text-slate-700">{asset.material}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Kích thước</span>
              <p className="text-sm font-semibold text-slate-700">{asset.size}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nhà cung cấp</span>
              <p className="text-sm font-semibold text-slate-700">{asset.supplier || 'Không xác định'}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center space-x-1">
                <Calendar size={12} /> <span>Ngày lắp đặt</span>
              </span>
              <p className="text-sm font-semibold text-slate-700">
                {asset.installedAt ? new Date(asset.installedAt).toLocaleDateString('vi-VN') : ''}
              </p>
            </div>
          </div>

          {linkedNode && (
            <div className="col-span-2 bg-slate-50/50 p-4 rounded-xl border border-slate-100/80 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MapIcon size={14} className="text-blue-500" />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Vị trí trên sơ đồ</span>
              </div>
              <div className="flex items-center gap-3">
                {linkedFloorName && (
                  <span className="text-sm font-semibold text-slate-700">{linkedFloorName}</span>
                )}
                <button
                  onClick={() => navigate(`/admin/assets/tree/map/${linkedNode.floorId}/edit?nodeId=${linkedNode.id}`)}
                  className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <MapIcon size={13} /> Xem trên sơ đồ
                </button>
              </div>
            </div>
          )}
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
                    <span className="text-xs font-bold text-slate-600">#{t.id}</span>
                    <Badge className={
                      t.priority === 'CRITICAL' ? 'bg-red-50 text-red-600 hover:bg-red-50 border border-red-200' :
                      t.priority === 'HIGH' ? 'bg-orange-50 text-orange-600 hover:bg-orange-50 border border-orange-200' :
                      t.priority === 'MEDIUM' ? 'bg-blue-50 text-blue-600 hover:bg-blue-50 border border-blue-200' :
                      'bg-slate-100 text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }>
                      {PRIORITY_LABELS[t.priority] ?? t.priority}
                    </Badge>
                    <Badge className={
                      t.ticketStatus === 'RESOLVED' ? 'bg-green-50 text-green-700 hover:bg-green-50' :
                      t.ticketStatus === 'IN_PROGRESS' ? 'bg-amber-50 text-amber-700 hover:bg-amber-50' :
                      t.ticketStatus === 'CLOSED' ? 'bg-slate-100 text-slate-700 hover:bg-slate-100' :
                      'bg-rose-50 text-rose-700 hover:bg-rose-50'
                    }>
                      {TICKET_STATUS_LABELS[t.ticketStatus] ?? t.ticketStatus}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium text-slate-700 truncate max-w-[500px]">{t.description}</p>
                </div>

                <div className="text-right text-xs text-slate-600">
                  <span>Khởi tạo: {new Date(t.createdAt).toLocaleDateString('vi-VN')}</span>
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
