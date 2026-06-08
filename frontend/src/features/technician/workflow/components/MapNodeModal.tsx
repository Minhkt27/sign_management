import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { mapService } from '@/services/mapService';
import { assetService } from '@/services/assetService';
import { MapNode, MapEdge, Asset } from '@/shared/types';
import { X, MapPin, AlertCircle, Navigation } from 'lucide-react';
import { getBackendUrl } from '@/shared/helpers/imageUrl';

interface Props {
  assetId: string;
  assetCode: string;
  onClose: () => void;
}

export function MapNodeModal({ assetId, assetCode, onClose }: Props) {
  const [fromNodeId, setFromNodeId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const { data: node, isLoading, isError } = useQuery({
    queryKey: ['mapNodeByAsset', assetId],
    queryFn: () => mapService.getNodeByAsset(assetId),
    retry: false,
  });

  const { data: floorData } = useQuery({
    queryKey: ['mapFloor', node?.floorId],
    queryFn: () => mapService.getFloorData(node!.floorId),
    enabled: !!node?.floorId,
  });

  const { data: pathNodes = [] } = useQuery({
    queryKey: ['path', fromNodeId, node?.id],
    queryFn: () => mapService.findPath(fromNodeId!, node!.id),
    enabled: !!fromNodeId && !!node,
    retry: false,
  });

  const pathNodeIds = new Set(pathNodes.map((n: MapNode) => n.id));

  const { data: assets = [] } = useQuery<Asset[]>({
    queryKey: ['assets'],
    queryFn: assetService.getAllAssets,
  });

  // Nodes on the same floor with a label or linked asset (usable as "I am here" points)
  const startableNodes = floorData?.nodes.filter(
    (n: MapNode) => n.id !== node?.id && (!!n.label || !!n.assetId)
  ) ?? [];

  const filteredStartableNodes = startableNodes.filter((n: MapNode) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    
    const linkedAsset = n.assetId ? assets.find(a => a.id === n.assetId) : null;
    const labelMatch = n.label?.toLowerCase().includes(q) ?? false;
    const assetMatch = linkedAsset ? linkedAsset.assetCode.toLowerCase().includes(q) : false;
    
    return labelMatch || assetMatch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <MapPin size={18} className="text-blue-600" />
            Vị trí biển {assetCode} trên sơ đồ
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {isLoading && (
            <p className="text-center text-slate-500 py-8">Đang tải...</p>
          )}

          {isError && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-sm px-4 py-3 rounded-xl">
              <AlertCircle size={16} />
              Biển này chưa được gắn vào sơ đồ. Liên hệ admin để cập nhật.
            </div>
          )}

          {node && floorData && (
            <>
              {/* Map */}
              <div className="relative rounded-xl overflow-hidden border border-slate-200">
                <img
                  src={getBackendUrl(floorData.floor.imageUrl)}
                  alt="Sơ đồ tầng"
                  className="w-full object-contain"
                />

                {/* SVG edges */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  {floorData.edges
                    .filter((edge: MapEdge) => {
                      if (!fromNodeId) return false;
                      return pathNodeIds.has(edge.nodeFromId) && pathNodeIds.has(edge.nodeToId);
                    })
                    .map((edge: MapEdge) => {
                      const from = floorData.nodes.find((n: MapNode) => n.id === edge.nodeFromId);
                      const to = floorData.nodes.find((n: MapNode) => n.id === edge.nodeToId);
                      if (!from || !to) return null;
                      return (
                        <line
                          key={edge.id}
                          x1={`${from.x * 100}%`} y1={`${from.y * 100}%`}
                          x2={`${to.x * 100}%`} y2={`${to.y * 100}%`}
                          stroke="#3b82f6"
                          strokeWidth={2}
                        />
                      );
                    })}
                </svg>

                {/* Other nodes */}
                {floorData.nodes
                  .filter((n: MapNode) => n.id !== node.id)
                  .filter((n: MapNode) => {
                    if (!fromNodeId) return false;
                    return n.id === fromNodeId || pathNodeIds.has(n.id);
                  })
                  .map((n: MapNode) => {
                    const isFrom = n.id === fromNodeId;
                    return (
                      <div
                        key={n.id}
                        className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-white shadow-md"
                        style={{
                          left: `${n.x * 100}%`,
                          top: `${n.y * 100}%`,
                          width: isFrom ? 8 : 4,
                          height: isFrom ? 8 : 4,
                          backgroundColor: isFrom ? '#22c55e' : '#60a5fa',
                        }}
                        title={n.label ?? n.type}
                      />
                    );
                  })}

                {/* Target node (asset) */}
                <div
                  className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500 border border-white shadow-lg flex items-center justify-center animate-pulse"
                  style={{ left: `${node.x * 100}%`, top: `${node.y * 100}%`, width: 8, height: 8 }}
                  title={assetCode}
                />
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Biển cần đến</span>
                {fromNodeId && <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Vị trí của bạn</span>}
                {pathNodeIds.size > 0 && <span className="flex items-center gap-1.5"><span className="w-6 h-0.5 bg-blue-500 inline-block" /> Lộ trình</span>}
              </div>

              {/* Wayfinding — from picker */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-2 bg-slate-50">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Navigation size={15} className="text-blue-600" />
                  Tìm đường đến đây
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => {
                      setSearchQuery(e.target.value);
                      if (fromNodeId) setFromNodeId(null);
                    }}
                    onFocus={() => setDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setDropdownOpen(false), 200)}
                    placeholder="Tìm tên phòng, mã biển... (Ví dụ: L)"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setFromNodeId(null);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                  {dropdownOpen && filteredStartableNodes.length > 0 && (
                    <div className="absolute z-10 w-full bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">
                      {filteredStartableNodes.map((n: MapNode) => {
                        const linkedAsset = n.assetId ? assets.find(a => a.id === n.assetId) : null;
                        const displayLabel = linkedAsset ? `Biển báo: ${linkedAsset.assetCode}` : n.label;
                        return (
                          <button
                            key={n.id}
                            type="button"
                            onMouseDown={() => {
                              setFromNodeId(n.id);
                              setSearchQuery(displayLabel ?? '');
                              setDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-blue-50 text-xs font-semibold text-slate-700 border-b border-slate-100 last:border-0"
                          >
                            {displayLabel}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                {fromNodeId && pathNodes.length === 0 && (
                  <p className="text-xs text-amber-600">Không tìm thấy đường đi. Hai điểm có thể chưa được nối.</p>
                )}
                {fromNodeId && pathNodes.length > 0 && (
                  <p className="text-xs text-blue-600 font-medium">Lộ trình qua {pathNodes.length} điểm — xem trên sơ đồ bên trên.</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
