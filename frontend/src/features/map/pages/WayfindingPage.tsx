import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { mapService } from '@/services/mapService';
import { locationService } from '@/services/locationService';
import { MapFloorData, MapNode } from '@/shared/types';
import { HomeTab } from '../components/HomeTab';
import { MapTab } from '../components/MapTab';
import { DeptsTab } from '../components/DeptsTab';
import { QRTab } from '../components/QRTab';

type Tab = 'home' | 'map' | 'depts' | 'qr';

const NAV: { id: Tab; label: string; icon: string }[] = [
  { id: 'home',  label: 'Trang chủ', icon: '🏠' },
  { id: 'map',   label: 'Sơ đồ',     icon: '🗺️' },
  { id: 'depts', label: 'Khoa/Phòng',icon: '📋' },
  { id: 'qr',    label: 'QR vị trí', icon: '▣' },
];

export default function WayfindingPage() {
  const [searchParams] = useSearchParams();
  const destParam = searchParams.get('dest');
  const [activeTab, setActiveTab] = useState<Tab>(destParam ? 'map' : 'home');
  const [fromNodeId, setFromNodeId] = useState<number | null>(
    searchParams.get('from') ? Number(searchParams.get('from')) : null
  );
  const [fromLabel, setFromLabel] = useState(
    searchParams.get('fromLabel') ?? ''
  );

  const { data: floors = [] } = useQuery({
    queryKey: ['mapFloors'],
    queryFn: mapService.getAllFloors,
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: locationService.getAllLocations,
  });

  const { data: allFloorData = [] } = useQuery<MapFloorData[]>({
    queryKey: ['mapAllFloorData', floors.map(f => f.id)],
    queryFn: () => Promise.all(floors.map(f => mapService.getFloorData(f.id))),
    enabled: floors.length > 0,
  });

  const [pendingDestNodeId, setPendingDestNodeId] = useState<number | null>(
    destParam ? Number(destParam) : null
  );

  const handleSetLocation = (node: MapNode, label: string) => {
    setFromNodeId(node.id);
    setFromLabel(label);
  };

  const handleSelectDest = (node: MapNode) => {
    setPendingDestNodeId(node.id);
    setActiveTab('map');
  };

  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{ background: '#F2F7F3', fontFamily: "'Be Vietnam Pro', sans-serif", maxWidth: 430, margin: '0 auto' }}
    >
      {/* ── HEADER ── */}
      <div
        className="flex-shrink-0 relative z-20"
        style={{ background: 'linear-gradient(160deg,#1A5C2A 0%,#2E7D3C 55%,#3D9B4E 100%)', padding: '13px 14px 13px' }}
      >
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none"
          style={{ background: 'rgba(200,160,32,.15)', transform: 'translate(30px,-30px)' }} />
        <div className="flex items-center gap-2.5 relative z-10">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ background: 'rgba(255,255,255,.15)', border: '1.5px solid rgba(200,160,32,.5)' }}>
            🏥
          </div>
          <div>
            <h1 className="text-xs font-extrabold text-white uppercase tracking-wide leading-tight">
              Bệnh viện
            </h1>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,.65)' }}>Hệ thống dẫn đường thông minh</p>
          </div>
          {fromNodeId && (
            <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold flex-shrink-0"
              style={{ background: 'rgba(255,255,255,.15)', color: '#fff', border: '1px solid rgba(255,255,255,.3)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-green-300 inline-block" />
              <span className="max-w-[100px] truncate">{fromLabel}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── SCROLL CONTENT ── */}
      <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-2">
        {activeTab === 'home' && (
          <HomeTab
            fromLabel={fromLabel}
            locations={locations}
            allFloorData={allFloorData}
            onChangeLocation={() => setActiveTab('qr')}
            onSelectDest={handleSelectDest}
          />
        )}
        {activeTab === 'map' && (
          <MapTab
            fromNodeId={fromNodeId}
            fromLabel={fromLabel}
            destNodeId={pendingDestNodeId}
            floors={floors}
            locations={locations}
            allFloorData={allFloorData}
            onGoToQR={() => setActiveTab('qr')}
          />
        )}
        {activeTab === 'depts' && (
          <DeptsTab
            locations={locations}
            allFloorData={allFloorData}
            onSelectDest={node => { handleSelectDest(node); }}
          />
        )}
        {activeTab === 'qr' && (
          <QRTab
            allFloorData={allFloorData}
            locations={locations}
            onSetLocation={(node, label) => {
              handleSetLocation(node, label);
              setActiveTab('home');
            }}
          />
        )}
      </div>

      {/* ── BOTTOM NAV ── */}
      <nav
        className="flex-shrink-0 flex border-t"
        style={{ background: '#fff', borderColor: '#C8DEC8', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {NAV.map(item => {
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className="flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-all"
              style={{ color: active ? '#1A5C2A' : '#5A7A62' }}
            >
              <span className="text-xl leading-none">{item.icon}</span>
              <span className="text-xs font-bold" style={{ fontSize: 10 }}>{item.label}</span>
              {active && (
                <span className="w-5 h-0.5 rounded-full mt-0.5" style={{ background: '#1A5C2A' }} />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
