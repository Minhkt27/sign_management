import { useRef, useState, useCallback } from 'react';
import { MapNode, MapEdge, NodeType } from '@/shared/types';

export type EditorTool = 'select' | 'addNode' | 'addEdge' | 'delete';

interface Props {
  imageUrl: string;
  nodes: MapNode[];
  edges: MapEdge[];
  tool: EditorTool;
  pendingNodeType: NodeType;
  selectedNodeId: number | null;
  edgeStartId: number | null;
  pathNodeIds?: Set<number>;
  onCanvasClick: (x: number, y: number) => void;
  onNodeClick: (nodeId: number) => void;
  onNodeDragEnd: (nodeId: number, x: number, y: number) => void;
}

const NODE_COLORS: Record<NodeType, string> = {
  ROOM:     'bg-blue-500',
  JUNCTION: 'bg-slate-400',
  STAIRS:   'bg-orange-500',
  ELEVATOR: 'bg-purple-500',
  ENTRANCE: 'bg-emerald-500',
};

const NODE_LABELS: Record<NodeType, string> = {
  ROOM: 'P', JUNCTION: '●', STAIRS: '▲', ELEVATOR: 'E', ENTRANCE: '→',
};

export function MapCanvas({
  imageUrl, nodes, edges, tool, pendingNodeType,
  selectedNodeId, edgeStartId, pathNodeIds,
  onCanvasClick, onNodeClick, onNodeDragEnd,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<{ id: number; x: number; y: number } | null>(null);

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (tool !== 'addNode') return;
    const rect = containerRef.current!.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    onCanvasClick(x, y);
  };

  const handleNodeMouseDown = useCallback((node: MapNode, e: React.MouseEvent) => {
    if (tool !== 'select') return;
    e.stopPropagation();
    e.preventDefault();

    const startX = e.clientX;
    const startY = e.clientY;
    let currentX = node.x;
    let currentY = node.y;

    const onMouseMove = (me: MouseEvent) => {
      const rect = containerRef.current!.getBoundingClientRect();
      const dx = (me.clientX - startX) / rect.width;
      const dy = (me.clientY - startY) / rect.height;
      currentX = Math.max(0, Math.min(1, node.x + dx));
      currentY = Math.max(0, Math.min(1, node.y + dy));
      setDragging({ id: node.id, x: currentX, y: currentY });
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      setDragging(null);
      onNodeDragEnd(node.id, currentX, currentY);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [tool, onNodeDragEnd]);

  const getNodeCoords = (node: MapNode) => {
    if (dragging?.id === node.id) return { x: dragging.x, y: dragging.y };
    return { x: node.x, y: node.y };
  };

  const isOnPath = (id: number) => pathNodeIds?.has(id) ?? false;

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden rounded-xl bg-slate-100 select-none ${
        tool === 'addNode' ? 'cursor-crosshair' : tool === 'delete' ? 'cursor-not-allowed' : 'cursor-default'
      }`}
      onClick={handleContainerClick}
    >
      {/* Floor plan image */}
      <img
        src={imageUrl}
        alt="Mặt bằng tầng"
        className="w-full h-full object-contain pointer-events-none"
        draggable={false}
      />

      {/* SVG overlay for edges */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {edges.map(edge => {
          const from = nodes.find(n => n.id === edge.nodeFromId);
          const to   = nodes.find(n => n.id === edge.nodeToId);
          if (!from || !to) return null;
          const fc = getNodeCoords(from);
          const tc = getNodeCoords(to);
          const onPath = isOnPath(from.id) && isOnPath(to.id);
          return (
            <line
              key={edge.id}
              x1={`${fc.x * 100}%`} y1={`${fc.y * 100}%`}
              x2={`${tc.x * 100}%`} y2={`${tc.y * 100}%`}
              stroke={onPath ? '#3b82f6' : '#94a3b8'}
              strokeWidth={onPath ? 3 : 1.5}
              strokeDasharray={onPath ? undefined : '4 3'}
            />
          );
        })}
      </svg>

      {/* Nodes */}
      {nodes.map(node => {
        const { x, y } = getNodeCoords(node);
        const isSelected = selectedNodeId === node.id;
        const isEdgeStart = edgeStartId === node.id;
        const onPath = isOnPath(node.id);
        return (
          <div
            key={node.id}
            className={`absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center
              w-7 h-7 rounded-full text-white text-xs font-bold shadow-md border-2 transition-transform
              ${NODE_COLORS[node.type]}
              ${isSelected  ? 'border-white ring-2 ring-blue-400 scale-125' : 'border-white'}
              ${isEdgeStart ? 'ring-2 ring-yellow-400 scale-110' : ''}
              ${onPath      ? 'ring-2 ring-blue-500' : ''}
              ${tool === 'select' ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}
            `}
            style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
            onClick={e => { e.stopPropagation(); onNodeClick(node.id); }}
            onMouseDown={e => handleNodeMouseDown(node, e)}
            title={node.label ?? node.type}
          >
            {NODE_LABELS[node.type]}
          </div>
        );
      })}

      {/* Pending edge indicator */}
      {edgeStartId !== null && tool === 'addEdge' && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-yellow-100 border border-yellow-300 text-yellow-800 text-xs px-3 py-1 rounded-full pointer-events-none">
          Click node thứ 2 để tạo đường nối
        </div>
      )}
    </div>
  );
}
