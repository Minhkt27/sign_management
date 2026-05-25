import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assetService, PagedResponse } from '@/services/assetService';
import { locationService } from '@/services/locationService';
import { signTypeService } from '@/services/signTypeService';
import { fileService } from '@/services/fileService';
import { getFullLocationPath } from '@/shared/helpers/locationHelper';
import { Asset, Location, SignType } from '@/shared/types';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Search, Trash2, Eye, AlertCircle, Wrench, CheckCircle2, ShieldAlert, Tag, FileText, MapPin, Layers, Maximize2, Building, Image as ImageIcon } from 'lucide-react';

export default function AssetListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Search & Filter State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [materialFilter, setMaterialFilter] = useState('ALL');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 15;

  // Form State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [assetCode, setAssetCode] = useState('');
  const [assetName, setAssetName] = useState('');
  const [description, setDescription] = useState('');
  const [locationDescription, setLocationDescription] = useState('');
  const [autoGenerateCode, setAutoGenerateCode] = useState(true);
  const [selectedBuildingId, setSelectedBuildingId] = useState<number | ''>('');
  const [selectedFloorId, setSelectedFloorId] = useState<number | ''>('');
  const [selectedRoomId, setSelectedRoomId] = useState<number | ''>('');
  const [selectedSubRoomId, setSelectedSubRoomId] = useState<number | ''>('');
  const [signTypeId, setSignTypeId] = useState<number | undefined>(undefined);
  const [material, setMaterial] = useState<'MICA' | 'INOX' | 'LED' | 'ALU'>('MICA');
  const [size, setSize] = useState('40x30 cm');
  const [supplier, setSupplier] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  // Fetch Data using React Query
  const { data: assetData, isLoading: isAssetsLoading } = useQuery<PagedResponse<Asset>>({
    queryKey: ['assets'],
    queryFn: () => assetService.getAssetsPage(0, 200),
  });
  const assets = assetData?.content ?? [];

  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ['locations'],
    queryFn: locationService.getAllLocations,
  });

  const { data: signTypes = [] } = useQuery<SignType[]>({
    queryKey: ['signTypes'],
    queryFn: signTypeService.getAllSignTypes,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: assetService.createAsset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      // Reset Form
      setAssetCode('');
      setAssetName('');
      setDescription('');
      setLocationDescription('');
      setAutoGenerateCode(true);
      setMaterial('MICA');
      setSize('40x30 cm');
      setSupplier('');
      setSignTypeId(undefined);
      setImageFile(null);
      setSelectedBuildingId('');
      setSelectedFloorId('');
      setSelectedRoomId('');
      setSelectedSubRoomId('');
      setIsDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: assetService.deleteAsset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message
        ?? error?.response?.data
        ?? 'Không thể xóa biển báo này vì đang có phiếu bảo trì liên kết.';
      alert(msg);
    },
  });

  if (isAssetsLoading) {
    return <div className="text-center py-12 text-slate-500 font-medium">Đang tải danh sách biển hiệu...</div>;
  }

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalLocationId = selectedSubRoomId || selectedRoomId || selectedFloorId || selectedBuildingId;
    if (!finalLocationId) {
      alert('Vui lòng chọn vị trí lắp đặt.');
      return;
    }

    setIsUploading(true);
    try {
      let uploadedUrl = '';
      if (imageFile) {
        uploadedUrl = await fileService.uploadFile(imageFile);
      }

      createMutation.mutate({
        assetCode: autoGenerateCode ? '' : assetCode,
        name: assetName,
        description,
        locationDescription,
        locationId: Number(finalLocationId),
        signTypeId,
        material,
        size,
        status: 'ACTIVE',
        supplier,
        imageUrl: uploadedUrl,
        installedAt: new Date().toISOString()
      });
    } catch (err) {
      alert('Lỗi tải ảnh lên. Vui lòng thử lại.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteAsset = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa biển báo này khỏi hệ thống?')) {
      deleteMutation.mutate(id);
    }
  };

  // Helper: Get location name
  const getLocationName = (asset: Asset) => {
    return getFullLocationPath(asset.location?.id, locations);
  };

  // Helper: Render status badge
  const renderStatusBadge = (status: Asset['status']) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border border-emerald-200 flex items-center space-x-1 w-fit text-xs px-2 py-0.5"><CheckCircle2 size={12} /> <span>Hoạt động</span></Badge>;
      case 'DAMAGED':
        return <Badge className="bg-rose-50 text-rose-700 hover:bg-rose-50 border border-rose-200 flex items-center space-x-1 w-fit text-xs px-2 py-0.5"><AlertCircle size={12} /> <span>Báo hỏng</span></Badge>;
      case 'REPAIRING':
        return <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50 border border-amber-200 flex items-center space-x-1 w-fit text-xs px-2 py-0.5"><Wrench size={12} /> <span>Sửa chữa</span></Badge>;
      case 'SCRAPPED':
        return <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 border border-slate-200 flex items-center space-x-1 w-fit text-xs px-2 py-0.5"><ShieldAlert size={12} /> <span>Đã thanh lý</span></Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Dashboard calculations
  const totalCount = assets.length;
  const activeCount = assets.filter(a => a.status === 'ACTIVE').length;
  const damagedCount = assets.filter(a => a.status === 'DAMAGED').length;
  const repairingCount = assets.filter(a => a.status === 'REPAIRING').length;

  // Filter assets
  const filteredAssets = assets
    .filter(asset => {
      const matchesSearch = asset.assetCode.toLowerCase().includes(search.toLowerCase()) || 
                            (asset.description && asset.description.toLowerCase().includes(search.toLowerCase())) ||
                            (asset.locationDescription && asset.locationDescription.toLowerCase().includes(search.toLowerCase())) ||
                            getLocationName(asset).toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || asset.status === statusFilter;
      const matchesMaterial = materialFilter === 'ALL' || asset.material === materialFilter;
      
      return matchesSearch && matchesStatus && matchesMaterial;
    })
    .sort((a, b) => {
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

  const totalPages = Math.ceil(filteredAssets.length / PAGE_SIZE);
  const pagedAssets = filteredAssets.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="space-y-8">
      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500">Tổng biển báo</p>
            <h3 className="text-3xl font-extrabold text-slate-800 mt-1">{totalCount}</h3>
          </div>
          <div className="bg-blue-50 text-blue-600 p-3.5 rounded-xl">
            <ShieldAlert size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500">Đang hoạt động</p>
            <h3 className="text-3xl font-extrabold text-emerald-600 mt-1">{activeCount}</h3>
          </div>
          <div className="bg-emerald-50 text-emerald-600 p-3.5 rounded-xl">
            <CheckCircle2 size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500">Cần sửa chữa (Hỏng)</p>
            <h3 className="text-3xl font-extrabold text-rose-600 mt-1">{damagedCount}</h3>
          </div>
          <div className="bg-rose-50 text-rose-600 p-3.5 rounded-xl">
            <AlertCircle size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500">Đang sửa</p>
            <h3 className="text-3xl font-extrabold text-amber-600 mt-1">{repairingCount}</h3>
          </div>
          <div className="bg-amber-50 text-amber-600 p-3.5 rounded-xl">
            <Wrench size={24} />
          </div>
        </div>
      </div>

      {/* List Header & Controls */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-3 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <Input
                placeholder="Tìm mã hoặc vị trí..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="pl-11 pr-4 py-3 text-base text-slate-500 border-slate-200 hover:border-slate-350 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
              className="border border-slate-200 bg-white text-slate-700 px-3.5 py-2.5 rounded-xl text-sm font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">Tất cả Trạng thái</option>
              <option value="ACTIVE">Hoạt động</option>
              <option value="DAMAGED">Báo hỏng</option>
              <option value="REPAIRING">Đang sửa</option>
              <option value="SCRAPPED">Đã thanh lý</option>
            </select>

            <select
              value={materialFilter}
              onChange={(e) => { setMaterialFilter(e.target.value); setPage(0); }}
              className="border border-slate-200 bg-white text-slate-700 px-3.5 py-2.5 rounded-xl text-sm font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">Tất cả Chất liệu</option>
              <option value="MICA">MICA</option>
              <option value="INOX">INOX</option>
              <option value="LED">LED</option>
              <option value="ALU">ALU</option>
            </select>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger render={
                <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 flex items-center space-x-2 font-semibold transition-all duration-205 hover:shadow-lg hover:shadow-blue-500/20 active:scale-[0.98]">
                  <Plus size={18} />
                  <span>Thêm Biển báo</span>
                </Button>
              } />

              <DialogContent className="bg-white sm:max-w-[620px] rounded-2xl border-slate-100 p-0 overflow-hidden shadow-2xl">
                <form onSubmit={handleCreateAsset} className="flex flex-col h-full">
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
                    {/* Section 1: Identifier */}
                    <div className="bg-blue-50/30 border border-blue-100/50 p-4 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-blue-800 uppercase tracking-wider flex items-center space-x-1">
                          <Tag size={13} />
                          <span>Mã định danh biển báo</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer select-none text-xs font-semibold text-slate-600">
                          <input
                            id="create-asset-auto-code"
                            type="checkbox"
                            checked={autoGenerateCode}
                            onChange={(e) => setAutoGenerateCode(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span>Tự động sinh mã</span>
                        </label>
                      </div>

                      <Input
                        id="create-asset-code"
                        required={!autoGenerateCode}
                        disabled={autoGenerateCode}
                        placeholder={autoGenerateCode ? "Hệ thống sẽ tự tạo mã dạng ASSET_XXXXXXXX..." : "Ví dụ: BB-KKB-01"}
                        value={assetCode}
                        onChange={(e) => setAssetCode(e.target.value)}
                        className={`transition-all duration-200 rounded-lg ${
                          autoGenerateCode 
                            ? "bg-slate-50/85 border-slate-200/60 text-slate-400 cursor-not-allowed" 
                            : "border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                        }`}
                      />
                    </div>

                    {/* Section 2: Info & Details */}
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
                          id="create-asset-name"
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
                            id="create-asset-sign-type"
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
                            id="create-asset-material"
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
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center space-x-1">
                          <FileText size={13} className="text-slate-400" />
                          <span>Mô tả biển báo</span>
                        </label>
                        <Input
                          id="create-asset-description"
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
                            id="create-asset-size"
                            required
                            placeholder="Ví dụ: 40x30 cm"
                            value={size}
                            onChange={(e) => setSize(e.target.value)}
                            className="border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg"
                          />
                      </div>
                    </div>

                    {/* Section 3: Installation location */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-1.5">
                        Vị trí lắp đặt chi tiết
                      </h4>

                      <div className="space-y-4">
                        <label className="block text-xs font-bold text-slate-655 flex items-center space-x-1">
                          <MapPin size={13} className="text-slate-400" />
                          <span>Vị trí lắp đặt *</span>
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {/* Level 1: Building */}
                          <div>
                            <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tòa nhà</span>
                            <select
                              id="create-asset-building"
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

                          {/* Level 2: Floor */}
                          <div>
                            <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tầng</span>
                            <select
                              id="create-asset-floor"
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

                          {/* Level 3: Department */}
                          <div>
                            <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Khoa / Phòng ban</span>
                            <select
                              id="create-asset-dept"
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

                          {/* Level 4: Room */}
                          <div>
                            <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Phòng cụ thể</span>
                            <select
                              id="create-asset-room"
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
                            id="create-asset-supplier"
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
                          id="create-asset-image"
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
                          id="create-asset-location-description"
                          required
                          rows={2}
                          placeholder="Ví dụ: Treo trên tường hành lang, cạnh thang máy tầng 1, hoặc lắp trên cửa chính phòng khám 204..."
                          value={locationDescription}
                          onChange={(e) => setLocationDescription(e.target.value)}
                          className="w-full border border-slate-200 bg-white text-slate-700 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 hover:border-slate-300 transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end space-x-3">
                    <Button id="create-asset-cancel" type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl px-4 py-2 border-slate-250 hover:bg-slate-100">
                      Hủy bỏ
                    </Button>
                    <Button id="create-asset-submit" type="submit" disabled={isUploading} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 py-2 font-semibold">
                      {isUploading ? 'Đang tạo...' : 'Khởi tạo biển báo'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Assets Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="text-sm font-bold text-slate-700 text-left w-[60px]">STT</TableHead>
                <TableHead className="text-sm font-bold text-slate-700 text-left">Mã biển</TableHead>
                <TableHead className="text-sm font-bold text-slate-700 text-left">Tên biển</TableHead>
                <TableHead className="text-sm font-bold text-slate-700 text-left">Loại biển</TableHead>
                <TableHead className="text-sm font-bold text-slate-700 text-left">Chất liệu</TableHead>
                <TableHead className="text-sm font-bold text-slate-700 text-left">Kích thước</TableHead>
                <TableHead className="text-sm font-bold text-slate-700 text-left">Trạng thái</TableHead>
                <TableHead className="text-sm font-bold text-slate-700 text-left">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssets.length > 0 ? (
                pagedAssets.map((asset, index) => (
                  <TableRow key={asset.id} className="hover:bg-slate-50/50">
                    <TableCell className="text-sm text-left font-medium text-slate-500">{page * PAGE_SIZE + index + 1}</TableCell>
                    <TableCell className="text-sm font-bold text-blue-700 text-left">{asset.assetCode}</TableCell>
                    <TableCell className="text-sm text-slate-700 text-left font-medium max-w-[200px] truncate">{asset.name || '—'}</TableCell>
                    <TableCell className="text-sm text-left">
                      {asset.signTypeId ? (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs font-semibold">
                          {signTypes.find(st => st.id === asset.signTypeId)?.name || '—'}
                        </Badge>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-sm font-medium text-slate-600 text-left">{asset.material}</TableCell>
                    <TableCell className="text-sm text-slate-600 text-left">{asset.size}</TableCell>
                    <TableCell className="text-sm text-left">{renderStatusBadge(asset.status)}</TableCell>
                    <TableCell className="text-left">
                      <div className="flex items-center space-x-2">
                        <Button
                          onClick={() => navigate(`/admin/assets/${asset.id}`)}
                          variant="ghost"
                          size="sm"
                          className="hover:bg-blue-50 text-blue-600 p-2 rounded-lg"
                        >
                          <Eye size={16} />
                        </Button>
                        <Button
                          onClick={() => handleDeleteAsset(asset.id)}
                          variant="ghost"
                          size="sm"
                          className="hover:bg-red-50 text-red-600 p-2 rounded-lg"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-sm text-slate-400 font-medium">
                    Không tìm thấy biển báo vật lý nào phù hợp.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {filteredAssets.length > 0 && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-sm text-slate-500">
              {filteredAssets.length === 0 ? '0' : `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, filteredAssets.length)}`} / <strong>{filteredAssets.length}</strong> biển báo
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
                Trang {page + 1} / {totalPages || 1}
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
