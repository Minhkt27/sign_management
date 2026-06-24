/**
 * Integration test: sử dụng data thật từ API (captured từ backend đang chạy)
 *
 * API calls:
 *   POST /api/auth/login → token
 *   GET  /api/map/wayfinding?from=7&to=3  → real A* path
 *   GET  /api/map/floors/1               → real floor 1 nodes
 *   GET  /api/locations                  → real locations
 *
 * Captured 2026-06-12
 */
import { describe, it, expect } from 'vitest';
import { buildSteps } from '../utils/pathHelpers';
import type { MapNode, MapFloor, MapFloorData, Location } from '@/shared/types';

// ── Real path: A* từ "thang máy số 3" (id=7) → "phòng bệnh 120" (id=3) ──
const REAL_PATH: MapNode[] = [
  { id: 7,  floorId: 1, x: 0.47177948308516776, y: 0.5455219298059231,  type: 'ELEVATOR', label: 'thang máy số 3',  locationId: undefined },
  { id: 54, floorId: 1, x: 0.49941510134120265, y: 0.5456606747723327,  type: 'JUNCTION', label: undefined,          locationId: undefined },
  { id: 53, floorId: 1, x: 0.49941510134120265, y: 0.27914322331246805, type: 'JUNCTION', label: 'Phong Cap Cuu 1', locationId: undefined },
  { id: 52, floorId: 1, x: 0.3854392399533568,  y: 0.27914322331246805, type: 'JUNCTION', label: undefined,          locationId: undefined },
  { id: 51, floorId: 1, x: 0.38521155047074757, y: 0.2202152431608783,  type: 'JUNCTION', label: undefined,          locationId: undefined },
  { id: 50, floorId: 1, x: 0.36232530240013466, y: 0.22046820462471275, type: 'JUNCTION', label: undefined,          locationId: undefined },
  { id: 49, floorId: 1, x: 0.3365202230672575,  y: 0.2213756537807886,  type: 'JUNCTION', label: undefined,          locationId: undefined },
  { id: 48, floorId: 1, x: 0.30859773719239003, y: 0.22112269231695414, type: 'JUNCTION', label: undefined,          locationId: undefined },
  { id: 47, floorId: 1, x: 0.27687073966179104, y: 0.22046820462471273, type: 'JUNCTION', label: undefined,          locationId: undefined },
  { id: 6,  floorId: 1, x: 0.24411462792830854, y: 0.21996228169704388, type: 'JUNCTION', label: undefined,          locationId: undefined },
  { id: 3,  floorId: 1, x: 0.2447726188391665,  y: 0.19791447991874858, type: 'ROOM',     label: 'phòng bệnh 120',  locationId: 9 },
];

// ── Real floor 1 data (nodes từ GET /api/map/floors/1) ──
const FLOOR_1: MapFloor = { id: 1, locationId: 3, imageUrl: '', imgWidth: 14581, imgHeight: 8268, campus: false };
const FLOOR_1_NODES: MapNode[] = [
  { id: 1,  floorId: 1, x: 0.1414680458344645,  y: 0.20023530115856913, type: 'ROOM',       label: 'Phòng cấp cứu số 1', locationId: 7  },
  { id: 2,  floorId: 1, x: 0.19542330052481843, y: 0.20023530115856913, type: 'ROOM',       label: 'phòng chụp X quang', locationId: 8  },
  { id: 3,  floorId: 1, x: 0.2447726188391665,  y: 0.19791447991874858, type: 'ROOM',       label: 'phòng bệnh 120',     locationId: 9  },
  { id: 4,  floorId: 1, x: 0.24448575122033403, y: 0.2396892622355186,  type: 'ROOM',       label: 'phòng bệnh 119',     locationId: 10 },
  { id: 5,  floorId: 1, x: 0.2454306097500245,  y: 0.7511724687197662,  type: 'ROOM',       label: undefined,             locationId: undefined },
  { id: 6,  floorId: 1, x: 0.24411462792830854, y: 0.21996228169704388, type: 'JUNCTION',   label: undefined,             locationId: undefined },
  { id: 7,  floorId: 1, x: 0.47177948308516776, y: 0.5455219298059231,  type: 'ELEVATOR',   label: 'thang máy số 3',      locationId: undefined },
  { id: 8,  floorId: 1, x: 0.5277087105080955,  y: 0.5455219298059231,  type: 'ELEVATOR',   label: 'thang máy số 4',      locationId: undefined },
  { id: 9,  floorId: 1, x: 0.5270507195972376,  y: 0.4793785244710372,  type: 'STAIRS',     label: undefined,             locationId: undefined },
  { id: 44, floorId: 1, x: 0.14081005492360654, y: 0.21996228169704388, type: 'JUNCTION',   label: undefined,             locationId: undefined },
  { id: 46, floorId: 1, x: 0.19425075251251872, y: 0.22086973085311973, type: 'JUNCTION',   label: undefined,             locationId: undefined },
  { id: 47, floorId: 1, x: 0.27687073966179104, y: 0.22046820462471273, type: 'JUNCTION',   label: undefined,             locationId: undefined },
  { id: 48, floorId: 1, x: 0.30859773719239003, y: 0.22112269231695414, type: 'JUNCTION',   label: undefined,             locationId: undefined },
  { id: 49, floorId: 1, x: 0.3365202230672575,  y: 0.2213756537807886,  type: 'JUNCTION',   label: undefined,             locationId: undefined },
  { id: 50, floorId: 1, x: 0.36232530240013466, y: 0.22046820462471275, type: 'JUNCTION',   label: undefined,             locationId: undefined },
  { id: 51, floorId: 1, x: 0.38521155047074757, y: 0.2202152431608783,  type: 'JUNCTION',   label: undefined,             locationId: undefined },
  { id: 52, floorId: 1, x: 0.3854392399533568,  y: 0.27914322331246805, type: 'JUNCTION',   label: undefined,             locationId: undefined },
  { id: 53, floorId: 1, x: 0.49941510134120265, y: 0.27914322331246805, type: 'JUNCTION',   label: 'Phong Cap Cuu 1',    locationId: undefined },
  { id: 54, floorId: 1, x: 0.49941510134120265, y: 0.5456606747723327,  type: 'JUNCTION',   label: undefined,             locationId: undefined },
  { id: 56, floorId: 1, x: 0.3462913189538607,  y: 0.781179681767903,   type: 'DEPARTMENT', label: 'khoa cấp cứu',        locationId: 5  },
];

