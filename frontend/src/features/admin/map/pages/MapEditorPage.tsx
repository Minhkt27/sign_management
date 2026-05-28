import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mapService } from '@/services/mapService';
import { locationService } from '@/services/locationService';
import { MapNode, NodeType } from '@/shared/types';
import { MapCanvas, EditorTool } from '../components/MapCanvas';
import { NodePanel } from '../components/NodePanel';
import { MousePointer, Plus, GitBranch, Trash2, ArrowLeft } from 'lucide-react';
import { getApiError } from '@/shared/helpers/apiError';
import { NODE_TYPE_OPTIONS } from '../constants';

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

  const [tool, setTool]               = useState<EditorTool>('select');
  const [pendingType, setPendingType] = useState<NodeType>('JUNCTION');
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
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

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['mapFloor', floorId] });

  const createNodeMutation = useMutation({
    mutationFn: mapService.createNode,
    onSuccess: invalidate,
    onError: (e: unknown) => alert(getApiError(e, 'Không thể thêm node')),
  });

  const updateNodeMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Partial<MapNode>) => mapService.updateNode(id, data),
    onSuccess: invalidate,
    onError: (e: unknown) => alert(getApiError(e, 'Không thể cập nhật node')),
  });

  const deleteNodeMutation = useMutation({
    mutationFn: mapService.deleteNode,
    onSuccess: () => { setSelectedNodeId(null); invalidate(); },
    onError: (e: unknown) => alert(getApiError(e, 'Không thể xóa node')),
  });

  const createEdgeMutation = useMutation({
    mutationFn: ({ from, to }: { from: number; to: number }) => mapService.createEdge(from, to),
    onSuccess: invalidate,
    onError: (e: unknown) => alert(getApiError(e, 'Không thể tạo đường nối')),
  });

  const deleteEdgeMutation = useMutation({
    mutationFn: mapService.deleteEdge,
    onSuccess: invalidate,
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
    updateNodeMutation.mutate({ id: nodeId, x, y, type: node.type, label: node.label, locationId: node.locationId, assetId: node.assetId });
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
          onClick={() => navigate('/admin/map')}
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
              {NODE_TYPE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </>
        )}

        <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
          <span>{floorData.nodes.length} node</span>
          <span>·</span>
          <span>{floorData.edges.length} đường nối</span>
          <div className="flex items-center gap-3 ml-3">
            {([['ROOM','Phòng','bg-blue-500'],['JUNCTION','Hành lang','bg-slate-400'],['STAIRS','Cầu thang','bg-orange-500'],['ELEVATOR','Thang máy','bg-purple-500'],['ENTRANCE','Lối vào','bg-emerald-500']] as const).map(([,label,color]) => (
              <span key={label} className="flex items-center gap-1">
                <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Canvas + Panel */}
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 p-4 min-h-0">
          <MapCanvas
            imageUrl={floorData.floor.imageUrl}
            nodes={floorData.nodes}
            edges={floorData.edges}
            tool={tool}
            pendingNodeType={pendingType}
            selectedNodeId={selectedNodeId}
            edgeStartId={edgeStartId}
            onCanvasClick={handleCanvasClick}
            onNodeClick={handleNodeClick}
            onNodeDragEnd={handleNodeDragEnd}
          />
        </div>

        {selectedNode && tool === 'select' && (
          <NodePanel
            node={selectedNode}
            locations={locations}
            onUpdate={handleUpdateNode}
            onDelete={handleDeleteNode}
            onClose={() => setSelectedNodeId(null)}
          />
        )}
      </div>
    </div>
  );
}
