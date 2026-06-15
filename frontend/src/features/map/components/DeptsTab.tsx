import { useState } from 'react';
import { Location, MapNode, MapFloorData } from '@/shared/types';
import { Search } from 'lucide-react';

interface Props {
  locations: Location[];
  allFloorData: MapFloorData[];
  onSelectDest: (node: MapNode) => void;
}

export function DeptsTab({ locations, allFloorData, onSelectDest }: Props) {
  const [query, setQuery] = useState('');

  const items = locations.filter(l =>
    (l.type === 'DEPARTMENT' || l.type === 'ROOM') &&
    (!query.trim() || l.name.toLowerCase().includes(query.toLowerCase()))
  );

  const findNode = (locationId: number) =>
    allFloorData.flatMap(fd => fd.nodes).find(n => n.locationId === locationId);

  const floorName = (locationId: number) => {
    const node = findNode(locationId);
    if (!node) return null;
    const fd = allFloorData.find(fd => fd.nodes.some(n => n.id === node.id));
    return fd ? `Tầng ${fd.floor.id}` : null;
  };

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#5A7A62' }} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Tìm theo tên khoa, số phòng..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: '#fff', border: '1.5px solid #C8DEC8', color: '#1A2E1E' }}
        />
      </div>

      {/* List */}
      <div className="flex flex-col gap-2">
        {items.map(loc => {
          const node = findNode(loc.id);
          const floor = floorName(loc.id);
          return (
            <button key={loc.id}
              onClick={() => node && onSelectDest(node)}
              disabled={!node}
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all active:scale-[.98]"
              style={{
                background: '#fff',
                boxShadow: '0 2px 16px rgba(26,92,42,.08)',
                border: '1.5px solid transparent',
                opacity: node ? 1 : 0.55,
              }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                style={{ background: loc.type === 'DEPARTMENT' ? '#EAF4EC' : '#EEF2FF' }}>
                {loc.type === 'DEPARTMENT' ? '🏢' : '🚪'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate" style={{ color: '#1A2E1E' }}>{loc.name}</p>
                <p className="text-xs mt-0.5" style={{ color: '#5A7A62' }}>
                  {floor ?? 'Chưa có trên sơ đồ'}
                </p>
              </div>
              {floor && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: '#EAF4EC', color: '#1A5C2A' }}>{floor}</span>
              )}
            </button>
          );
        })}
        {items.length === 0 && (
          <p className="text-center text-sm py-8" style={{ color: '#5A7A62' }}>Không tìm thấy "{query}"</p>
        )}
      </div>
    </div>
  );
}
