import { describe, it, expect } from 'vitest';
import { buildSteps } from '../utils/pathHelpers';
import type { MapNode, MapFloor, MapFloorData, Location } from '@/shared/types';

// --- Helpers ---

const mkFloor = (id: number, locId: number): MapFloor => ({
  id, locationId: locId, imageUrl: '', imgWidth: 0, imgHeight: 0, campus: false,
});

const mkNode = (
  overrides: Partial<MapNode> & Pick<MapNode, 'id' | 'type' | 'floorId' | 'x' | 'y'>,
): MapNode => ({ label: undefined, locationId: undefined, ...overrides });

// --- Shared fixtures ---

const FLOOR_1 = mkFloor(1, 10);
const FLOOR_2 = mkFloor(2, 11);
const FLOORS = [FLOOR_1, FLOOR_2];

const LOCATIONS: Location[] = [
  { id: 10, name: 'Tầng 1',    parentId: null },
  { id: 11, name: 'Tầng 2',    parentId: null },
  { id: 20, name: 'Phòng 120', parentId: 11  },
  { id: 30, name: 'Khoa Nội',  parentId: 10  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 1: user bắt đầu TẠI thang máy → Phòng 120 (tầng 2)
//
// Đây là trường hợp user đứng ngay thang máy nên KHÔNG có bước
// "Đi thang máy lên Tầng 2" — xem Scenario 4 để thấy cách đúng khi
// thang máy nằm giữa lộ trình.
// ─────────────────────────────────────────────────────────────────────────────
describe('Scenario 1 — bắt đầu tại Thang máy số 3, đến Phòng 120 (tầng 2)', () => {
  const elev1 = mkNode({ id: 1, type: 'ELEVATOR', floorId: 1, x: 0.5, y: 0.5, label: 'Thang máy số 3' });
  const elev2 = mkNode({ id: 2, type: 'ELEVATOR', floorId: 2, x: 0.5, y: 0.5, label: 'Thang máy số 3' });
  const junc3 = mkNode({ id: 3, type: 'JUNCTION', floorId: 2, x: 0.5, y: 0.3 });
  const junc4 = mkNode({ id: 4, type: 'JUNCTION', floorId: 2, x: 0.3, y: 0.3 });
  const junc5 = mkNode({ id: 5, type: 'JUNCTION', floorId: 2, x: 0.3, y: 0.1 });
  const room6 = mkNode({ id: 6, type: 'ROOM',     floorId: 2, x: 0.3, y: 0.0, locationId: 20 });

  const path = [elev1, elev2, junc3, junc4, junc5, room6];
  const allFloorData: MapFloorData[] = [
    { floor: FLOOR_1, nodes: [elev1],                              edges: [] },
    { floor: FLOOR_2, nodes: [elev2, junc3, junc4, junc5, room6], edges: [] },
  ];

  const steps = buildSteps(path, allFloorData, LOCATIONS, FLOORS);

  it('bước đầu: Bắt đầu tại Thang máy số 3', () => {
    expect(steps[0].icon).toBe('📍');
    expect(steps[0].text).toBe('Bắt đầu tại Thang máy số 3');
  });

  it('bước kế: Ra khỏi thang máy (vì bắt đầu ở thang máy)', () => {
    expect(steps[1].text).toContain('Ra khỏi thang máy');
  });

  it('có bước rẽ phải', () => {
    const turn = steps.find(s => /rẽ.*phải/i.test(s.text));
    expect(turn).toBeTruthy();
    expect(turn!.icon).toBe('↪️');
  });

  it('bước cuối cùng trước đích nhắc đến Phòng 120', () => {
    const dest = steps[steps.length - 2];
    expect(dest.text).toContain('Phòng 120');
  });

  it('bước cuối: Bạn đã đến nơi tại Phòng 120', () => {
    const last = steps[steps.length - 1];
    expect(last.icon).toBe('🎯');
    expect(last.text).toBe('Bạn đã đến nơi');
    expect(last.sub).toBe('Phòng 120');
  });

  it('số lượng bước đã được tối ưu (merged)', () => {
    expect(steps).toHaveLength(4);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 2: đi xuống cầu thang từ tầng 2 → tầng 1
// Kiểm tra hướng "Đi xuống" (không phải "Đi lên")
// ─────────────────────────────────────────────────────────────────────────────
describe('Scenario 2 — xuống cầu thang từ tầng 2 sang tầng 1', () => {
  const start  = mkNode({ id: 1, type: 'JUNCTION', floorId: 2, x: 0.5, y: 0.9 });
  const stair2 = mkNode({ id: 2, type: 'STAIRS',   floorId: 2, x: 0.5, y: 0.5 });
  const stair1 = mkNode({ id: 3, type: 'STAIRS',   floorId: 1, x: 0.5, y: 0.5 });
  const junc4  = mkNode({ id: 4, type: 'JUNCTION', floorId: 1, x: 0.5, y: 0.3 });
  const room5  = mkNode({ id: 5, type: 'ROOM',     floorId: 1, x: 0.5, y: 0.1, locationId: 30 });

  const path = [start, stair2, stair1, junc4, room5];
  const allFloorData: MapFloorData[] = [
    { floor: FLOOR_1, nodes: [stair1, junc4, room5], edges: [] },
    { floor: FLOOR_2, nodes: [start, stair2],        edges: [] },
  ];

  const steps = buildSteps(path, allFloorData, LOCATIONS, FLOORS);

  it('bước cầu thang có icon 🪜', () => {
    const stairStep = steps.find(s => s.icon === '🪜');
    expect(stairStep).toBeTruthy();
  });

  it('nói "Đi xuống cầu thang" (không phải Đi lên)', () => {
    const stairStep = steps.find(s => s.icon === '🪜')!;
    expect(stairStep.text).toMatch(/Đi xuống cầu thang/);
    expect(stairStep.text).not.toMatch(/Đi lên/);
  });

  it('chỉ đích đến là Tầng 1', () => {
    const stairStep = steps.find(s => s.icon === '🪜')!;
    expect(stairStep.text).toContain('Tầng 1');
  });

  it('sau cầu thang có bước Ra khỏi cầu thang', () => {
    const exitStep = steps.find(s => s.text.includes('Ra khỏi cầu thang'));
    expect(exitStep).toBeTruthy();
  });

  it('điểm đến cuối: Khoa Nội', () => {
    expect(steps[steps.length - 1].sub).toBe('Khoa Nội');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 3: phát hiện phòng bên tay trái khi đi thẳng
// Khi đi thẳng về phía bắc (y giảm), Khoa Nội nằm phía tây (x nhỏ hơn) → trái
// ─────────────────────────────────────────────────────────────────────────────
describe('Scenario 3 — side detection: thấy Khoa Nội bên tay trái', () => {
  const start  = mkNode({ id: 1, type: 'JUNCTION', floorId: 1, x: 0.5, y: 0.9 });
  const junc2  = mkNode({ id: 2, type: 'JUNCTION', floorId: 1, x: 0.5, y: 0.5 });
  // roomL không nằm trong path, chỉ dùng để landmarkOf() phát hiện
  const roomL  = mkNode({ id: 6, type: 'ROOM',     floorId: 1, x: 0.4, y: 0.5, locationId: 30 });
  const junc3  = mkNode({ id: 3, type: 'JUNCTION', floorId: 1, x: 0.1, y: 0.5 });
  const room4  = mkNode({ id: 4, type: 'ROOM',     floorId: 1, x: 0.1, y: 0.2, locationId: 20 });

  const path = [start, junc2, junc3, room4];
  const allFloorData: MapFloorData[] = [
    { floor: FLOOR_1, nodes: [start, junc2, roomL, junc3, room4], edges: [
      // roomL nối trực tiếp với junc2 → phát hiện side landmark
      { id: 1, nodeFromId: 2, nodeToId: 6, weight: 0.1, bidirectional: true },
    ]},
  ];

  const steps = buildSteps(path, allFloorData, LOCATIONS, FLOORS);

  it('có bước nhắc đến "bên tay trái"', () => {
    const sideStep = steps.find(s => s.text.includes('bên tay trái'));
    expect(sideStep).toBeTruthy();
    expect(sideStep!.icon).toBe('↩️');
  });

  it('bước đó nhắc đến Khoa Nội', () => {
    const sideStep = steps.find(s => s.text.includes('bên tay trái'))!;
    expect(sideStep.text).toContain('Khoa Nội');
  });

  it('không nói "bên tay phải" nhầm chiều', () => {
    const sideStep = steps.find(s => s.text.includes('Khoa Nội'))!;
    expect(sideStep.text.includes('bên tay phải')).toBe(false);
  });

  it('cuối cùng đến Phòng 120', () => {
    expect(steps[steps.length - 1].sub).toBe('Phòng 120');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 4: thang máy nằm GIỮA lộ trình → sinh đủ bước "Đi thang máy lên"
// Đây là use-case chuẩn hơn Scenario 1 vì user không đứng ngay thang máy
// ─────────────────────────────────────────────────────────────────────────────
describe('Scenario 4 — thang máy ở giữa lộ trình, sinh đủ bước lên tầng', () => {
  const junc0  = mkNode({ id: 0, type: 'JUNCTION', floorId: 1, x: 0.3, y: 0.5 });
  const elev1  = mkNode({ id: 1, type: 'ELEVATOR', floorId: 1, x: 0.5, y: 0.5, label: 'Thang máy số 3' });
  const elev2  = mkNode({ id: 2, type: 'ELEVATOR', floorId: 2, x: 0.5, y: 0.5, label: 'Thang máy số 3' });
  const junc3  = mkNode({ id: 3, type: 'JUNCTION', floorId: 2, x: 0.5, y: 0.3 });
  const room4  = mkNode({ id: 4, type: 'ROOM',     floorId: 2, x: 0.5, y: 0.0, locationId: 20 });

  const path = [junc0, elev1, elev2, junc3, room4];
  const allFloorData: MapFloorData[] = [
    { floor: FLOOR_1, nodes: [junc0, elev1],        edges: [] },
    { floor: FLOOR_2, nodes: [elev2, junc3, room4], edges: [] },
  ];

  const steps = buildSteps(path, allFloorData, LOCATIONS, FLOORS);

  it('có bước đi đến Thang máy số 3', () => {
    const toElev = steps.find(s => s.text.includes('Thang máy số 3') && s.icon !== '📍');
    expect(toElev).toBeTruthy();
  });

  it('có bước Đi thang máy lên Tầng 2 với icon 🛗', () => {
    const elevStep = steps.find(s => s.icon === '🛗');
    expect(elevStep).toBeTruthy();
    expect(elevStep!.text).toBe('Đi thang máy lên Tầng 2');
  });

  it('sau thang máy có bước Ra khỏi thang máy', () => {
    const exitStep = steps.find(s => s.text.includes('Ra khỏi thang máy'));
    expect(exitStep).toBeTruthy();
  });

  it('kết thúc tại Phòng 120', () => {
    expect(steps[steps.length - 1].sub).toBe('Phòng 120');
  });

  it('thứ tự bước: đến thang máy → lên → ra khỏi → đến nơi', () => {
    const icons = steps.map(s => s.icon);
    const elevIdx = icons.indexOf('🛗');
    const exitIdx = steps.findIndex(s => s.text.includes('Ra khỏi thang máy'));
    expect(elevIdx).toBeGreaterThan(0);
    expect(exitIdx).toBeGreaterThan(elevIdx);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 5: dữ liệu thật Phòng 120 → Phòng 130 (cùng tầng, 4 ngã rẽ, đi vòng
// 3 cạnh 1 hình chữ nhật) — kiểm tra qualifier "một đoạn dài"/"một đoạn ngắn"
// gắn đúng chỗ khi các đoạn thẳng trong lộ trình chênh lệch rõ rệt về độ dài.
// ─────────────────────────────────────────────────────────────────────────────
describe('Scenario 5 — Phòng 120 → Phòng 130 (dữ liệu thật, có đoạn dài rõ rệt)', () => {
  const FLOOR_7 = mkFloor(7, 40);
  const room120 = mkNode({ id: 195, type: 'ROOM', floorId: 7, x: 0.24296296296296296, y: 0.1964728855603976, label: '120', locationId: 9 });
  const j198 = mkNode({ id: 198, type: 'JUNCTION', floorId: 7, x: 0.2437037037037037, y: 0.21606792148463014 });
  const j213 = mkNode({ id: 213, type: 'JUNCTION', floorId: 7, x: 0.10148148148148148, y: 0.21737425721291231 });
  const j214 = mkNode({ id: 214, type: 'JUNCTION', floorId: 7, x: 0.10444444444444445, y: 0.7806662292281138 });
  const j199 = mkNode({ id: 199, type: 'JUNCTION', floorId: 7, x: 0.2437037037037037, y: 0.7789671218337495 });
  const room130 = mkNode({ id: 197, type: 'ROOM', floorId: 7, x: 0.2437037037037037, y: 0.7571521861190348, label: '130', locationId: 19 });

  const path = [room120, j198, j213, j214, j199, room130];
  const nodes = path;
  const edges = [
    { id: 1, nodeFromId: 195, nodeToId: 198, weight: 0.02, bidirectional: true },
    { id: 2, nodeFromId: 198, nodeToId: 213, weight: 0.14, bidirectional: true },
    { id: 3, nodeFromId: 213, nodeToId: 214, weight: 0.56, bidirectional: true },
    { id: 4, nodeFromId: 214, nodeToId: 199, weight: 0.14, bidirectional: true },
    { id: 5, nodeFromId: 199, nodeToId: 197, weight: 0.02, bidirectional: true },
  ];
  const allFloorData: MapFloorData[] = [{ floor: FLOOR_7, nodes, edges }];
  const locations: Location[] = [
    { id: 40, name: 'Tầng 1', parentId: null },
    { id: 9, name: 'Phòng bệnh 120', parentId: 40 },
    { id: 19, name: 'Phòng 130', parentId: 40 },
  ];

  const steps = buildSteps(path, allFloorData, locations, [FLOOR_7]);

  it('có đúng 1 bước gắn "một đoạn dài" — ứng với đoạn 213→214 dài nhất', () => {
    const longSteps = steps.filter(s => s.text.includes('một đoạn dài'));
    expect(longSteps.length).toBe(1);
  });

  it('có bước gắn "một đoạn ngắn" cho đoạn ra khỏi phòng 120 (ngắn nhất)', () => {
    const shortSteps = steps.filter(s => s.text.includes('một đoạn ngắn'));
    expect(shortSteps.length).toBeGreaterThan(0);
  });

  it('3 lượt rẽ đầu: phải, trái, trái (khớp tính tay bằng công thức bearing)', () => {
    const turns = steps
      .filter(s => s.icon === '↪️' || s.icon === '↩️')
      .map(s => (s.icon === '↪️' ? 'right' : 'left'));
    expect(turns).toEqual(['right', 'left', 'left']);
  });

  it('lượt rẽ cuối (trái) được gộp vào câu "đã đến nơi — bên tay trái"', () => {
    const dest = steps[steps.length - 1];
    expect(dest.icon).toBe('🎯');
    expect(dest.text).toContain('bên tay trái');
  });
});
