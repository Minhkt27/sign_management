import { MapNode, MapFloorData, Location, MapFloor } from '@/shared/types';

// Node coordinates are normalised 0–1. These thresholds are in that space.
// DOOR_PROXIMITY: junction nằm sát cửa phòng (≈ 5% chiều dài floor map)
const DOOR_PROXIMITY = 0.05;
// NEARBY_ROOM: ngưỡng "gần nhất" để gợi ý tên landmark khi không có cửa trực tiếp
const NEARBY_ROOM_PROXIMITY = 0.12;

export type PathStep = {
  node: MapNode;
  icon: string;
  text: string;
  sub?: string;
  highlight?: boolean;
};

export const turnDir = (prev: MapNode, curr: MapNode, next: MapNode): 'left' | 'right' | 'straight' => {
  const dx1 = curr.x - prev.x, dy1 = curr.y - prev.y;
  const dx2 = next.x - curr.x, dy2 = next.y - curr.y;
  const cross = dx1 * dy2 - dy1 * dx2; // dương = rẽ phải (screen coords y↓)
  const dot   = dx1 * dx2 + dy1 * dy2;
  const angle = Math.atan2(Math.abs(cross), dot) * 180 / Math.PI;
  if (angle < 45) return 'straight';
  return cross > 0 ? 'right' : 'left';
};

export const displayName = (node: MapNode, locations: Location[]): string | null => {
  if (!node) return null;
  const loc = node.locationId ? locations.find(l => l?.id === node.locationId) : null;
  return loc?.name ?? node.label ?? null;
};

export const floorName = (floorId: number, floors: MapFloor[], locations: Location[]): string => {
  const floor = floors.find(f => f?.id === floorId);
  if (!floor) return `Tầng #${floorId}`;
  return locations.find(l => l?.id === floor.locationId)?.name ?? `Tầng #${floorId}`;
};

// Landmark node kèm tên hiển thị
type NearbyNode = { name: string; node: MapNode } | null;

// Target đang ở bên tay nào khi đi từ `from` hướng `to`?
const sideOf = (from: MapNode, to: MapNode, target: MapNode): 'trái' | 'phải' | null => {
  const dx = to.x - from.x, dy = to.y - from.y;
  const rx = target.x - from.x, ry = target.y - from.y;
  const cross = dx * ry - dy * rx; // screen coords y↓: cross > 0 → phải
  if (Math.abs(cross) < 0.005) return null;
  return cross > 0 ? 'phải' : 'trái';
};

// Phân loại độ dài đoạn thẳng theo normalized distance
const segDistLabel = (a: MapNode, b: MapNode): string => {
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  if (d >= 0.20) return ' một đoạn khá dài';
  if (d >= 0.08) return ' một đoạn';
  return '';
};

