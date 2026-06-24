import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mapService } from '@/services/mapService';
import { locationService } from '@/services/locationService';
import { assetService } from '@/services/assetService';
import { MapNode, NodeType } from '@/shared/types';
import { MapCanvas, EditorTool } from '../components/MapCanvas';
import { NodePanel } from '../components/NodePanel';
import { MousePointer, Plus, GitBranch, Trash2, ArrowLeft } from 'lucide-react';
import { getApiError } from '@/shared/helpers/apiError';
import { getBackendUrl } from '@/shared/helpers/imageUrl';
import { NODE_TYPE_OPTIONS, CAMPUS_NODE_TYPE_OPTIONS } from '../constants';
import { toast } from 'sonner';

const TOOL_BUTTONS: { tool: EditorTool; icon: React.ReactNode; label: string }[] = [
  { tool: 'select',  icon: <MousePointer size={18} />, label: 'Chọn / Kéo' },
  { tool: 'addNode', icon: <Plus size={18} />,         label: 'Thêm node' },
  { tool: 'addEdge', icon: <GitBranch size={18} />,    label: 'Nối đường' },
  { tool: 'delete',  icon: <Trash2 size={18} />,       label: 'Xóa' },
];

export default function MapEditorPage() {
  const { floorId } = useParams<{ floorId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  const [tool, setTool]               = useState<EditorTool>('select');
  const [pendingType, setPendingType] = useState<NodeType>('JUNCTION');
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(
    () => { const n = searchParams.get('nodeId'); return n ? Number(n) : null; }
  );
  const [edgeStartId, setEdgeStartId] = useState<number | null>(null);

  const { data: floorData, isLoading } = useQuery({
    queryKey: ['mapFloor', floorId],
    queryFn: () => mapService.getFloorData(Number(floorId)),
    enabled: !!floorId,
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: locationService.getAllLocations,
  });

  const { data: assets = [] } = useQuery({
    queryKey: ['assets', 'all'],
    queryFn: assetService.getAllAssets,
  });

  const { data: allFloors = [] } = useQuery({
    queryKey: ['mapFloors'],
    queryFn: mapService.getAllFloors,
  });

  const isCampusFloor = floorData?.floor.campus ?? false;
  const otherFloors = allFloors.filter(f => f.id !== Number(floorId));

  // Load campus nodes for EXIT node linking (only on non-campus floors)
  const { data: campusMapData } = useQuery({
    queryKey: ['campusMap'],
    queryFn: mapService.getCampusMap,
    enabled: !isCampusFloor,
    staleTime: 60_000,
  });
  const campusNodes = campusMapData?.nodes ?? [];

  const selectedNodeType = floorData?.nodes.find(n => n.id === selectedNodeId)?.type;
  const isTransitNode = selectedNodeType === 'STAIRS' || selectedNodeType === 'ELEVATOR';

  const { data: allFloorData = [] } = useQuery({
    queryKey: ['mapAllFloorData', otherFloors.map(f => f.id)],
    queryFn: () => mapService.getFloorDataBatch(otherFloors.map(f => f.id)),
    enabled: otherFloors.length > 0 && isTransitNode,
  });

  useEffect(() => {
    if (floorData && selectedNodeId && !floorData.nodes.find(n => n.id === selectedNodeId)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedNodeId(null);
    }
  }, [floorData, selectedNodeId]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['mapFloor', floorId] });

  const createNodeMutation = useMutation({
    mutationFn: mapService.createNode,
    onSuccess: invalidate,
    onError: (e: unknown) => toast.error(getApiError(e, 'Không thể thêm node')),
  });

  const updateNodeMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Partial<MapNode>) => mapService.updateNode(id, data),
    onSuccess: () => { invalidate(); toast.success('Đã lưu node'); },
    onError: (e: unknown) => toast.error(getApiError(e, 'Không thể cập nhật node')),
  });

  const deleteNodeMutation = useMutation({
    mutationFn: mapService.deleteNode,
    onSuccess: () => { setSelectedNodeId(null); invalidate(); },
    onError: (e: unknown) => alert(getApiError(e, 'Không thể xóa node')),
  });

  const createEdgeMutation = useMutation({
    mutationFn: ({ from, to }: { from: number; to: number }) => mapService.createEdge(from, to),
    onSuccess: invalidate,
    onError: (e: unknown) => toast.error(getApiError(e, 'Không thể tạo đường nối')),
  });

  const deleteEdgeMutation = useMutation({
    mutationFn: mapService.deleteEdge,
    onSuccess: invalidate,
    onError: (e: unknown) => toast.error(getApiError(e, 'Không thể xóa đường nối')),
  });


  const handleCanvasClick = (x: number, y: number) => {
    createNodeMutation.mutate({ floorId: Number(floorId), x, y, type: pendingType });
  };

  const handleNodeClick = (nodeId: number) => {
    if (tool === 'select') {
      setSelectedNodeId(prev => prev === nodeId ? null : nodeId);
    } else if (tool === 'addEdge') {
      if (edgeStartId === null) {
        setEdgeStartId(nodeId);
      } else if (edgeStartId !== nodeId) {
        createEdgeMutation.mutate({ from: edgeStartId, to: nodeId });
        setEdgeStartId(null);
      }
    } else if (tool === 'delete') {
      if (window.confirm('Xóa node này và tất cả đường nối liên quan?')) {
        deleteNodeMutation.mutate(nodeId);
      }
    }
  };

  const handleNodeDragEnd = (nodeId: number, x: number, y: number) => {
    const node = floorData?.nodes.find(n => n.id === nodeId);
    if (!node) return;
    updateNodeMutation.mutate({ id: nodeId, x, y, type: node.type, label: node.label, locationId: node.locationId, assetId: node.assetId, linkedCampusNodeId: node.linkedCampusNodeId });
  };

  const handleUpdateNode = (id: number, data: Partial<MapNode>) => {
    updateNodeMutation.mutate({ id, ...data });
  };

  const handleDeleteNode = (id: number) => {
    if (window.confirm('Xóa node này?')) deleteNodeMutation.mutate(id);
  };

  const selectedNode = floorData?.nodes.find(n => n.id === selectedNodeId) ?? null;

  if (isLoading) {
    return <div className="flex items-center justify-center h-full text-slate-500">Đang tải sơ đồ...</div>;
  }

  if (!floorData) {
    return <div className="flex items-center justify-center h-full text-slate-500">Không tìm thấy sơ đồ</div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200 flex-shrink-0">
        <button
          onClick={() => navigate('/admin/assets/tree/map')}
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-700 text-sm"
        >
          <ArrowLeft size={16} /> Danh sách
        </button>

        <div className="h-5 w-px bg-slate-200" />

        <div className="flex gap-1">
          {TOOL_BUTTONS.map(({ tool: t, icon, label }) => (
            <button
              key={t}
              onClick={() => { setTool(t); setEdgeStartId(null); }}
              title={label}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tool === t
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {icon} <span className="hidden md:inline">{label}</span>
            </button>
          ))}
        </div>

        {tool === 'addNode' && (
          <>
            <div className="h-5 w-px bg-slate-200" />
            <select
              value={pendingType}
              onChange={e => setPendingType(e.target.value as NodeType)}
              className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm"
            >
              {(isCampusFloor ? CAMPUS_NODE_TYPE_OPTIONS : NODE_TYPE_OPTIONS).map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </>
        )}

        {isCampusFloor && (
          <span className="ml-2 text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
            Sơ đồ tổng thể
          </span>
        )}

        <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
          <span>{floorData.nodes.length} node</span>
          <span>·</span>
          <span>{floorData.edges.length} đường nối</span>
          {!isCampusFloor && (
            <div className="flex items-center gap-3 ml-3">
              {([['ROOM','Phòng','bg-blue-500'],['DEPARTMENT','Khoa','bg-teal-500'],['JUNCTION','Hành lang','bg-slate-400'],['STAIRS','Cầu thang','bg-orange-500'],['ELEVATOR','Thang máy','bg-purple-500'],['ENTRANCE','Lối vào/Ra','bg-emerald-500']] as const).map(([,label,color]) => (
                <span key={label} className="flex items-center gap-1">
                  <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
                  {label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Canvas + Panel */}
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 p-4 min-h-0 overflow-auto flex items-start justify-center">
          <MapCanvas
            imageUrl={getBackendUrl(floorData.floor.imageUrl)}
            nodes={floorData.nodes}
            edges={floorData.edges}
            tool={tool}
            selectedNodeId={selectedNodeId}
            edgeStartId={edgeStartId}
            onCanvasClick={handleCanvasClick}
            onNodeClick={handleNodeClick}
            onNodeDragEnd={handleNodeDragEnd}
            onEdgeClick={edgeId => deleteEdgeMutation.mutate(edgeId)}
          />
        </div>

        {/* Panel — animate width, canvas thu hẹp mượt không giật */}
        <div
          style={{ width: selectedNode && tool === 'select' ? 256 : 0 }}
          className="flex-shrink-0 overflow-hidden transition-[width] duration-200 ease-in-out border-l border-slate-200 flex flex-col"
        >
          {selectedNode && (
            <>
              <NodePanel
                node={selectedNode}
                locations={locations}
                assets={assets}
                isCampusFloor={isCampusFloor}
                campusNodes={campusNodes}
                onUpdate={handleUpdateNode}
                onDelete={handleDeleteNode}
                onClose={() => setSelectedNodeId(null)}
              />

              {isTransitNode && (
                <div className="p-3 border-t border-slate-200 space-y-2">
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                    Nối với tầng khác
                  </p>
                  {allFloorData.length === 0 && (
                    <p className="text-xs text-slate-400">Đang tải...</p>
                  )}
                  {allFloorData.map(fd => {
                    const transitNodes = fd.nodes.filter(n => n.type === selectedNodeType);
                    const floorLoc = locations.find(l => l.id === fd.floor.locationId);
                    const floorLabel = floorLoc?.name ?? `Tầng #${fd.floor.id}`;
                    return transitNodes.map(n => {
                      const alreadyConnected =
                        floorData.edges.some(e =>
                          (e.nodeFromId === selectedNodeId && e.nodeToId === n.id) ||
                          (e.nodeToId === selectedNodeId && e.nodeFromId === n.id)
                        );
                      return (
                        <div key={n.id} className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-700 truncate">
                              {n.label || selectedNodeType}
                            </p>
                            <p className="text-xs text-slate-400">{floorLabel}</p>
                          </div>
                          {alreadyConnected ? (
                            <span className="text-xs text-emerald-600 font-medium flex-shrink-0">✓ Đã nối</span>
                          ) : (
                            <button
                              onClick={() => createEdgeMutation.mutate({ from: selectedNodeId!, to: n.id })}
                              disabled={createEdgeMutation.isPending}
                              className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded flex-shrink-0"
                            >
                              Nối
                            </button>
                          )}
                        </div>
                      );
                    });
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
