import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { locationService } from '@/services/locationService';
import { assetService } from '@/services/assetService';
import { signTypeService } from '@/services/signTypeService';
import { getBackendUrl } from '@/shared/helpers/imageUrl';
import { Location, Asset, SignType } from '@/shared/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronRight, ChevronDown, FolderOpen, Tag, Plus, Pencil, Trash2, Search, X, ExternalLink, MapPin, Package, Ruler, Calendar, Building } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function AssetTreePage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Record<number, boolean>>({
    1: true, // Auto-expand Building A
    2: true, // Auto-expand Building B
  });

  // Create Location State
  const [isLocDialogOpen, setIsLocDialogOpen] = useState(false);
  const [newLocName, setNewLocName] = useState('');
  const [newLocDesc, setNewLocDesc] = useState('');
  const [parentId, setParentId] = useState<number | null>(null);

  // Edit Location State
  const [isEditLocDialogOpen, setIsEditLocDialogOpen] = useState(false);
  const [editLocName, setEditLocName] = useState('');
  const [editLocDesc, setEditLocDesc] = useState('');
  const [editLocCode, setEditLocCode] = useState('');
  const [editLocId, setEditLocId] = useState<number | null>(null);

  // Search Term State
  const [searchTerm, setSearchTerm] = useState('');

  // Queries
  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ['locations'],
    queryFn: locationService.getAllLocations,
  });

  const { data: assets = [] } = useQuery<Asset[]>({
    queryKey: ['assets', 'all'],
    queryFn: assetService.getAllAssets,
  });

  const { data: signTypes = [] } = useQuery<SignType[]>({
    queryKey: ['signTypes'],
    queryFn: signTypeService.getAllSignTypes,
  });

  const signTypeMap = new Map(signTypes.map(st => [st.id, st.name]));

  // Find matching assets and locations for tree filtering
  const getSearchFilteredData = () => {
    if (!searchTerm.trim()) {
      return {
        visibleLocIds: null,
        expandedLocIds: null,
        matchingAssetIds: null,
      };
    }

    const term = searchTerm.toLowerCase().trim();

    // 1. Find matching assets
    const matchingAssets = assets.filter(a => {
      return (
        a.assetCode.toLowerCase().includes(term) ||
        (a.description && a.description.toLowerCase().includes(term)) ||
        (a.material && a.material.toLowerCase().includes(term)) ||
        (a.size && a.size.toLowerCase().includes(term))
      );
    });
    const matchingAssetIds = new Set(matchingAssets.map(a => a.id));

    // 2. Find matching locations
    const matchingLocs = locations.filter(l => {
      return (
        l.name.toLowerCase().includes(term) ||
        (l.locationCode && l.locationCode.toLowerCase().includes(term)) ||
        (l.description && l.description.toLowerCase().includes(term))
      );
    });

    const visibleLocIds = new Set<number>();
    const expandedLocIds = new Set<number>();

    // When a location matches: expand it and make entire subtree visible
    const addSubtreeVisible = (locId: number) => {
      const children = locations.filter(l => l.parentId === locId);
      children.forEach(child => {
        visibleLocIds.add(child.id);
        expandedLocIds.add(locId); // expand parent so children show
        addSubtreeVisible(child.id);
      });
      // Show all assets at this location (not just search-matching ones)
      assets.filter(a => a.location?.id === locId).forEach(a => matchingAssetIds.add(a.id));
    };

    matchingLocs.forEach(l => {
      visibleLocIds.add(l.id);
      expandedLocIds.add(l.id); // expand the matched location itself
      addSubtreeVisible(l.id);
    });

    // Add locations containing matching assets
    matchingAssets.forEach(a => {
      if (a.location?.id) {
        visibleLocIds.add(a.location.id);
      }
    });

    // Trace up ancestor paths to make them visible and expanded
    const traceAncestors = (locId: number) => {
      const loc = locations.find(l => l.id === locId);
      if (loc && loc.parentId) {
        visibleLocIds.add(loc.parentId);
        expandedLocIds.add(loc.parentId);
        traceAncestors(loc.parentId);
      }
    };

    Array.from(visibleLocIds).forEach(id => traceAncestors(id));

    return {
      visibleLocIds,
      expandedLocIds,
      matchingAssetIds,
    };
  };

  const { visibleLocIds, expandedLocIds, matchingAssetIds } = getSearchFilteredData();

  // Mutations
  const createLocMutation = useMutation({
    mutationFn: locationService.createLocation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      setNewLocName('');
      setNewLocDesc('');
      setIsLocDialogOpen(false);
    },
  });

  const updateLocMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Location> }) =>
      locationService.updateLocation(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      setIsEditLocDialogOpen(false);
      setEditLocName('');
      setEditLocDesc('');
      setEditLocCode('');
      setEditLocId(null);
    },
    onError: (error: any) => {
      const errMsg = error?.response?.data?.message || 'Có lỗi xảy ra khi cập nhật vị trí.';
      alert(errMsg);
    }
  });

  const deleteLocMutation = useMutation({
    mutationFn: locationService.deleteLocation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
    },
    onError: (error: any) => {
      const errMsg = error?.response?.data?.message || 'Có lỗi xảy ra khi xóa vị trí.';
      alert(errMsg);
    }
  });

  const toggleExpand = (locId: number) => {
    setExpandedNodes(prev => ({
      ...prev,
      [locId]: !prev[locId]
    }));
  };

  const handleCreateLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocName) return;

    createLocMutation.mutate({
      name: newLocName,
      parentId,
      description: newLocDesc
    });
  };

  const openCreateLocDialog = (parentLocId: number | null) => {
    setParentId(parentLocId);
    setIsLocDialogOpen(true);
  };

  const openEditLocDialog = (loc: Location) => {
    setEditLocId(loc.id);
    setEditLocName(loc.name);
    setEditLocDesc(loc.description || '');
    setEditLocCode(loc.locationCode ?? '');
    setIsEditLocDialogOpen(true);
  };

  const handleEditLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editLocId || !editLocName) return;

    updateLocMutation.mutate({
      id: editLocId,
      data: {
        name: editLocName,
        locationCode: editLocCode,
        description: editLocDesc,
      }
    });
  };

  const handleDeleteLocation = (loc: Location) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa vị trí "${loc.name}"?`)) {
      deleteLocMutation.mutate(loc.id);
    }
  };


  // Build tree hierarchy
  const renderTreeNodes = (pId: number | null, depth = 0) => {
    let childLocs = locations.filter(l => l.parentId === pId);
    if (visibleLocIds) {
      childLocs = childLocs.filter(l => visibleLocIds.has(l.id));
    }
    
    return childLocs.map(loc => {
      const isExpanded = expandedLocIds ? expandedLocIds.has(loc.id) : !!expandedNodes[loc.id];
      
      let childAssets = assets.filter(a => a.location?.id === loc.id);
      if (matchingAssetIds) {
        childAssets = childAssets.filter(a => matchingAssetIds.has(a.id));
      }

      const hasChildren = locations.some(l => l.parentId === loc.id && (!visibleLocIds || visibleLocIds.has(l.id))) || childAssets.length > 0;

      return (
        <div key={loc.id} style={{ marginLeft: `${depth * 20}px` }} className="space-y-1 select-none">
          <div className="flex items-center justify-between group p-2 hover:bg-slate-100 rounded-xl transition-all duration-150">
            <div className="flex items-center space-x-2 cursor-pointer flex-1" onClick={() => toggleExpand(loc.id)}>
              {hasChildren ? (
                isExpanded ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronRight size={16} className="text-slate-500" />
              ) : (
                <span className="w-4"></span>
              )}
              <FolderOpen size={18} className="text-blue-500" />
              <span className="text-sm font-semibold text-slate-800">{loc.name}</span>
              {loc.type && (
                <Badge variant="outline" className={`text-xs ml-2 font-semibold px-1.5 py-0 hidden sm:inline-flex ${
                  loc.type === 'BUILDING' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                  loc.type === 'FLOOR' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  loc.type === 'DEPARTMENT' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                  'bg-teal-50 text-teal-700 border-teal-200'
                }`}>
                  {loc.type === 'BUILDING' && 'Tòa nhà'}
                  {loc.type === 'FLOOR' && 'Tầng'}
                  {loc.type === 'DEPARTMENT' && 'Khoa/Phòng ban'}
                  {loc.type === 'ROOM' && 'Phòng'}
                </Badge>
              )}
              {loc.description && (
                <span className="text-xs text-slate-400 font-normal hidden sm:inline truncate max-w-[120px]"> - {loc.description}</span>
              )}
            </div>

            <div className="flex items-center space-x-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
              {loc.type !== 'ROOM' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    openCreateLocDialog(loc.id);
                  }}
                  className="h-7 px-2 hover:bg-blue-50 hover:text-blue-600 rounded-lg text-xs flex items-center space-x-1 font-semibold"
                >
                  <Plus size={12} />
                  <span>
                    {loc.type === 'BUILDING' ? 'Thêm Tầng' :
                     loc.type === 'FLOOR' ? 'Thêm Khoa' :
                     loc.type === 'DEPARTMENT' ? 'Thêm Phòng' :
                     'Vị trí con'}
                  </span>
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  openEditLocDialog(loc);
                }}
                className="h-7 w-7 p-0 hover:bg-amber-50 hover:text-amber-600 rounded-lg flex items-center justify-center"
                title="Sửa vị trí"
              >
                <Pencil size={12} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteLocation(loc);
                }}
                className="h-7 w-7 p-0 hover:bg-rose-50 hover:text-rose-600 rounded-lg flex items-center justify-center"
                title="Xóa vị trí"
              >
                <Trash2 size={12} />
              </Button>
            </div>
          </div>

          {/* Child Nodes and Assets (if expanded) */}
          {isExpanded && (
            <div className="space-y-1">
              {/* Render child locations */}
              {renderTreeNodes(loc.id, depth + 1)}

              {/* Render assets directly inside this location */}
              {childAssets.map(asset => (
                <div
                  key={asset.id}
                  style={{ marginLeft: `${(depth + 1) * 20}px` }}
                  onClick={() => setSelectedAsset(asset)}
                  className={`flex items-center justify-between p-2 rounded-xl border border-dashed transition-all duration-150 text-left cursor-pointer ${
                    selectedAsset?.id === asset.id
                      ? 'bg-blue-50 border-blue-300'
                      : 'hover:bg-blue-50/50 border-transparent hover:border-blue-200/50'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Tag size={16} className="text-emerald-500" />
                    <span className="text-xs font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{asset.assetCode}</span>
                    {asset.name && (
                      <span className="text-xs font-semibold text-slate-600">{asset.name}</span>
                    )}
                    {asset.signTypeId && signTypeMap.has(asset.signTypeId) && (
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs px-1.5 py-0 font-semibold">
                        {signTypeMap.get(asset.signTypeId)}
                      </Badge>
                    )}
                    <span className="text-xs font-medium text-slate-400">{asset.material} ({asset.size})</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    {asset.status === 'ACTIVE' ? (
                      <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border border-emerald-250 text-xs px-1.5 py-0">Hoạt động</Badge>
                    ) : (
                      <Badge className="bg-rose-50 text-rose-700 hover:bg-rose-50 border border-rose-250 text-xs px-1.5 py-0">Gặp sự cố</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    });
  };

  const parentLoc = locations.find(l => l.id === parentId);
  let resolvedTypeLabel = 'Tòa nhà';
  let placeholderText = 'Ví dụ: Tòa nhà A, Tòa nhà B...';
  if (parentLoc) {
    if (parentLoc.type === 'BUILDING') {
      resolvedTypeLabel = 'Tầng';
      placeholderText = 'Ví dụ: Tầng 1, Tầng 2, Tầng hầm...';
    } else if (parentLoc.type === 'FLOOR') {
      resolvedTypeLabel = 'Khoa/Phòng ban';
      placeholderText = 'Ví dụ: Khoa Cấp cứu, Khoa Nội soi tiêu hóa...';
    } else if (parentLoc.type === 'DEPARTMENT') {
      resolvedTypeLabel = 'Phòng';
      placeholderText = 'Ví dụ: Phòng 101, Phòng thủ thuật...';
    }
  }

  const statusLabel: Record<string, string> = {
    ACTIVE: 'Hoạt động', DAMAGED: 'Hỏng', REPAIRING: 'Đang sửa', SCRAPPED: 'Thanh lý',
  };
  const statusColor: Record<string, string> = {
    ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    DAMAGED: 'bg-rose-50 text-rose-700 border-rose-200',
    REPAIRING: 'bg-amber-50 text-amber-700 border-amber-200',
    SCRAPPED: 'bg-slate-100 text-slate-500 border-slate-200',
  };

  return (
    <div className="bg-white p-4 md:p-8 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <p className="text-sm text-slate-500">Duyệt biển báo theo mô hình phân cấp Tòa nhà - Tầng - Phòng ban.</p>
        </div>
        <Button 
          onClick={() => openCreateLocDialog(null)}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 font-semibold flex items-center space-x-2"
        >
          <Plus size={18} />
          <span>Thêm Tòa nhà</span>
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <Input
          placeholder="Tìm nhanh biển hiệu (mã, mô tả, chất liệu...) hoặc vị trí..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-11 pr-4 py-3 border-slate-200 hover:border-slate-350 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-base text-slate-500"
        />
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-start">
        {/* Tree panel */}
        <div className={`bg-slate-50 p-3 md:p-6 rounded-xl border border-slate-200/50 min-h-[200px] space-y-3 transition-all duration-300 ${selectedAsset ? 'md:flex-1' : 'w-full'}`}>
          {locations.length > 0 ? (
            renderTreeNodes(null)
          ) : (
            <div className="text-center text-slate-400 py-12 font-medium">Chưa có dữ liệu vị trí nào được thiết lập.</div>
          )}
        </div>

        {/* Asset detail panel */}
        {selectedAsset && (
          <div className="w-full md:w-[420px] md:shrink-0 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <Tag size={16} className="text-emerald-500" />
                <span className="text-base font-bold text-slate-700">{selectedAsset.assetCode}</span>
                <Badge className={`text-xs px-2 py-0.5 border ${statusColor[selectedAsset.status]}`}>
                  {statusLabel[selectedAsset.status]}
                </Badge>
              </div>
              <button onClick={() => setSelectedAsset(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Image */}
            {selectedAsset.imageUrl ? (
              <img
                src={getBackendUrl(selectedAsset.imageUrl)}
                alt={selectedAsset.assetCode}
                className="w-full h-56 object-cover border-b border-slate-100"
              />
            ) : (
              <div className="w-full h-44 bg-slate-100 flex items-center justify-center border-b border-slate-100">
                <span className="text-sm text-slate-400">Chưa có ảnh</span>
              </div>
            )}

            {/* Info */}
            <div className="p-5 space-y-4">
              {selectedAsset.name && (
                <p className="text-base font-semibold text-slate-800">{selectedAsset.name}</p>
              )}

              <div className="space-y-3 text-sm text-slate-600">
                <div className="flex items-start gap-3">
                  <MapPin size={15} className="text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400 font-medium mb-0.5">Vị trí</p>
                    <span className="font-medium">{selectedAsset.location?.name || '—'}</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Package size={15} className="text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400 font-medium mb-0.5">Chất liệu</p>
                    <span className="font-medium">{selectedAsset.material}</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Ruler size={15} className="text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400 font-medium mb-0.5">Kích thước</p>
                    <span className="font-medium">{selectedAsset.size}</span>
                  </div>
                </div>
                {selectedAsset.supplier && (
                  <div className="flex items-start gap-3">
                    <Building size={15} className="text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-400 font-medium mb-0.5">Nhà cung cấp</p>
                      <span className="font-medium">{selectedAsset.supplier}</span>
                    </div>
                  </div>
                )}
                {selectedAsset.installedAt && (
                  <div className="flex items-start gap-3">
                    <Calendar size={15} className="text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-400 font-medium mb-0.5">Ngày lắp đặt</p>
                      <span className="font-medium">{new Date(selectedAsset.installedAt).toLocaleDateString('vi-VN')}</span>
                    </div>
                  </div>
                )}
                {selectedAsset.description && (
                  <p className="text-slate-500 italic pt-1 text-sm">{selectedAsset.description}</p>
                )}
              </div>

              <Button
                className="w-full mt-1"
                onClick={() => navigate(`/admin/assets/${selectedAsset.id}`)}
              >
                <ExternalLink size={14} className="mr-2" />
                Xem chi tiết đầy đủ
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Dialog for adding Location */}
      <Dialog open={isLocDialogOpen} onOpenChange={setIsLocDialogOpen}>
        <DialogContent className="sm:max-w-[440px] bg-white rounded-2xl border-slate-100 p-0 overflow-hidden shadow-2xl">
          <form onSubmit={handleCreateLocation}>
            <div className="bg-slate-50/80 backdrop-blur px-6 py-5 border-b border-slate-100">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-slate-800 flex items-center space-x-2">
                  <Plus className="text-blue-600" size={20} />
                  <span>Thêm vị trí mới ({resolvedTypeLabel})</span>
                </DialogTitle>
                <DialogDescription className="text-slate-500 text-sm mt-1">
                  {parentLoc ? `Thêm vị trí trực thuộc: ${parentLoc.name}` : 'Thêm tòa nhà cơ sở mới.'}
                </DialogDescription>
              </DialogHeader>
            </div>
            <div className="px-6 py-5 space-y-4 text-left">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Tên {resolvedTypeLabel.toLowerCase()} *</label>
                <Input
                  required
                  placeholder={placeholderText}
                  value={newLocName}
                  onChange={(e) => setNewLocName(e.target.value)}
                  className="border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Mô tả chi tiết</label>
                <Input
                  placeholder="Ví dụ: Khu khám bệnh ngoại trú, phòng khám chức năng..."
                  value={newLocDesc}
                  onChange={(e) => setNewLocDesc(e.target.value)}
                  className="border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg"
                />
              </div>
            </div>
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end space-x-3">
              <Button type="button" variant="outline" onClick={() => setIsLocDialogOpen(false)} className="rounded-xl px-4 py-2 border-slate-250 hover:bg-slate-100">Hủy</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 py-2 font-semibold">Thêm</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog for editing Location */}
      <Dialog open={isEditLocDialogOpen} onOpenChange={setIsEditLocDialogOpen}>
        <DialogContent className="sm:max-w-[440px] bg-white rounded-2xl border-slate-100 p-0 overflow-hidden shadow-2xl">
          <form onSubmit={handleEditLocation}>
            <div className="bg-slate-50/80 backdrop-blur px-6 py-5 border-b border-slate-100">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-slate-800 flex items-center space-x-2">
                  <Pencil className="text-amber-600" size={20} />
                  <span>Sửa thông tin vị trí</span>
                </DialogTitle>
                <DialogDescription className="text-slate-500 text-sm mt-1">
                  Cập nhật các thông tin chi tiết của vị trí này.
                </DialogDescription>
              </DialogHeader>
            </div>
            <div className="px-6 py-5 space-y-4 text-left">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Mã vị trí (Code) *</label>
                <Input
                  required
                  placeholder="Ví dụ: B1_T1_P01"
                  value={editLocCode}
                  onChange={(e) => setEditLocCode(e.target.value)}
                  className="border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Tên vị trí *</label>
                <Input
                  required
                  placeholder="Ví dụ: Tòa nhà A, Phòng 101..."
                  value={editLocName}
                  onChange={(e) => setEditLocName(e.target.value)}
                  className="border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Mô tả chi tiết</label>
                <Input
                  placeholder="Mô tả cụ thể..."
                  value={editLocDesc}
                  onChange={(e) => setEditLocDesc(e.target.value)}
                  className="border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg"
                />
              </div>
            </div>
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end space-x-3">
              <Button type="button" variant="outline" onClick={() => setIsEditLocDialogOpen(false)} className="rounded-xl px-4 py-2 border-slate-250 hover:bg-slate-100">Hủy</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 py-2 font-semibold">Lưu</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
