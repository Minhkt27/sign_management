import { useState, useMemo } from 'react';
import { Location, MapNode, MapFloorData } from '@/shared/types';
import { Search, ChevronDown, ChevronRight } from 'lucide-react';
import { normalize } from '../utils/pathHelpers';

interface Props {
  locations: Location[];
  allFloorData: MapFloorData[];
  onSelectDest: (node: MapNode) => void;
}

export function DeptsTab({ locations, allFloorData, onSelectDest }: Props) {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const buildings = useMemo(() =>
    locations.filter(l => l.type === 'BUILDING'),
  [locations]);

  const grouped = useMemo(() => {
    const q = normalize(query.trim());
    return buildings.map(building => {
      const floorLocIds = new Set(
        locations
          .filter(l => l.type === 'FLOOR' && l.parentId === building.id)
          .map(l => l.id),
      );
      const items = allFloorData
        .filter(fd => fd.floor.locationId != null && floorLocIds.has(fd.floor.locationId!))
        .flatMap(fd => {
          const floorName = locations.find(l => l.id === fd.floor.locationId)?.name ?? `Tầng ${fd.floor.id}`;
          return fd.nodes
            .filter(n => n.type === 'DEPARTMENT' || n.type === 'ROOM')
            .map(n => {
              const locName = n.locationId ? locations.find(l => l.id === n.locationId)?.name : undefined;
              return { node: n, floorName, locName };
            });
        })
        .filter(({ node, locName }) =>
          !q ||
          normalize(locName ?? '').includes(q) ||
          normalize(node.label ?? '').includes(q),
        );
      return { building, items };
    });
  }, [buildings, locations, allFloorData, query]);

  const toggle = (id: number) =>
    setExpanded(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });

  const searching = !!query.trim();
  const hasResults = grouped.some(g => g.items.length > 0);

  return (
    <div className="space-y-3">
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

      {grouped.map(({ building, items }) => {
        if (!searching && items.length === 0) return null;
        if (searching && items.length === 0) return null;
        const open = searching || expanded.has(building.id);
        const initial = building.name.replace(/tòa\s*/i, '').charAt(0).toUpperCase();
        return (
          <div key={building.id} className="rounded-2xl overflow-hidden"
            style={{ border: '1.5px solid #C8DEC8' }}>
            <button
              onClick={() => !searching && toggle(building.id)}
              className="w-full flex items-center gap-3 px-4 py-3"
              style={{ background: '#EAF4EC' }}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: '#1A5C2A' }}>
                <span className="text-white text-sm font-extrabold">{initial}</span>
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-extrabold" style={{ color: '#1A2E1E' }}>{building.name}</p>
                <p className="text-xs" style={{ color: '#5A7A62' }}>{items.length} khoa / phòng</p>
              </div>
              {!searching && (open
                ? <ChevronDown size={16} style={{ color: '#5A7A62' }} />
                : <ChevronRight size={16} style={{ color: '#5A7A62' }} />
              )}
            </button>

            {open && (
              <div className="bg-white flex flex-col divide-y" style={{ borderColor: '#F0FAF0' }}>
                {items.map(({ node, floorName, locName }) => (
                  <button key={node.id}
                    onClick={() => onSelectDest(node)}
                    className="flex items-center gap-3 px-4 py-2.5 text-left transition-all active:bg-green-50"
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                      style={{ background: node.type === 'DEPARTMENT' ? '#EAF4EC' : '#EEF2FF' }}>
                      {node.type === 'DEPARTMENT' ? '🏢' : '🚪'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate" style={{ color: '#1A2E1E' }}>
                        {locName ?? node.label ?? node.type}
                      </p>
                      <p className="text-xs" style={{ color: '#5A7A62' }}>{floorName}</p>
                    </div>
                    <span style={{ color: '#5A7A62', fontSize: 16 }}>›</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {searching && !hasResults && (
        <p className="text-center text-sm py-8" style={{ color: '#5A7A62' }}>
          Không tìm thấy "{query}"
        </p>
      )}
    </div>
  );
}