export const buildSteps = (
  path: MapNode[],
  allFloorData: MapFloorData[],
  locations: Location[],
  floors: MapFloor[]
): PathStep[] => {
  if (path.length === 0) return [];
  const steps: PathStep[] = [];
  const nm = (n: MapNode) => displayName(n, locations);
  const fn = (fid: number) => floorName(fid, floors, locations);

  const getFloorNodes = (node: MapNode): MapNode[] => {
    if (!node) return [];
    return allFloorData.find(fd => fd?.nodes?.some(n => n?.id === node.id))?.nodes ?? [];
  };

  // Trả về node cửa phòng gần nhất kèm tên
  const doorOfNode = (node: MapNode, fNodes: MapNode[]): NearbyNode => {
    let best: { name: string; node: MapNode; dist: number } | null = null;
    for (const n of fNodes) {
      if (!n || n.id === node.id) continue;
      if (n.type !== 'ROOM' && n.type !== 'DEPARTMENT') continue;
      const lbl = nm(n); if (!lbl) continue;
      const dist = Math.hypot(n.x - node.x, n.y - node.y);
      if (!best || dist < best.dist) best = { name: lbl, node: n, dist };
    }
    return best && best.dist < DOOR_PROXIMITY ? { name: `cửa ${best.name}`, node: best.node } : null;
  };

  // Trả về node phòng gần nhất trong ngưỡng NEARBY_ROOM_PROXIMITY.
  // Bỏ qua ELEVATOR/STAIRS (waypoint điều hướng, không phải landmark phòng)
  // và bỏ qua excludeId (thường là node vừa rời khỏi, tránh quay lại phía sau lưng)
  const nearbyRoomNode = (node: MapNode, fNodes: MapNode[], excludeId?: number): NearbyNode => {
    let best: { name: string; node: MapNode; dist: number } | null = null;
    for (const n of fNodes) {
      if (!n || n.id === node.id) continue;
      if (excludeId !== undefined && n.id === excludeId) continue;
      if (n.type === 'ELEVATOR' || n.type === 'STAIRS') continue;
      const lbl = nm(n); if (!lbl) continue;
      const dist = Math.hypot(n.x - node.x, n.y - node.y);
      if (!best || dist < best.dist) best = { name: lbl, node: n, dist };
    }
    return best && best.dist < NEARBY_ROOM_PROXIMITY ? { name: best.name, node: best.node } : null;
  };

  // Landmark tốt nhất của một node: ưu tiên tên chính → cửa phòng → phòng gần nhất.
  // excludeId: bỏ qua node cụ thể (thường là node vừa xuất phát)
  const landmarkOf = (node: MapNode, excludeId?: number): NearbyNode => {
    const selfName = nm(node);
    if (selfName) return { name: selfName, node };
    const fNodes = getFloorNodes(node);
    return doorOfNode(node, fNodes) ?? nearbyRoomNode(node, fNodes, excludeId);
  };

  // Chỉ cần tên landmark (dùng cho mô tả rẽ), bỏ qua prevId để tránh tham chiếu node phía sau lưng
  const junctionMark = (node: MapNode, prevId?: number): string | null => landmarkOf(node, prevId)?.name ?? null;

  steps.push({ node: path[0], icon: '📍', text: `Bắt đầu tại ${nm(path[0]) ?? 'điểm xuất phát'}` });

  let needStraight = true;
  let startIdx = 1;

  const startType = path[0].type;
  const isExitableStart = (startType === 'ROOM' || startType === 'DEPARTMENT'
    || startType === 'ELEVATOR' || startType === 'STAIRS')
    && path.length > 2 && path[1].type === 'JUNCTION';
  if (isExitableStart) {
    const exitTurn = turnDir(path[0], path[1], path[2]);
    const dirText  = exitTurn === 'right' ? 'rẽ phải' : exitTurn === 'left' ? 'rẽ trái' : 'đi thẳng';
    const icon     = exitTurn === 'right' ? '↪️' : exitTurn === 'left' ? '↩️' : '➡️';
    const startName = nm(path[0]);
    const exitText  = startName ? `Ra khỏi ${startName}` : (
      startType === 'ELEVATOR' ? 'Ra khỏi thang máy' :
      startType === 'STAIRS'   ? 'Ra khỏi cầu thang' : 'Ra hành lang'
    );
    steps.push({ node: path[1], icon, text: `${exitText}, ${dirText}` });
    startIdx = 2;
    needStraight = true;
  }

  const last             = path[path.length - 1];
  const secondLast       = path[path.length - 2];
  const endIsRoom        = last?.type === 'ROOM' || last?.type === 'DEPARTMENT';
  const entryIsJunction  = path.length > 2 && secondLast?.type === 'JUNCTION' && endIsRoom;
  const loopEnd          = entryIsJunction ? path.length - 2 : path.length - 1;

  let lastStraightDest: string | null = null;
  let skipNextJunction = false;

  const addStraight = (fromNode: MapNode, toNode: MapNode) => {
    if (!needStraight) return;

    // Exclude fromNode.id: tránh lấy node vừa rời làm landmark của toNode
    const lm   = landmarkOf(toNode, fromNode.id);
    const dist = segDistLabel(fromNode, toNode);
    let text: string;

    if (lm) {
      // Xác định landmark đang ở phía trước hay sang một bên
      const side = lm.node.id !== toNode.id
        ? sideOf(fromNode, toNode, lm.node)
        : null;
      text = side
        ? `Đi thẳng${dist}, thấy ${lm.name} bên tay ${side}`
        : `Đi thẳng${dist} đến ${lm.name}`;
    } else {
      text = dist ? `Đi thẳng${dist}` : 'Đi thẳng';
    }

    lastStraightDest = lm?.name ?? null;
    steps.push({ node: toNode, icon: '➡️', text });
    needStraight = false;
  };

  const mergeWithPrevStraight = (newText: string, newIcon: string, refNode: MapNode): boolean => {
    if (!lastStraightDest) return false;
    const lastStep = steps[steps.length - 1];
    if (!lastStep || lastStep.icon !== '➡️') return false;
    steps[steps.length - 1] = { node: refNode, icon: newIcon, text: newText };
    lastStraightDest = null;
    return true;
  };

  for (let i = startIdx; i < loopEnd; i++) {
    const prev = path[i - 1];
    const curr = path[i];
    const next = path[i + 1];
    const n    = nm(curr);
    const nextFloor = next.floorId !== curr.floorId ? fn(next.floorId) : null;

    const justArrived = prev.floorId !== curr.floorId;
    if (justArrived) {
      const transitType = prev.type === 'STAIRS' ? 'cầu thang' : 'thang máy';
      const exitTurn = turnDir(prev, curr, next);
      const dirText  = exitTurn === 'right' ? 'rẽ phải' : exitTurn === 'left' ? 'rẽ trái' : 'đi thẳng';
      const icon     = exitTurn === 'right' ? '↪️' : exitTurn === 'left' ? '↩️' : '➡️';
      steps.push({ node: curr, icon, text: `Ra khỏi ${transitType}, ${dirText}` });
      needStraight = true;
      skipNextJunction = true;
      continue;
    }

    if (skipNextJunction && curr.type === 'JUNCTION') {
      skipNextJunction = false;
      needStraight = true;
      continue;
    }
    skipNextJunction = false;

    if (curr.type === 'STAIRS') {
      addStraight(prev, curr);
      const goingUp = next.floorId > curr.floorId;
      const stairText = nextFloor
        ? (goingUp ? `Đi lên cầu thang sang ${nextFloor}` : `Đi xuống cầu thang sang ${nextFloor}`)
        : `Đi qua cầu thang${n ? ` ${n}` : ''}`;
      steps.push({ node: curr, icon: '🪜', text: stairText });
      needStraight = true; continue;
    }
    if (curr.type === 'ELEVATOR') {
      addStraight(prev, curr);
      const goingUp = next.floorId > curr.floorId;
      const elevText = nextFloor
        ? (goingUp ? `Đi thang máy lên ${nextFloor}` : `Đi thang máy xuống ${nextFloor}`)
        : `Vào thang máy${n ? ` ${n}` : ''}`;
      steps.push({ node: curr, icon: '🛗', text: elevText });
      needStraight = true; continue;
    }
    if (curr.type === 'ENTRANCE') {
      addStraight(prev, curr);
      steps.push({ node: curr, icon: '🚪', text: `Đi qua ${n || 'lối vào'}` });
      needStraight = true; continue;
    }

    if (next.type === 'STAIRS' || next.type === 'ELEVATOR') {
      needStraight = true; continue;
    }

    const turn = turnDir(prev, curr, next);
    if (turn === 'straight') { needStraight = true; continue; }

    const dir  = turn === 'right' ? 'phải' : 'trái';
    const icon = turn === 'right' ? '↪️' : '↩️';
    // prevId: bỏ qua node vừa rời khi tìm landmark tại điểm rẽ
    const mark = junctionMark(curr, prev.id);
    if (mark && !mergeWithPrevStraight(`Rẽ ${dir} vào ${mark}`, icon, curr)) {
      addStraight(prev, curr);
      steps.push({ node: curr, icon, text: `Rẽ ${dir} tại ${mark}` });
    } else if (!mark) {
      addStraight(prev, curr);
      steps.push({ node: curr, icon, text: `Rẽ ${dir}` });
    }
    needStraight = true;
  }

  if (needStraight && last) {
    const fromNode = secondLast ?? path[0];
    const dist = segDistLabel(fromNode, last);
    let text: string;

    if (entryIsJunction) {
      const finalName = nm(last);
      text = finalName
        ? `Đi thẳng${dist} đến cửa ${finalName}`
        : `Đi thẳng${dist}`;
    } else {
      const fNodes  = getFloorNodes(secondLast);
      const lm = doorOfNode(secondLast, fNodes) ?? landmarkOf(last);
      if (lm) {
        const side = lm.node.id !== last.id ? sideOf(fromNode, last, lm.node) : null;
        text = side
          ? `Đi thẳng${dist}, thấy ${lm.name} bên tay ${side}`
          : `Đi thẳng${dist} đến ${lm.name}`;
      } else {
        text = dist ? `Đi thẳng${dist}` : 'Đi thẳng';
      }
    }
    steps.push({ node: last, icon: '➡️', text });
  }

  if (last) {
    steps.push({ node: last, icon: '🎯', text: 'Bạn đã đến nơi', sub: nm(last) ?? undefined, highlight: true });
  }
  return steps;
};
