import { useState, useEffect } from 'react';
import { MapNode, NodeType, Location } from '@/shared/types';
import { X, Trash2 } from 'lucide-react';
import { NODE_TYPE_OPTIONS } from '../constants';

interface Props {
  node: MapNode | null;
  locations: Location[];
  onUpdate: (id: number, data: Partial<MapNode>) => void;
  onDelete: (id: number) => void;
  onClose: () => void;
}

export function NodePanel({ node, locations, onUpdate, onDelete, onClose }: Props) {
  const [label, setLabel]       = useState('');
  const [type, setType]         = useState<NodeType>('JUNCTION');
  const [locationId, setLocationId] = useState<string>('');

  useEffect(() => {
    if (node) {
      setLabel(node.label ?? '');
      setType(node.type);
      setLocationId(node.locationId?.toString() ?? '');
    }
  }, [node]);

  if (!node) return null;

  const handleSave = () => {
    onUpdate(node.id, {
      label: label || undefined,
      type,
      locationId: locationId ? Number(locationId) : undefined,
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
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Tên hiển thị</label>
          <input
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="Phòng 101, Sảnh chờ..."
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Loại</label>
          <select
            value={type}
            onChange={e => setType(e.target.value as NodeType)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {NODE_TYPE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Gắn với Khoa/Phòng <span className="text-slate-400">(cho bệnh nhân tìm)</span>
          </label>
          <select
            value={locationId}
            onChange={e => setLocationId(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">— Không gắn —</option>
            <optgroup label="Khoa / Phòng ban">
              {locations.filter(l => l.type === 'DEPARTMENT').map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </optgroup>
            <optgroup label="Phòng">
              {locations.filter(l => l.type === 'ROOM').map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </optgroup>
          </select>
        </div>

        <div className="text-xs text-slate-400 space-y-1">
          <div>ID: {node.id}</div>
          <div>x: {node.x.toFixed(3)}, y: {node.y.toFixed(3)}</div>
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