// Edges thật từ GET /api/map/floors/1 (chỉ lấy các cạnh JUNCTION↔JUNCTION liên quan)
const FLOOR_1_EDGES = [
  { id: 2,  nodeFromId: 44, nodeToId: 46, weight: 0.0534, bidirectional: true },
  { id: 4,  nodeFromId: 46, nodeToId: 6,  weight: 0.0499, bidirectional: true },
  { id: 7,  nodeFromId: 6,  nodeToId: 47, weight: 0.0336, bidirectional: true },
  { id: 8,  nodeFromId: 47, nodeToId: 48, weight: 0.0317, bidirectional: true },
  { id: 9,  nodeFromId: 48, nodeToId: 49, weight: 0.0280, bidirectional: true },
  { id: 10, nodeFromId: 49, nodeToId: 50, weight: 0.0259, bidirectional: true },
  { id: 11, nodeFromId: 51, nodeToId: 52, weight: 0.0604, bidirectional: true },
  { id: 12, nodeFromId: 52, nodeToId: 53, weight: 0.1136, bidirectional: true },
  { id: 13, nodeFromId: 53, nodeToId: 54, weight: 0.2664, bidirectional: true },
  { id: 16, nodeFromId: 50, nodeToId: 51, weight: 0.0229, bidirectional: true },
  // Cạnh đến ROOM/ELEVATOR (không tính nav-degree nhưng vẫn giữ để đúng data)
  { id: 1,  nodeFromId: 1,  nodeToId: 44, weight: 0.0689, bidirectional: true },
  { id: 3,  nodeFromId: 46, nodeToId: 2,  weight: 0.0551, bidirectional: true },
  { id: 5,  nodeFromId: 6,  nodeToId: 3,  weight: 0.0220, bidirectional: true },
  { id: 6,  nodeFromId: 6,  nodeToId: 4,  weight: 0.0197, bidirectional: true },
  { id: 14, nodeFromId: 54, nodeToId: 8,  weight: 0.0286, bidirectional: true },
  { id: 15, nodeFromId: 54, nodeToId: 7,  weight: 0.0529, bidirectional: true },
];

const ALL_FLOOR_DATA: MapFloorData[] = [
  { floor: FLOOR_1, nodes: FLOOR_1_NODES, edges: FLOOR_1_EDGES },
];

// ── Real locations (từ GET /api/locations) ──
const LOCATIONS: Location[] = [
  { id: 1,  name: 'Tòa nhà A',           parentId: null },
  { id: 2,  name: 'Tòa nhà B',           parentId: null },
  { id: 3,  name: 'Tầng 1',              parentId: 1    },
  { id: 4,  name: 'Tầng 2',              parentId: 1    },
  { id: 5,  name: 'Khoa Cấp cứu',        parentId: 3    },
  { id: 6,  name: 'Khoa Khám bệnh',      parentId: 4    },
  { id: 7,  name: 'Phòng Cấp cứu số 1',  parentId: 5    },
  { id: 8,  name: 'Phòng Chụp X-Quang',  parentId: 5    },
  { id: 9,  name: 'phòng bệnh 120',       parentId: 5    },
  { id: 10, name: 'phòng bệnh 119',       parentId: 5    },
];

const FLOORS = [FLOOR_1];

// ─────────────────────────────────────────────────────────────────────────────

describe('Real data integration — thang máy số 3 → phòng bệnh 120', () => {
  const steps = buildSteps(REAL_PATH, ALL_FLOOR_DATA, LOCATIONS, FLOORS);

  it('in ra toàn bộ steps để quan sát kết quả thật', () => {
    console.log('\n=== Hướng dẫn đường thực tế ===');
    steps.forEach((s, i) => {
      console.log(`${i + 1}. ${s.icon} ${s.text}${s.sub ? ` (${s.sub})` : ''}`);
    });
    console.log('================================\n');
    expect(steps.length).toBeGreaterThan(0);
  });

  it('bắt đầu tại thang máy số 3', () => {
    expect(steps[0].text).toBe('Bắt đầu tại thang máy số 3');
    expect(steps[0].icon).toBe('📍');
  });

  it('đến đích là phòng bệnh 120', () => {
    const last = steps[steps.length - 1];
    expect(last.icon).toBe('🎯');
    expect(last.text).toBe('Bạn đã đến nơi');
    expect(last.sub).toBe('phòng bệnh 120');
  });

  it('không có bước nào nhắc đến Elevator đi lên/xuống (cùng tầng)', () => {
    const elevStep = steps.find(s => s.icon === '🛗');
    expect(elevStep).toBeUndefined();
  });

  it('bước gần cuối nhắc đến phòng bệnh 120', () => {
    const destStep = steps[steps.length - 2];
    expect(destStep.text).toContain('phòng bệnh 120');
  });

  it('snapshot tổng số bước', () => {
    // Tài liệu: bao nhiêu bước tạo ra từ path 11 node
    expect(steps.length).toMatchSnapshot();
  });
});
