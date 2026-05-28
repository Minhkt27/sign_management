import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { mapService } from '@/services/mapService';
import { MapFloorData, MapNode } from '@/shared/types';
import { Search, Navigation, AlertCircle, Accessibility } from 'lucide-react';

export default function WayfindingPage() {
  const [searchParams] = useSearchParams();

  const [search, setSearch]             = useState('');
  const [fromNodeId, setFromNodeId]     = useState<number | null>(
    searchParams.get('from') ? Number(searchParams.get('from')) : null
  );
  const [toNodeId, setToNodeId]         = useState<number | null>(null);
  const [avoidStairs, setAvoidStairs]   = useState(false);
  const [activePath, setActivePath]     = useState<MapNode[]>([]);
  const [activeFloorId, setActiveFloorId] = useState<number | null>(null);

  const { data: floors = [] } = useQuery({
    queryKey: ['mapFloors'],
    queryFn: mapService.getAllFloors,
  });

  const floorDataQueries = useQuery({
    queryKey: ['mapAllFloorData', floors.map(f => f.id)],
    queryFn: async () => {
      const results = await Promise.all(floors.map(f => mapService.getFloorData(f.id)));
      return results;
    },
    enabled: floors.length > 0,
  });

  const allFloorData: MapFloorData[] = floorDataQueries.data ?? [];

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return allFloorData.flatMap(fd =>
      fd.nodes
        .filter(n => n.label && n.label.toLowerCase().includes(q) && (n.locationId !== undefined || n.type === 'ROOM'))
        .map(n => ({ node: n, floorData: fd }))
    ).slice(0, 10);
  }, [search, allFloorData]);

  const handleSelectDestination = (node: MapNode, fd: MapFloorData) => {
    setToNodeId(node.id);
    setActiveFloorId(fd.floor.id);
    setSearch(node.label ?? '');
    setActivePath([]);
  };

  const handleFindPath = async () => {
    if (fromNodeId === null || toNodeId === null) return;
    try {
      const path = await mapService.findPath(fromNodeId, toNodeId, avoidStairs);
      setActivePath(path);
      if (path.length > 0) {
        const firstNode = path[0];
        const fd = allFloorData.find(fd => fd.nodes.some(n => n.id === firstNode.id));
        if (fd) setActiveFloorId(fd.floor.id);
      }
    } catch {
      alert('Không tìm được đường đi. Vui lòng thử lại.');
    }
  };

  const currentFloorData = allFloorData.find(fd => fd.floor.id === activeFloorId);
  const pathNodeIds = new Set(activePath.map(n => n.id));

  const pathByFloor = useMemo(() => {
    const map = new Map<number, MapNode[]>();
    activePath.forEach(node => {
      const fd = allFloorData.find(fd => fd.nodes.some(n => n.id === node.id));
      if (!fd) return;
      const existing = map.get(fd.floor.id) ?? [];
      map.set(fd.floor.id, [...existing, node]);
    });
    return map;
  }, [activePath, allFloorData]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl font-bold text-blue-700">Tìm đường trong bệnh viện</h1>
          <p className="text-slate-500 text-sm mt-0.5">Tra cứu phòng khám, khoa, khu vực</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {/* Search panel */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="space-y-3">
            {/* Destination search */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setToNodeId(null); setActivePath([]); }}
                placeholder="Tìm phòng khám, khoa, khu vực..."
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Search results dropdown */}
            {search.trim() && toNodeId === null && searchResults.length > 0 && (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                {searchResults.map(({ node, floorData: fd }) => (
                  <button
                    key={node.id}
                    onClick={() => handleSelectDestination(node, fd)}
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-slate-100 last:border-0 text-sm"
                  >
                    <span className="font-medium text-slate-800">{node.label}</span>
                    <span className="text-slate-400 ml-2 text-xs">
                      {fd.floor.id && floors.find(f => f.id === fd.floor.id) ? '' : ''}
                      Tầng {fd.floor.locationId}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {search.trim() && toNodeId === null && searchResults.length === 0 && (
              <p className="text-sm text-slate-400 px-1">Không tìm thấy "{search}"</p>
            )}
          </div>

          {/* Options */}
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer w-fit">
            <input
              type="checkbox"
              checked={avoidStairs}
              onChange={e => setAvoidStairs(e.target.checked)}
              className="rounded"
            />
            <Accessibility size={16} className="text-blue-500" />
            Tránh cầu thang (dùng thang máy)
          </label>

          <button
            onClick={handleFindPath}
            disabled={toNodeId === null}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 rounded-xl text-sm"
          >
            <Navigation size={18} /> Tìm đường
          </button>
        </div>

        {/* Path result */}
        {activePath.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <h2 className="font-semibold text-slate-700">Tuyến đường ({activePath.length} điểm)</h2>

            {/* Step list */}
            <ol className="space-y-2">
              {activePath.map((node, idx) => (
                <li key={node.id} className="flex items-start gap-3 text-sm">
                  <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                    idx === 0 ? 'bg-emerald-500' : idx === activePath.length - 1 ? 'bg-blue-600' : 'bg-slate-400'
                  }`}>
                    {idx + 1}
                  </span>
                  <span className={idx === activePath.length - 1 ? 'font-semibold text-blue-700' : 'text-slate-700'}>
                    {node.label ?? node.type}
                    {node.type === 'STAIRS'   && <span className="ml-1.5 text-xs text-orange-500">(cầu thang)</span>}
                    {node.type === 'ELEVATOR' && <span className="ml-1.5 text-xs text-purple-500">(thang máy)</span>}
                  </span>
                </li>
              ))}
            </ol>

            {/* Floor tabs */}
            {pathByFloor.size > 1 && (
              <div className="flex gap-2 flex-wrap pt-2">
                {Array.from(pathByFloor.keys()).map(fid => (
                  <button
                    key={fid}
                    onClick={() => setActiveFloorId(fid)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      activeFloorId === fid
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-slate-300 text-slate-600 hover:border-blue-400'
                    }`}
                  >
                    Tầng {fid}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {activePath.length === 0 && toNodeId !== null && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-sm px-4 py-3 rounded-xl">
            <AlertCircle size={16} /> Không tìm được đường đi. Thử bỏ chọn "Tránh cầu thang".
          </div>
        )}

        {/* Map display */}
        {currentFloorData && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-sm font-medium text-slate-700">Sơ đồ tầng</p>
            </div>
            <div className="relative">
              <img
                src={currentFloorData.floor.imageUrl}
                alt="Sơ đồ"
                className="w-full object-contain"
              />

              {/* SVG overlay for path edges */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {currentFloorData.edges.map(edge => {
                  const from = currentFloorData.nodes.find(n => n.id === edge.nodeFromId);
                  const to   = currentFloorData.nodes.find(n => n.id === edge.nodeToId);
                  if (!from || !to) return null;
                  const onPath = pathNodeIds.has(from.id) && pathNodeIds.has(to.id);
                  return (
                    <line
                      key={edge.id}
                      x1={`${from.x * 100}%`} y1={`${from.y * 100}%`}
                      x2={`${to.x * 100}%`}   y2={`${to.y * 100}%`}
                      stroke={onPath ? '#3b82f6' : '#cbd5e1'}
                      strokeWidth={onPath ? 3 : 1}
                      strokeDasharray={onPath ? undefined : '4 3'}
                    />
                  );
                })}
              </svg>

              {/* Nodes */}
              {currentFloorData.nodes.map(node => {
                const onPath = pathNodeIds.has(node.id);
                const isStart = activePath[0]?.id === node.id;
                const isEnd   = activePath[activePath.length - 1]?.id === node.id;
                if (!onPath && activePath.length > 0) return null;
                return (
                  <div
                    key={node.id}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shadow
                      ${isStart ? 'bg-emerald-500 scale-125' : isEnd ? 'bg-blue-600 scale-125' : 'bg-blue-400'}
                    `}
                    style={{ left: `${node.x * 100}%`, top: `${node.y * 100}%` }}
                    title={node.label ?? node.type}
                  >
                    {isStart ? '▶' : isEnd ? '★' : '●'}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
