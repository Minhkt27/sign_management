import { useState, useMemo, useEffect, useRef, lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapNode, MapFloor, MapFloorData, Location, WayfindingResult } from '@/shared/types';
import { mapService } from '@/services/mapService';
import { Search, Navigation, Accessibility, X, MapPin, Camera } from 'lucide-react';
import { getBackendUrl } from '@/shared/helpers/imageUrl';
import { displayName, floorName, buildSteps, normalize } from '../utils/pathHelpers';
import { turnDir } from '../utils/pathHelpers';
import { SafeImage } from '@/components/SafeImage';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';

const QRScannerModal = lazy(() =>
  import('./QRScannerModal').then(mod => ({ default: mod.QRScannerModal }))
);

interface Props {
  fromNodeId: number | null;
  fromLabel: string;
  destNodeId?: number | null;
  floors: MapFloor[];
  locations: Location[];
  allFloorData: MapFloorData[];
  onGoToQR: () => void;
  onSetLocation: (node: MapNode, label: string) => void;
}

export function MapTab({ fromNodeId, fromLabel, destNodeId, floors, locations, allFloorData, onGoToQR, onSetLocation }: Props) {
  const [destSearch, setDestSearch] = useState(() => {
    if (!destNodeId) return '';
    const node = allFloorData.flatMap(fd => fd?.nodes || []).find(n => n?.id === destNodeId);
    return node?.label ?? '';
  });
  const [toNodeId, setToNodeId] = useState<number | null>(destNodeId ?? null);
  const [avoidStairs, setAvoidStairs] = useState(false);
  const [activeResult, setActiveResult] = useState<WayfindingResult | null>(null);
  const [activeFloorId, setActiveFloorId] = useState<number | 'campus' | null>(floors[0]?.id ?? null);
  const [searching, setSearching] = useState(false);
  const [noPath, setNoPath] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const isFirstMount = useRef(true);

  // Derived from result
  const allIndoorNodes = activeResult?.segments.filter(s => s.type === 'INDOOR').flatMap(s => s.nodes) ?? [];
  const outdoorNodes = activeResult?.segments.find(s => s.type === 'OUTDOOR')?.nodes ?? [];
  const hasOutdoor = outdoorNodes.length > 0;

  const { data: campusMapData } = useQuery({
    queryKey: ['campusMap'],
    queryFn: mapService.getCampusMap,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (isFirstMount.current) { isFirstMount.current = false; return; }
    if (toNodeId !== null) localStorage.setItem('wayfinding_dest', toNodeId.toString());
    else localStorage.removeItem('wayfinding_dest');
  }, [toNodeId]);

  useEffect(() => {
    if (destNodeId == null) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToNodeId(destNodeId);
    const fd = allFloorData.find(f => f?.nodes?.some(n => n?.id === destNodeId));
    if (fd) {
      const node = fd.nodes.find(n => n?.id === destNodeId)!;
      setDestSearch(displayName(node, locations) ?? node?.label ?? '');
      setActiveFloorId(fd.floor?.id);
    }
  }, [destNodeId, allFloorData, locations]);

  const getFloorName = (floorId: number) => floorName(floorId, floors, locations);

  const destResults = useMemo(() => {
    if (!destSearch.trim() || toNodeId !== null) return [];
    const q = normalize(destSearch);
    const DEST_TYPES = new Set(['ROOM', 'DEPARTMENT', 'ELEVATOR']);
    const seen = new Set<number>();
    return allFloorData.flatMap(fd =>
      (fd?.nodes || [])
        .filter(n => n && DEST_TYPES.has(n.type))
        .filter(n => {
          const byLabel = n.label ? normalize(n.label).includes(q) : false;
          const byLoc = n.locationId ? normalize(locations.find(l => l?.id === n.locationId)?.name ?? '').includes(q) : false;
          return byLabel || byLoc;
        })
        .map(n => ({ node: n, floorData: fd }))
    ).filter(({ node }) => { if (seen.has(node?.id)) return false; seen.add(node?.id); return true; }).slice(0, 15);
  }, [destSearch, toNodeId, allFloorData, locations]);

  const handleSelectDest = (node: MapNode, fd: MapFloorData) => {
    if (!node || !fd) return;
    setToNodeId(node.id);
    setDestSearch(displayName(node, locations) ?? '');
    setActiveResult(null);
    setNoPath(false);
    setActiveFloorId(fd.floor?.id);
  };

  const handleFindPath = async (startId?: number, endId?: number) => {
    const finalStartId = startId ?? fromNodeId;
    const finalEndId = endId ?? toNodeId;
    if (!finalStartId || !finalEndId) return;
    setSearching(true);
    setNoPath(false);
    setActiveResult(null);
    try {
      const result = await mapService.findPathWithSegments(finalStartId, finalEndId, avoidStairs);
      const allNodes = result.segments.flatMap(s => s.nodes);
      if (!allNodes.length) {
        setNoPath(true);
      } else {
        setActiveResult(result);
        const firstIndoor = result.segments.find(s => s.type === 'INDOOR');
        if (firstIndoor?.nodes[0]) {
          const fd = allFloorData.find(fd => fd?.nodes?.some(n => n.id === firstIndoor.nodes[0].id));
          if (fd) setActiveFloorId(fd.floor.id);
        }
      }
    } catch {
      setNoPath(true);
    } finally {
      setSearching(false);
    }
  };

  const visibleNodeIds = useMemo(() => {
    const ids = new Set<number>();
    if (!allIndoorNodes.length) {
      if (toNodeId !== null) ids.add(toNodeId);
      if (fromNodeId !== null) ids.add(fromNodeId);
      return ids;
    }
    ids.add(allIndoorNodes[0].id);
    ids.add(allIndoorNodes[allIndoorNodes.length - 1].id);
    for (let i = 1; i < allIndoorNodes.length - 1; i++) {
      const n = allIndoorNodes[i];
      if (!n) continue;
      if (n.type === 'STAIRS' || n.type === 'ELEVATOR' || n.type === 'ENTRANCE') { ids.add(n.id); continue; }
      const turn = turnDir(allIndoorNodes[i - 1], n, allIndoorNodes[i + 1]);
      if (turn !== 'straight') ids.add(n.id);
    }
    return ids;
  }, [allIndoorNodes, toNodeId, fromNodeId]);

  const campusVisibleNodeIds = useMemo(() => {
    const ids = new Set<number>();
    if (!outdoorNodes.length) return ids;
    ids.add(outdoorNodes[0].id);
    ids.add(outdoorNodes[outdoorNodes.length - 1].id);
    return ids;
  }, [outdoorNodes]);

  const currentFloorData = typeof activeFloorId === 'number'
    ? allFloorData.find(fd => fd?.floor?.id === activeFloorId)
    : null;

  // Group floors by building for the tab bar
  const floorsByBuilding = useMemo(() => {
    const buildings = locations.filter(l => l.type === 'BUILDING');
    return buildings.map(building => {
      const buildingFloors = floors.filter(f => {
        if (!f.locationId) return false;
        const floorLoc = locations.find(l => l.id === f.locationId);
        return floorLoc?.parentId === building.id;
      });
      return { building, floors: buildingFloors };
    }).filter(g => g.floors.length > 0);
  }, [locations, floors]);

  // Which building is currently active (derived from activeFloorId)
  const activeBuilding = useMemo(() => {
    if (!activeFloorId || activeFloorId === 'campus') return null;
    for (const g of floorsByBuilding) {
      if (g.floors.some(f => f.id === activeFloorId)) return g.building;
    }
    return null;
  }, [activeFloorId, floorsByBuilding]);

  const renderMapCanvas = (
    floorData: MapFloorData,
    pathNodes: MapNode[],
    visibleIds: Set<number>,
    pathColor: string,
  ) => (
    <div>
      <div className="relative bg-slate-50 border-y border-slate-200 overflow-hidden">
        <TransformWrapper initialScale={1} minScale={0.5} maxScale={5} centerOnInit wheel={{ step: 0.1 }} pinch={{ step: 5 }}>
          {({ zoomIn, zoomOut, resetTransform }) => (
            <>
              <div className="absolute top-3 right-3 z-20 flex flex-col gap-2 drop-shadow-md">
                <button onClick={() => zoomIn()} className="w-9 h-9 bg-white text-slate-700 hover:text-green-700 rounded-xl flex items-center justify-center shadow-sm"><ZoomIn size={18} /></button>
                <button onClick={() => zoomOut()} className="w-9 h-9 bg-white text-slate-700 hover:text-green-700 rounded-xl flex items-center justify-center shadow-sm"><ZoomOut size={18} /></button>
                <button onClick={() => resetTransform()} className="w-9 h-9 bg-white text-slate-700 hover:text-green-700 rounded-xl flex items-center justify-center shadow-sm"><Maximize size={18} /></button>
              </div>
              <TransformComponent wrapperStyle={{ width: '100%', willChange: 'auto' }} contentStyle={{ width: '100%', willChange: 'auto' }}>
                <div className="relative w-full transition-transform duration-75" style={{ willChange: 'auto' }}>
                  <SafeImage src={getBackendUrl(floorData.floor.imageUrl)} alt="Sơ đồ" className="w-full h-auto mix-blend-multiply pointer-events-none" style={{ willChange: 'auto' }} />
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="xMidYMid meet">
                    {pathNodes.length > 1 && pathNodes.slice(0, -1).map((node, idx) => {
                      const next = pathNodes[idx + 1];
                      if (node.floorId !== floorData.floor.id || next.floorId !== floorData.floor.id) return null;
                      return (
                        <line key={`seg-${idx}`}
                          x1={`${node.x * 100}%`} y1={`${node.y * 100}%`}
                          x2={`${next.x * 100}%`} y2={`${next.y * 100}%`}
                          stroke={pathColor} strokeWidth={3} strokeLinecap="round" className="opacity-80"
                        />
                      );
                    })}
                  </svg>
                  {pathNodes.length > 1 && pathNodes.slice(0, -1).map((node, idx) => {
                    const next = pathNodes[idx + 1];
                    if (node.floorId !== floorData.floor.id || next.floorId !== floorData.floor.id) return null;
                    const mx = (node.x + next.x) / 2;
                    const my = (node.y + next.y) / 2;
                    const angle = Math.atan2(next.y - node.y, next.x - node.x) * 180 / Math.PI;
                    if (Math.hypot(next.x - node.x, next.y - node.y) < 0.03) return null;
                    return (
                      <div key={`arrow-${idx}`} className="absolute pointer-events-none flex items-center justify-center drop-shadow-md"
                        style={{ left: `${mx * 100}%`, top: `${my * 100}%`, transform: `translate(-50%,-50%) rotate(${angle}deg)`, width: 12, height: 12 }}>
                        <svg width="12" height="9" viewBox="0 0 20 14">
                          <polygon points="0,2 14,7 0,12" fill="#166534" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
                        </svg>
                      </div>
                    );
                  })}
                  {floorData.nodes.map(node => {
                    const isStart = pathNodes.length > 0 ? pathNodes[0]?.id === node.id : node.id === fromNodeId;
                    const isEnd = pathNodes.length > 0 ? pathNodes[pathNodes.length - 1]?.id === node.id : node.id === toNodeId;
                    if (!visibleIds.has(node.id)) return null;
                    const size = (isStart || isEnd) ? 8 : 5;
                    return (
                      <div key={node.id} className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
                        style={{ left: `${node.x * 100}%`, top: `${node.y * 100}%`, width: size, height: size }}
                        title={node.label ?? node.type}>
                        {isEnd && <span className="absolute inline-flex h-[200%] w-[200%] rounded-full bg-green-500 opacity-40" />}
                        <span className="relative inline-flex rounded-full shadow-sm border border-white w-full h-full"
                          style={{ background: isStart ? '#ca8a04' : isEnd ? '#166534' : pathColor }} />
                      </div>
                    );
                  })}
                </div>
              </TransformComponent>
            </>
          )}
        </TransformWrapper>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Find path form */}
      <div className="rounded-2xl bg-white border-2 border-green-100 shadow-lg shadow-green-900/5">
        <div className="px-4 pt-4 pb-3 space-y-3">
          {/* FROM */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-1 text-green-700">Từ</p>
            {fromNodeId ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-50 border-2 border-amber-500 overflow-hidden">
                  <div className="w-2 h-2 rounded-full flex-shrink-0 bg-yellow-600" />
                  <span className="flex-1 text-sm font-bold truncate text-amber-900">{fromLabel}</span>
                </div>
                <button onClick={() => setIsScannerOpen(true)} className="w-[44px] h-[44px] flex-shrink-0 rounded-xl bg-green-50 text-green-700 flex items-center justify-center border-2 border-green-200 hover:bg-green-100 transition-colors">
                  <Camera className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={onGoToQR} className="flex-1 w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-left bg-green-50 border-2 border-dashed border-green-200">
                  <span className="text-sm text-green-700">📍 Chọn vị trí xuất phát...</span>
                </button>
                <button onClick={() => setIsScannerOpen(true)} className="w-[44px] h-[44px] flex-shrink-0 rounded-xl bg-green-50 text-green-700 flex items-center justify-center border-2 border-dashed border-green-200 hover:bg-green-100 transition-colors">
                  <Camera className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          {/* TO */}
          <div className="relative">
            <p className="text-xs font-bold uppercase tracking-widest mb-1 text-green-700">Đến</p>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-green-700" />
              <input
                value={destSearch}
                onChange={e => { setDestSearch(e.target.value); setToNodeId(null); setActiveResult(null); setNoPath(false); }}
                placeholder="Tìm phòng, khoa..."
                className={`w-full pl-8 pr-8 py-2.5 rounded-xl text-sm outline-none border-2 transition-colors ${toNodeId
                  ? 'bg-green-50 border-green-500 text-green-900 font-bold'
                  : 'bg-slate-50 border-slate-200 text-slate-800 font-normal focus:border-green-400'}`}
              />
              {(destSearch || toNodeId) && (
                <button className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  onClick={() => { setDestSearch(''); setToNodeId(null); setActiveResult(null); }}>
                  <X size={14} />
                </button>
              )}
            </div>
            {destSearch.trim() && !toNodeId && destResults.length > 0 && (
              <div className="absolute z-50 left-0 right-0 bg-white rounded-xl shadow-2xl overflow-y-auto mt-1 max-h-48 border border-green-100">
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

          <button onClick={() => handleFindPath()}
            disabled={!fromNodeId || !toNodeId || searching}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all active:scale-[.98] ${(!fromNodeId || !toNodeId)
              ? 'bg-slate-300 text-slate-100 cursor-not-allowed'
              : 'bg-green-800 text-white hover:bg-green-700 shadow-md shadow-green-900/20'}`}>
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
      {activeResult && (() => {
        const allSteps: React.ReactNode[] = [];
        let key = 0;

        const totalSegs = activeResult.segments.length;
        activeResult.segments.forEach((seg, segIdx) => {
          const isFirstSeg = segIdx === 0;
          const isLastSeg = segIdx === totalSegs - 1;

          if (seg.type === 'INDOOR') {
            let steps = buildSteps(seg.nodes, allFloorData, locations, floors);
            // Strip duplicate "📍 Bắt đầu" from non-first segments
            if (!isFirstSeg) steps = steps.filter(s => s.icon !== '📍');
            // Strip premature "🎯 Bạn đã đến nơi" from non-last segments
            if (!isLastSeg) steps = steps.filter(s => s.icon !== '🎯');

            steps.forEach(step => {
              allSteps.push(
                <li key={key++} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-xl flex-shrink-0 w-7 text-center">{step.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold leading-snug ${step.highlight ? 'text-green-700' : 'text-slate-800'}`}>{step.text}</p>
                    {step.sub && <p className="text-xs mt-0.5 font-semibold text-green-700">{step.sub}</p>}
                  </div>
                </li>
              );
            });
          } else {
            // Outdoor segment — header divider
            allSteps.push(
              <li key={key++} className="flex items-center justify-between px-4 py-2 bg-amber-600">
                <span className="text-xs font-bold text-white uppercase tracking-wider">🌿 Khuôn viên bệnh viện</span>
                <button onClick={() => setActiveFloorId('campus')} className="text-xs font-semibold text-amber-100 underline">
                  Xem sơ đồ
                </button>
              </li>
            );

            // Generate step-by-step directions for outdoor segment using campus map data
            const campusStepData = campusMapData ? [campusMapData] : [];
            let outdoorSteps = buildSteps(seg.nodes, campusStepData, locations, floors);
            // Strip "📍 Bắt đầu" if a previous segment already introduced the journey
            if (!isFirstSeg) outdoorSteps = outdoorSteps.filter(s => s.icon !== '📍');
            // Always strip "🎯 Bạn đã đến nơi" from outdoor (indoor handles final arrival)
            outdoorSteps = outdoorSteps.filter(s => s.icon !== '🎯');

            outdoorSteps.forEach(step => {
              // Map indoor icons to outdoor equivalents
              const icon = step.icon === '📍' ? '🌿'
                : step.icon === '🚪' ? '🏢'
                  : step.icon;
              allSteps.push(
                <li key={key++} className="flex items-center gap-3 px-4 py-3 bg-amber-50/60">
                  <span className="text-xl flex-shrink-0 w-7 text-center">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-amber-900 leading-snug">{step.text}</p>
                    {step.sub && <p className="text-xs mt-0.5 font-semibold text-amber-700">{step.sub}</p>}
                  </div>
                </li>
              );
            });

            // Indoor section header for next segment — show building name
            if (!isLastSeg) {
              const nextSeg = activeResult.segments[segIdx + 1];
              let enteringBuilding = 'tòa nhà';
              if (nextSeg?.type === 'INDOOR' && nextSeg.nodes[0]) {
                const nextNode = nextSeg.nodes[0];
                const nextFloor = floors.find(f => f.id === nextNode.floorId);
                if (nextFloor?.locationId) {
                  const floorLoc = locations.find(l => l.id === nextFloor.locationId);
                  if (floorLoc?.parentId) {
                    const buildingLoc = locations.find(l => l.id === floorLoc.parentId);
                    if (buildingLoc) enteringBuilding = buildingLoc.name;
                  }
                }
              }
              allSteps.push(
                <li key={key++} className="px-4 py-2 bg-green-700">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">🏥 Vào trong {enteringBuilding}</span>
                </li>
              );
            }
          }
        });

        const campusStepData = campusMapData ? [campusMapData] : [];
        const totalSteps = activeResult.segments.reduce((sum, s) => {
          const data = s.type === 'INDOOR' ? allFloorData : campusStepData;
          return sum + buildSteps(s.nodes, data, locations, floors).length;
        }, 0);

        return (
          <div className="rounded-2xl overflow-hidden bg-white border-2 border-green-100 shadow-lg shadow-green-900/5">
            <div className="flex items-center justify-between px-4 py-3 border-b border-green-100">
              <span className="text-sm font-extrabold text-slate-800">Chỉ đường</span>
              <div className="flex items-center gap-2">
                {hasOutdoor && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">🌿 Liên tòa</span>
                )}
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-800">{totalSteps} bước</span>
              </div>
            </div>
            <ol className="divide-y divide-green-50">{allSteps}</ol>
          </div>
        );
      })()}

      {/* Floor map */}
      <div className="rounded-2xl overflow-hidden bg-white border-2 border-green-100 shadow-lg shadow-green-900/5">
        {/* Row 1: Tổng quát + Buildings */}
        <div className="flex gap-1 px-3 pt-2.5 border-b border-green-100 overflow-x-auto pb-0" style={{ scrollbarWidth: 'none' }}>
          <button
            onClick={() => setActiveFloorId('campus')}
            className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-t-lg text-xs font-bold transition-colors border-b-2 ${activeFloorId === 'campus'
              ? 'border-green-800 bg-green-50 text-green-800'
              : 'border-transparent text-slate-500 hover:text-green-700'}`}>
            <MapPin size={11} /> Tổng quát
          </button>
          {floorsByBuilding.map(({ building }) => {
            const isActive = activeBuilding?.id === building.id;
            const initial = building.name.replace(/tòa\s*/i, '').charAt(0).toUpperCase();
            return (
              <button key={building.id}
                onClick={() => {
                  const firstFloor = floorsByBuilding.find(g => g.building.id === building.id)?.floors[0];
                  if (firstFloor) setActiveFloorId(firstFloor.id);
                }}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-xs font-bold transition-colors border-b-2 ${isActive
                  ? 'border-green-800 bg-green-50 text-green-800'
                  : 'border-transparent text-slate-500 hover:text-green-700'}`}>
                <span className="w-4 h-4 rounded flex items-center justify-center text-[10px] font-extrabold flex-shrink-0"
                  style={{ background: isActive ? '#1A5C2A' : '#E2E8F0', color: isActive ? '#fff' : '#64748b' }}>
                  {initial}
                </span>
                {building.name}
              </button>
            );
          })}
        </div>

        {/* Row 2: Floor sub-tabs (only when a building is active) */}
        {activeBuilding && (
          <div className="flex gap-1 px-3 py-1.5 bg-green-50/60 border-b border-green-100 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {floorsByBuilding.find(g => g.building.id === activeBuilding.id)?.floors.map(f => (
              <button key={f.id}
                onClick={() => setActiveFloorId(f.id)}
                className={`flex-shrink-0 px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${activeFloorId === f.id
                  ? 'bg-green-800 text-white shadow-sm'
                  : 'bg-white text-green-800 border border-green-200 hover:bg-green-100'}`}>
                {getFloorName(f.id)}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-green-50">
          <MapPin size={12} className="text-green-800 flex-shrink-0" />
          <span className="text-xs font-extrabold text-slate-700">
            {activeFloorId === 'campus' ? 'Sơ đồ tổng quát bệnh viện' : activeFloorId ? getFloorName(activeFloorId) : 'Sơ đồ'}
          </span>
        </div>

        {activeFloorId === 'campus' ? (
          campusMapData ? (
            <div>
              {renderMapCanvas(campusMapData, outdoorNodes, campusVisibleNodeIds, '#f59e0b')}
              <div className="flex items-center gap-4 px-4 py-2.5 border-t border-amber-100 text-xs font-semibold text-amber-700 bg-amber-50/50">
                {outdoorNodes.length > 0 ? (
                  <>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full inline-block bg-yellow-600" /> Xuất phát</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full inline-block bg-green-800" /> Điểm đến</span>
                    <span className="flex items-center gap-1.5"><span className="w-5 h-1 inline-block rounded bg-amber-500" /> Lộ trình</span>
                  </>
                ) : (
                  <span>Sơ đồ tổng quát khuôn viên bệnh viện</span>
                )}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-slate-500 font-medium">Đang tải sơ đồ khuôn viên...</div>
          )
        ) : currentFloorData ? (
          <div>
            {renderMapCanvas(currentFloorData, allIndoorNodes, visibleNodeIds, '#3b82f6')}
            {allIndoorNodes.length > 0 && (
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

      <Suspense fallback={null}>
        <QRScannerModal
          open={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onScanSuccess={(node, label) => {
            onSetLocation(node, label);
            if (toNodeId) handleFindPath(node.id, toNodeId);
          }}
        />
      </Suspense>
    </div>
  );
}
