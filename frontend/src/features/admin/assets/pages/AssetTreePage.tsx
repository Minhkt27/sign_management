import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { locationService } from '@/services/locationService';
import { assetService } from '@/services/assetService';
import { signTypeService } from '@/services/signTypeService';
import { Location, Asset, SignType } from '@/shared/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronRight, ChevronDown, FolderOpen, Tag, Plus, Pencil, Trash2, Search } from 'lucide-react';
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
    queryKey: ['assets'],
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

    // Add matching locations
    matchingLocs.forEach(l => {
      visibleLocIds.add(l.id);
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
    setEditLocCode(loc.locationCode);
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
                <Badge variant="outline" className={`text-[10px] ml-2 font-semibold px-1.5 py-0 ${
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
                <span className="text-xs text-slate-400 font-normal"> - {loc.description}</span>
              )}
            </div>

            <div className="flex items-center space-x-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
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
                  className="flex items-center justify-between p-2 hover:bg-blue-50/50 rounded-xl border border-dashed border-transparent hover:border-blue-200/50 transition-all duration-150 text-left"
                >
                  <div className="flex items-center space-x-2.5">
                    <Tag size={16} className="text-emerald-500" />
                    <span className="text-xs font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{asset.assetCode}</span>
                    {asset.name && (
                      <span className="text-xs font-semibold text-slate-600">{asset.name}</span>
                    )}
                    {asset.signTypeId && signTypeMap.has(asset.signTypeId) && (
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] px-1.5 py-0 font-semibold">
                        {signTypeMap.get(asset.signTypeId)}
                      </Badge>
                    )}
                    <span className="text-xs font-medium text-slate-400">{asset.material} ({asset.size})</span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    {asset.status === 'ACTIVE' ? (
                      <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border border-emerald-250 text-[10px] px-1.5 py-0">Hoạt động</Badge>
                    ) : (
                      <Badge className="bg-rose-50 text-rose-700 hover:bg-rose-50 border border-rose-250 text-[10px] px-1.5 py-0">Gặp sự cố</Badge>
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

  return (
    <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Sơ đồ Cấu trúc Vị trí</h2>
          <p className="text-sm text-slate-500 mt-1">Duyệt biển báo theo mô hình phân cấp Tòa nhà - Tầng - Phòng ban.</p>
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
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <Input
          placeholder="Tìm nhanh biển hiệu (mã, mô tả, chất liệu...) hoặc vị trí..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-4 py-2 border-slate-200 hover:border-slate-350 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-xs"
        />
      </div>

      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200/50 min-h-[300px] space-y-3">
        {locations.length > 0 ? (
          renderTreeNodes(null)
        ) : (
          <div className="text-center text-slate-400 py-12 font-medium">Chưa có dữ liệu vị trí nào được thiết lập.</div>
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
                <label className="block text-xs font-bold text-slate-655 mb-1.5">Tên {resolvedTypeLabel.toLowerCase()} *</label>
                <Input
                  required
                  placeholder={placeholderText}
                  value={newLocName}
                  onChange={(e) => setNewLocName(e.target.value)}
                  className="border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-655 mb-1.5">Mô tả chi tiết</label>
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
                <label className="block text-xs font-bold text-slate-655 mb-1.5">Mã vị trí (Code) *</label>
                <Input
                  required
                  placeholder="Ví dụ: B1_T1_P01"
                  value={editLocCode}
                  onChange={(e) => setEditLocCode(e.target.value)}
                  className="border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-655 mb-1.5">Tên vị trí *</label>
                <Input
                  required
                  placeholder="Ví dụ: Tòa nhà A, Phòng 101..."
                  value={editLocName}
                  onChange={(e) => setEditLocName(e.target.value)}
                  className="border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-655 mb-1.5">Mô tả chi tiết</label>
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
