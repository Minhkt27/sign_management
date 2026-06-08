import { useState, useMemo, useEffect } from 'react';
import { MapNode, MapFloor, MapFloorData, Location } from '@/shared/types';
import { mapService } from '@/services/mapService';
import { Search, Navigation, Accessibility, X, MapPin } from 'lucide-react';
import { getBackendUrl } from '@/shared/helpers/imageUrl';
import { displayName, floorName, buildSteps, turnDir } from '../utils/pathHelpers';

interface Props {
  fromNodeId: number | null;
  fromLabel: string;
  destNodeId?: number | null;
  floors: MapFloor[];
  locations: Location[];
  allFloorData: MapFloorData[];
  onGoToQR: () => void;
}

export function MapTab({ fromNodeId, fromLabel, destNodeId, floors, locations, allFloorData, onGoToQR }: Props) {
  const [destSearch, setDestSearch] = useState(() => {
    if (!destNodeId) return '';
    const node = allFloorData.flatMap(fd => fd.nodes).find(n => n.id === destNodeId);
    return node?.label ?? '';
  });
  const [toNodeId, setToNodeId] = useState<number | null>(destNodeId ?? null);
  const [avoidStairs, setAvoidStairs] = useState(false);
  const [activePath, setActivePath] = useState<MapNode[]>([]);
  const [activeFloorId, setActiveFloorId] = useState<number | null>(
    floors[0]?.id ?? null
  );
  const [searching, setSearching] = useState(false);
  const [noPath, setNoPath] = useState(false);

  useEffect(() => {
    if (destNodeId == null) return;
    setToNodeId(destNodeId);
    const node = allFloorData.flatMap(fd => fd.nodes).find(n => n.id === destNodeId);
    if (node) setDestSearch(displayName(node, locations) ?? node.label ?? '');
    setActivePath([]);
    setNoPath(false);
  }, [destNodeId, allFloorData, locations]);

  // Tự động tìm đường khi cả fromNodeId và destNodeId đều có
  useEffect(() => {
    if (fromNodeId && toNodeId && activePath.length === 0 && !noPath) {
      handleFindPath();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromNodeId, toNodeId]);

  const getFloorName = (floorId: number) => floorName(floorId, floors, locations);

  const destResults = useMemo(() => {
    if (!destSearch.trim() || toNodeId !== null) return [];
    const q = destSearch.toLowerCase();
    const DEST_TYPES = new Set(['ROOM', 'DEPARTMENT', 'ELEVATOR']);
    const seen = new Set<number>();
    return allFloorData.flatMap(fd =>
      fd.nodes
        .filter(n => DEST_TYPES.has(n.type))
        .filter(n => {
          const byLabel = n.label?.toLowerCase().includes(q);
          const byLoc = n.locationId
            ? locations.find(l => l.id === n.locationId)?.name.toLowerCase().includes(q)
            : false;
          return byLabel || byLoc;
        })
        .map(n => ({ node: n, floorData: fd }))
    ).filter(({ node }) => { if (seen.has(node.id)) return false; seen.add(node.id); return true; })
      .slice(0, 15);
  }, [destSearch, toNodeId, allFloorData, locations]);

  const handleSelectDest = (node: MapNode, fd: MapFloorData) => {
    setToNodeId(node.id);
    setDestSearch(displayName(node, locations) ?? '');
    setActivePath([]);
    setNoPath(false);
    setActiveFloorId(fd.floor.id);
  };

  const handleFindPath = async () => {
    if (!fromNodeId || !toNodeId) return;
    setSearching(true);
    setNoPath(false);
    try {
      const path = await mapService.findPath(fromNodeId, toNodeId, avoidStairs);
      setActivePath(path);
      if (path.length === 0) {
        setNoPath(true);
      } else {
        const firstFd = allFloorData.find(fd => fd.nodes.some(n => n.id === path[0].id));
        if (firstFd) setActiveFloorId(firstFd.floor.id);
      }
    } catch {
      setNoPath(true);
    } finally {
      setSearching(false);
    }
  };

  // Chỉ hiện node đáng chú ý: đầu, cuối, rẽ, cầu thang, thang máy
  const visibleNodeIds = useMemo(() => {
    const ids = new Set<number>();
    if (activePath.length === 0) {
      if (toNodeId !== null) ids.add(toNodeId);
      if (fromNodeId !== null) ids.add(fromNodeId);
      return ids;
    }
    ids.add(activePath[0].id);
    ids.add(activePath[activePath.length - 1].id);
    for (let i = 1; i < activePath.length - 1; i++) {
      const n = activePath[i];
      if (n.type === 'STAIRS' || n.type === 'ELEVATOR' || n.type === 'ENTRANCE') {
        ids.add(n.id); continue;
      }
      const turn = turnDir(activePath[i - 1], n, activePath[i + 1]);
      if (turn !== 'straight') ids.add(n.id);
    }
    return ids;
  }, [activePath, toNodeId, fromNodeId]);

  const currentFloorData = allFloorData.find(fd => fd.floor.id === activeFloorId);
  const floorIds = floors.map(f => f.id);

  return (
    <div className="space-y-4">
      {/* Find path form */}
      <div className="rounded-2xl bg-white border-2 border-green-100 shadow-lg shadow-green-900/5">
        <div className="px-4 pt-4 pb-3 space-y-3">
          {/* FROM */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-1 text-green-700">Từ</p>
            {fromNodeId ? (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-50 border-2 border-amber-500">
                <div className="w-2 h-2 rounded-full flex-shrink-0 bg-yellow-600" />
                <span className="flex-1 text-sm font-bold truncate text-amber-900">{fromLabel}</span>
              </div>
            ) : (
              <button onClick={onGoToQR}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-left bg-green-50 border-2 border-dashed border-green-200">
                <span className="text-sm text-green-700">📍 Chọn vị trí xuất phát...</span>
              </button>
            )}
          </div>

          {/* TO */}
          <div className="relative">
            <p className="text-xs font-bold uppercase tracking-widest mb-1 text-green-700">Đến</p>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-green-700" />
              <input
                value={destSearch}
                onChange={e => { setDestSearch(e.target.value); setToNodeId(null); setActivePath([]); setNoPath(false); }}
                placeholder="Tìm phòng, khoa..."
                className={`w-full pl-8 pr-8 py-2.5 rounded-xl text-sm outline-none border-2 transition-colors ${toNodeId
                    ? 'bg-green-50 border-green-500 text-green-900 font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-800 font-normal focus:border-green-400'
                  }`}
              />
              {(destSearch || toNodeId) && (
                <button className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  onClick={() => { setDestSearch(''); setToNodeId(null); setActivePath([]); }}>
                  <X size={14} />
                </button>
              )}
            </div>
            {destSearch.trim() && !toNodeId && destResults.length > 0 && (
              <div className="absolute z-50 left-0 right-0 bg-white rounded-xl shadow-2xl overflow-hidden mt-1 max-h-48 overflow-y-auto border border-green-100">
                {destResults.map(({ node, floorData: fd }) => (
                  <button key={node.id} onClick={() => handleSelectDest(node, fd)}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left hover:bg-green-50 border-b border-green-50 last:border-0 transition-colors">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0 bg-green-100">
                      {node.type === 'DEPARTMENT' ? '🏢' : node.type === 'ELEVATOR' ? '🛗' : '🚪'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate text-slate-800">{displayName(node, locations)}</p>
                      <p className="text-xs text-green-700">{getFloorName(fd.floor.id)}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer w-fit text-slate-800">
            <input type="checkbox" checked={avoidStairs} onChange={e => setAvoidStairs(e.target.checked)}
              className="rounded text-green-700 focus:ring-green-600" />
            <Accessibility size={14} className="text-green-800" />
            <span className="font-medium">Tránh cầu thang</span>
          </label>

          <button onClick={handleFindPath}
            disabled={!fromNodeId || !toNodeId || searching}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all active:scale-[.98] ${(!fromNodeId || !toNodeId)
                ? 'bg-slate-300 text-slate-100 cursor-not-allowed'
                : 'bg-green-800 text-white hover:bg-green-700 shadow-md shadow-green-900/20'
              }`}>
            <Navigation size={16} />
            {searching ? 'Đang tìm...' : 'Tìm đường'}
          </button>

          {!fromNodeId && (
            <p className="text-xs text-center -mt-1 text-green-700">
              Cần xác định vị trí của bạn trước — tab <strong>QR vị trí</strong>
            </p>
          )}
        </div>
      </div>

      {noPath && (
        <div className="text-sm px-4 py-3 rounded-xl bg-amber-50 border border-amber-500 text-amber-900 shadow-sm">
          ⚠️ Không tìm được đường. Thử bỏ "Tránh cầu thang".
        </div>
      )}

      {/* Path steps */}
      {activePath.length > 0 && (() => {
        const steps = buildSteps(activePath, allFloorData, locations, floors);
        return (
          <div className="rounded-2xl overflow-hidden bg-white border-2 border-green-100 shadow-lg shadow-green-900/5">
            <div className="flex items-center justify-between px-4 py-3 border-b border-green-100">
              <span className="text-sm font-extrabold text-slate-800">Chỉ đường</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                {steps.length} bước
              </span>
            </div>
            <ol className="divide-y divide-green-50">
              {steps.map((step, idx) => (
                <li key={step.node.id + '-' + idx} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-xl flex-shrink-0 w-7 text-center">{step.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold leading-snug ${step.highlight ? 'text-green-700' : 'text-slate-800'}`}>
                      {step.text}
                    </p>
                    {step.sub && (
                      <p className="text-xs mt-0.5 font-semibold text-green-700">{step.sub}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        );
      })()}

      {/* Floor map */}
      <div className="rounded-2xl overflow-hidden bg-white border-2 border-green-100 shadow-lg shadow-green-900/5">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-green-100">
          <div className="flex items-center gap-1.5">
            <MapPin size={13} className="text-green-800" />
            <span className="text-sm font-extrabold text-slate-800">
              {activeFloorId ? getFloorName(activeFloorId) : 'Sơ đồ'}
            </span>
          </div>
          {/* Floor tabs */}
          <div className="flex gap-1 flex-wrap justify-end">
            {floorIds.map(fid => (
              <button key={fid} onClick={() => setActiveFloorId(fid)}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${activeFloorId === fid
                    ? 'bg-green-800 text-white shadow-sm'
                    : 'bg-green-50 text-green-800 hover:bg-green-100'
                  }`}>
                {getFloorName(fid)}
              </button>
            ))}
          </div>
        </div>

        {currentFloorData ? (
          <div>
            <div className="relative bg-slate-50">
              <img src={getBackendUrl(currentFloorData.floor.imageUrl)} alt="Sơ đồ" className="w-full object-contain mix-blend-multiply" />
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <defs>
                  <style>{`.path-anim{animation:dash .7s linear infinite}@keyframes dash{to{stroke-dashoffset:-20}}`}</style>
                </defs>



                {/* Path segments drawn in correct travel direction */}
                {activePath.length > 1 && activePath.slice(0, -1).map((node, idx) => {
                  const next = activePath[idx + 1];
                  if (node.floorId !== activeFloorId || next.floorId !== activeFloorId) return null;
                  return (
                    <line key={`seg-${idx}`}
                      x1={`${node.x * 100}%`} y1={`${node.y * 100}%`}
                      x2={`${next.x * 100}%`} y2={`${next.y * 100}%`}
                      stroke="#3b82f6" strokeWidth={5}
                      strokeDasharray="12 8" strokeLinecap="round"
                      className="path-anim opacity-80"
                    />
                  );
                })}
              </svg>
              {/* Directional arrows on path segments */}
              {activePath.length > 1 && activePath.slice(0, -1).map((node, idx) => {
                const next = activePath[idx + 1];
                if (node.floorId !== activeFloorId || next.floorId !== activeFloorId) return null;
                const mx = (node.x + next.x) / 2;
                const my = (node.y + next.y) / 2;
                const angle = Math.atan2(next.y - node.y, next.x - node.x) * 180 / Math.PI;
                const seg = Math.hypot(next.x - node.x, next.y - node.y);
                if (seg < 0.03) return null; // quá gần, bỏ qua
                return (
                  <div key={`arrow-${idx}`}
                    className="absolute pointer-events-none flex items-center justify-center drop-shadow-md"
                    style={{
                      left: `${mx * 100}%`,
                      top: `${my * 100}%`,
                      transform: `translate(-50%, -50%) rotate(${angle}deg)`,
                      width: 12, height: 12,
                    }}>
                    <svg width="12" height="9" viewBox="0 0 20 14">
                      <polygon points="0,2 14,7 0,12" fill="#166534" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
                    </svg>
                  </div>
                );
              })}

              {currentFloorData.nodes.map(node => {
                const isStart = activePath[0]?.id === node.id;
                const isEnd = activePath[activePath.length - 1]?.id === node.id;
                const isVisible = visibleNodeIds.has(node.id);
                if (!isVisible) return null;
                const size = (isStart || isEnd) ? 8 : 4;
                return (
                  <div key={node.id}
                    className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full shadow-md border border-white"
                    style={{
                      left: `${node.x * 100}%`, top: `${node.y * 100}%`,
                      width: size, height: size,
                      background: isStart ? '#ca8a04' : isEnd ? '#166534' : '#3b82f6',
                    }}
                    title={node.label ?? node.type}
                  />
                );
              })}
            </div>
            {activePath.length > 0 && (
              <div className="flex items-center gap-4 px-4 py-2.5 border-t border-green-100 text-xs font-semibold text-green-700 bg-green-50/50">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full inline-block bg-yellow-600" /> Xuất phát</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full inline-block bg-green-800" /> Điểm đến</span>
                <span className="flex items-center gap-1.5"><span className="w-5 h-1 inline-block rounded bg-blue-500" /> Lộ trình</span>
              </div>
            )}
          </div>
        ) : (
          <div className="py-12 text-center text-sm text-slate-500 font-medium">Chưa có sơ đồ tầng này</div>
        )}
      </div>
    </div>
  );
}
