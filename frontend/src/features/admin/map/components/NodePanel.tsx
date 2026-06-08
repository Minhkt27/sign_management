import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapNode, NodeType, Location, Asset } from '@/shared/types';
import { X, Trash2, Tag, Search, MapPin, ExternalLink } from 'lucide-react';
import { NODE_TYPE_OPTIONS } from '../constants';

interface Props {
  node: MapNode | null;
  locations: Location[];
  assets: Asset[];
  onUpdate: (id: number, data: Partial<MapNode>) => void;
  onDelete: (id: number) => void;
  onClose: () => void;
}

const LOCATION_TYPES: Partial<Record<NodeType, 'DEPARTMENT' | 'ROOM'>> = {
  DEPARTMENT: 'DEPARTMENT',
  ROOM: 'ROOM',
};

function buildPath(loc: Location, allLocations: Location[]): string {
  const parts: string[] = [loc.name];
  let current = loc;
  while (current.parentId) {
    const parent = allLocations.find(l => l.id === current.parentId);
    if (!parent) break;
    parts.unshift(parent.name);
    current = parent;
  }
  return parts.join(' / ');
}

export function NodePanel({ node, locations, assets, onUpdate, onDelete, onClose }: Props) {
  const navigate = useNavigate();
  const [label, setLabel]               = useState('');
  const [type, setType]                 = useState<NodeType>('JUNCTION');
  const [locationId, setLocationId]     = useState<string>('');
  const [locSearch, setLocSearch]       = useState('');
  const [locDropdownOpen, setLocDropdownOpen] = useState(false);
  const [assetId, setAssetId]           = useState<string>('');
  const [assetSearch, setAssetSearch]   = useState('');
  const [assetDropdownOpen, setAssetDropdownOpen] = useState(false);

  useEffect(() => {
    if (node) {
      setLabel(node.label ?? '');
      setType(node.type);
      setLocationId(node.locationId?.toString() ?? '');
      setAssetId(node.assetId ?? '');
      setLocSearch('');
      setAssetSearch('');
      setLocDropdownOpen(false);
      setAssetDropdownOpen(false);
    }
  }, [node?.id]);

  if (!node) return null;

  const locationType = LOCATION_TYPES[type];

  const handleTypeChange = (newType: NodeType) => {
    setType(newType);
    if (!LOCATION_TYPES[newType]) { setLocationId(''); setLocSearch(''); }
  };

  // Location search — filter by type + search term, show full path
  const filteredLocations = locSearch.trim()
    ? locations
        .filter(l => l.type === locationType)
        .filter(l => {
          const path = buildPath(l, locations).toLowerCase();
          return path.includes(locSearch.toLowerCase());
        })
        .slice(0, 15)
    : [];

  const linkedLocation = locationId
    ? locations.find(l => l.id === Number(locationId))
    : undefined;

  const handleSelectLocation = (loc: Location) => {
    setLocationId(loc.id.toString());
    setLocSearch('');
    setLocDropdownOpen(false);
  };

  // Asset search
  const filteredAssets = assetSearch.trim()
    ? assets.filter(a =>
        a.assetCode.toLowerCase().includes(assetSearch.toLowerCase()) ||
        (a.name ?? '').toLowerCase().includes(assetSearch.toLowerCase())
      ).slice(0, 20)
    : [];

  const linkedAsset = assets.find(a => a.id === assetId);

  const handleSelectAsset = (asset: Asset) => {
    setAssetId(asset.id);
    setAssetSearch('');
    setAssetDropdownOpen(false);
  };

  const handleSave = () => {
    onUpdate(node.id, {
      label: label || undefined,
      type,
      locationId: locationId ? Number(locationId) : undefined,
      assetId: assetId || undefined,
    });
  };

  return (
    <div className="w-64 flex-shrink-0 bg-white border-l border-slate-200 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
        <span className="font-semibold text-slate-700 text-sm">Thuộc tính node</span>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 p-4 space-y-4 overflow-y-auto">

        {/* Label */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Tên hiển thị</label>
          <input
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="Phòng 101, Sảnh chờ..."
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Type */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Loại</label>
          <select
            value={type}
            onChange={e => handleTypeChange(e.target.value as NodeType)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {NODE_TYPE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Location search (chỉ cho ROOM / DEPARTMENT) */}
        {locationType && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Gắn với {locationType === 'DEPARTMENT' ? 'Khoa' : 'Phòng'}
              <span className="text-slate-400 ml-1">(cho bệnh nhân tìm)</span>
            </label>

            {linkedLocation ? (
              <div className="flex items-center gap-2 border border-blue-200 bg-blue-50 rounded-lg px-3 py-2">
                <MapPin size={13} className="text-blue-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-700 truncate">{linkedLocation.name}</p>
                  <p className="text-xs text-slate-400 truncate">{buildPath(linkedLocation, locations)}</p>
                </div>
                <button
                  onClick={() => setLocationId('')}
                  className="text-slate-400 hover:text-red-500 shrink-0"
                >
                  <X size={13} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={locSearch}
                  onChange={e => { setLocSearch(e.target.value); setLocDropdownOpen(true); }}
                  onFocus={() => setLocDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setLocDropdownOpen(false), 150)}
                  placeholder={`Tìm ${locationType === 'DEPARTMENT' ? 'khoa' : 'phòng'}...`}
                  className="w-full border border-slate-300 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {locDropdownOpen && filteredLocations.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-44 overflow-y-auto">
                    {filteredLocations.map(loc => (
                      <button
                        key={loc.id}
                        onMouseDown={() => handleSelectLocation(loc)}
                        className="w-full text-left px-3 py-2 hover:bg-blue-50 flex flex-col gap-0.5"
                      >
                        <span className="text-xs font-semibold text-slate-700">{loc.name}</span>
                        <span className="text-xs text-slate-400 truncate">{buildPath(loc, locations)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Asset linking */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Gắn với Biển <span className="text-slate-400">(cho KTV tìm)</span>
          </label>

          {linkedAsset ? (
            <div className="flex items-center gap-2 border border-emerald-200 bg-emerald-50 rounded-lg px-3 py-2">
              <Tag size={13} className="text-emerald-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-700">{linkedAsset.assetCode}</p>
                {linkedAsset.name && (
                  <p className="text-xs text-slate-500 truncate">{linkedAsset.name}</p>
                )}
              </div>
              <button
                onClick={() => navigate(`/admin/assets/${linkedAsset.id}`)}
                className="text-slate-400 hover:text-blue-500 shrink-0"
                title="Xem chi tiết biển"
              >
                <ExternalLink size={13} />
              </button>
              <button onClick={() => setAssetId('')} className="text-slate-400 hover:text-red-500 shrink-0">
                <X size={13} />
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={assetSearch}
                onChange={e => { setAssetSearch(e.target.value); setAssetDropdownOpen(true); }}
                onFocus={() => setAssetDropdownOpen(true)}
                onBlur={() => setTimeout(() => setAssetDropdownOpen(false), 150)}
                placeholder="Tìm mã hoặc tên biển..."
                className="w-full border border-slate-300 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {assetDropdownOpen && filteredAssets.length > 0 && (
                <div className="absolute z-10 w-full bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">
                  {filteredAssets.map(asset => (
                    <button
                      key={asset.id}
                      onMouseDown={() => handleSelectAsset(asset)}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center gap-2"
                    >
                      <Tag size={12} className="text-emerald-500 shrink-0" />
                      <span className="text-xs font-bold text-slate-700">{asset.assetCode}</span>
                      {asset.name && (
                        <span className="text-xs text-slate-500 truncate">{asset.name}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="text-xs text-slate-400 space-y-1">
          <div>ID: {node.id}</div>
          <div>x: {node.x?.toFixed(3)}, y: {node.y?.toFixed(3)}</div>
        </div>
      </div>

      <div className="p-4 border-t border-slate-200 space-y-2">
        <button
          onClick={handleSave}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-lg"
        >
          Lưu
        </button>
        <button
          onClick={() => onDelete(node.id)}
          className="w-full flex items-center justify-center gap-1.5 border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium py-2 rounded-lg"
        >
          <Trash2 size={14} /> Xóa node
        </button>
      </div>
    </div>
  );
}
