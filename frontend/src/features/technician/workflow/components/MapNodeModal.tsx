import { useQuery } from '@tanstack/react-query';
import { mapService } from '@/services/mapService';
import { MapNode, MapEdge } from '@/shared/types';
import { X, MapPin, AlertCircle } from 'lucide-react';

interface Props {
  assetId: string;
  assetCode: string;
  onClose: () => void;
}

export function MapNodeModal({ assetId, assetCode, onClose }: Props) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <MapPin size={18} className="text-blue-600" />
            Vị trí biển {assetCode} trên sơ đồ
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
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
            <div className="space-y-3">
              {node.label && (
                <p className="text-sm text-slate-600">
                  Vị trí: <span className="font-semibold text-slate-800">{node.label}</span>
                </p>
              )}

              <div className="relative rounded-xl overflow-hidden border border-slate-200">
                <img
                  src={floorData.floor.imageUrl}
                  alt="Sơ đồ tầng"
                  className="w-full object-contain"
                />

                {/* SVG edges */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  {floorData.edges.map((edge: MapEdge) => {
                    const from = floorData.nodes.find((n: MapNode) => n.id === edge.nodeFromId);
                    const to   = floorData.nodes.find((n: MapNode) => n.id === edge.nodeToId);
                    if (!from || !to) return null;
                    return (
                      <line
                        key={edge.id}
                        x1={`${from.x * 100}%`} y1={`${from.y * 100}%`}
                        x2={`${to.x * 100}%`}   y2={`${to.y * 100}%`}
                        stroke="#cbd5e1" strokeWidth={1} strokeDasharray="4 3"
                      />
                    );
                  })}
                </svg>

                {/* Highlight target node */}
                <div
                  className="absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-red-500 border-2 border-white shadow-lg flex items-center justify-center text-white text-sm font-bold animate-pulse"
                  style={{ left: `${node.x * 100}%`, top: `${node.y * 100}%` }}
                  title={assetCode}
                >
                  ★
                </div>

                {/* Other nodes (faint) */}
                {floorData.nodes
                  .filter((n: MapNode) => n.id !== node.id)
                  .map((n: MapNode) => (
                    <div
                      key={n.id}
                      className="absolute -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-slate-400 border border-white opacity-50"
                      style={{ left: `${n.x * 100}%`, top: `${n.y * 100}%` }}
                    />
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
