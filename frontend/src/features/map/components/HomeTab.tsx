import { Location, MapNode, MapFloorData } from '@/shared/types';

const QUICK = [
  { emoji: '🚨', label: 'Cấp cứu',    keyword: 'cấp cứu',    bg: '#FEE2E2', urgent: true },
  { emoji: '🩺', label: 'Khám bệnh',  keyword: 'khám bệnh',  bg: '#DBEAFE' },
  { emoji: '🧪', label: 'Xét nghiệm', keyword: 'xét nghiệm', bg: '#F3E8FF' },
  { emoji: '💊', label: 'Nhà thuốc',  keyword: 'thuốc',       bg: '#D1FAE5' },
  { emoji: '🔬', label: 'Chẩn đoán',  keyword: 'chẩn đoán',  bg: '#FEF3C7' },
  { emoji: '💳', label: 'Viện phí',   keyword: 'viện phí',   bg: '#FCE7F3' },
  { emoji: '🤱', label: 'Phụ sản',    keyword: 'phụ sản',    bg: '#FDF2F8' },
  { emoji: '🚻', label: 'WC',         keyword: 'wc',          bg: '#E0F2FE' },
];

interface Props {
  fromLabel: string;
  locations: Location[];
  allFloorData: MapFloorData[];
  onChangeLocation: () => void;
  onSelectDest: (node: MapNode) => void;
}

export function HomeTab({ fromLabel, locations, allFloorData, onChangeLocation, onSelectDest }: Props) {
  const departments = locations.filter(l => l.type === 'DEPARTMENT');

  const handleQuick = (keyword: string) => {
    const q = keyword.toLowerCase();
    for (const fd of allFloorData) {
      const node = fd.nodes.find(n =>
        n.label && (n.type === 'ROOM' || n.type === 'DEPARTMENT' || n.type === 'ELEVATOR') && n.label.toLowerCase().includes(q)
      );
      if (node) { onSelectDest(node); return; }
    }
  };

  return (
    <div className="space-y-4">
      {/* Current location banner */}
      <button
        onClick={onChangeLocation}
        className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all active:scale-[.98]"
        style={{ background: 'linear-gradient(135deg,#E8F5EA,#F0FAF0)', border: '1.5px solid #C8DEC8', boxShadow: '0 2px 16px rgba(26,92,42,.10)' }}
      >
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ background: '#3D9B4E', boxShadow: '0 0 0 4px rgba(61,155,78,.2)', animation: 'pulse 2s infinite' }} />
        <div className="flex-1 min-w-0">
          <strong className="block text-sm font-bold truncate" style={{ color: '#1A2E1E' }}>
            📍 {fromLabel || 'Chưa xác định vị trí'}
          </strong>
          <span className="text-xs" style={{ color: '#5A7A62' }}>Nhấn để cập nhật vị trí của bạn</span>
        </div>
        <span className="text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0"
          style={{ background: 'rgba(61,155,78,.1)', color: '#1A5C2A' }}>Đổi vị trí</span>
      </button>

      {/* Quick access grid */}
      <div>
        <p className="text-xs font-extrabold uppercase tracking-widest mb-2" style={{ color: '#5A7A62' }}>Truy cập nhanh</p>
        <div className="grid grid-cols-4 gap-2">
          {QUICK.map(q => (
            <button key={q.keyword} onClick={() => handleQuick(q.keyword)}
              className="flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl transition-all active:scale-95"
              style={{
                background: '#fff',
                border: `1.5px solid ${q.urgent ? '#FECACA' : '#C8DEC8'}`,
                boxShadow: '0 2px 16px rgba(26,92,42,.08)',
              }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg"
                style={{ background: q.bg }}>{q.emoji}</div>
              <span className="text-xs font-bold leading-tight text-center"
                style={{ color: q.urgent ? '#B91C1C' : '#1A2E1E' }}>{q.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Departments list */}
      {departments.length > 0 && (
        <div>
          <p className="text-xs font-extrabold uppercase tracking-widest mb-2" style={{ color: '#5A7A62' }}>Các khoa</p>
          <div className="flex flex-col gap-2">
            {departments.map(dept => {
              const node = allFloorData.flatMap(fd => fd.nodes).find(
                n => n.locationId === dept.id && n.type === 'DEPARTMENT'
              );
              return (
                <button key={dept.id}
                  onClick={() => node && onSelectDest(node)}
                  disabled={!node}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all active:scale-[.98]"
                  style={{
                    background: '#fff',
                    border: '1.5px solid transparent',
                    boxShadow: '0 2px 16px rgba(26,92,42,.08)',
                    opacity: node ? 1 : 0.5,
                  }}>
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ background: '#EAF4EC' }}>🏢</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: '#1A2E1E' }}>{dept.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#5A7A62' }}>
                      {node ? 'Có trên sơ đồ' : 'Chưa có trên sơ đồ'}
                    </p>
                  </div>
                  <span style={{ color: '#5A7A62', fontSize: 18 }}>›</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
