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

  const getFloorNodes = (node: MapNode) => {
    if (!node) return [];
    return allFloorData.find(fd => fd?.nodes?.some(n => n?.id === node.id))?.nodes ?? [];
  };

  const doorOf = (node: MapNode): string | null => {
    if (!node) return null;
    const fNodes = getFloorNodes(node);
    let best: { label: string; dist: number } | null = null;
    for (const n of fNodes) {
      if (!n || n.id === node.id) continue;
      if (n.type !== 'ROOM' && n.type !== 'DEPARTMENT') continue;
      const lbl = nm(n); if (!lbl) continue;
      const dist = Math.hypot(n.x - node.x, n.y - node.y);
      if (!best || dist < best.dist) best = { label: lbl, dist };
    }
    return best && best.dist < DOOR_PROXIMITY ? `cửa ${best.label}` : null;
  };

  const nearbyRoom = (node: MapNode): string | null => {
    if (!node) return null;
    const fNodes = getFloorNodes(node);
    let best: { label: string; dist: number } | null = null;
    for (const n of fNodes) {
      if (!n || n.id === node.id) continue;
      const lbl = nm(n); if (!lbl) continue;
      const dist = Math.hypot(n.x - node.x, n.y - node.y);
      if (!best || dist < best.dist) best = { label: lbl, dist };
    }
    return best && best.dist < NEARBY_ROOM_PROXIMITY ? best.label : null;
  };

  const junctionMark = (node: MapNode): string | null => nm(node) ?? doorOf(node) ?? nearbyRoom(node);
  const straightDest = (toNode: MapNode): string | null => nm(toNode) ?? doorOf(toNode) ?? nearbyRoom(toNode);

  steps.push({ node: path[0], icon: '📍', text: `Bắt đầu tại ${nm(path[0]) ?? 'điểm xuất phát'}` });

  let needStraight = true;
  let startIdx = 1;

  const startIsRoom = path[0].type === 'ROOM' || path[0].type === 'DEPARTMENT';
  if (startIsRoom && path.length > 2 && path[1].type === 'JUNCTION') {
    const exitTurn = turnDir(path[0], path[1], path[2]);
    const dirText  = exitTurn === 'right' ? 'rẽ phải' : exitTurn === 'left' ? 'rẽ trái' : 'đi thẳng';
    const icon     = exitTurn === 'right' ? '↪️' : exitTurn === 'left' ? '↩️' : '➡️';
    steps.push({ node: path[1], icon, text: `Ra hành lang, ${dirText}` });
    startIdx = 2;
    needStraight = true;
  }

  const last         = path[path.length - 1];
  const secondLast   = path[path.length - 2];
  const endIsRoom    = last?.type === 'ROOM' || last?.type === 'DEPARTMENT';
  const entryIsJunction = path.length > 2 && secondLast?.type === 'JUNCTION' && endIsRoom;
  const loopEnd      = entryIsJunction ? path.length - 2 : path.length - 1;

  let lastStraightDest: string | null = null;
  let skipNextJunction = false;

  const addStraight = (toNode: MapNode) => {
    if (!needStraight) return;
    const dest = straightDest(toNode);
    lastStraightDest = dest;
    steps.push({ node: toNode, icon: '➡️', text: dest ? `Đi thẳng đến ${dest}` : 'Đi thẳng' });
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
      const dirText   = exitTurn === 'right' ? 'rẽ phải' : exitTurn === 'left' ? 'rẽ trái' : 'đi thẳng';
      const icon      = exitTurn === 'right' ? '↪️' : exitTurn === 'left' ? '↩️' : '➡️';
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
      addStraight(curr);
      steps.push({ node: curr, icon: '🪜', text: nextFloor ? `Lên/xuống cầu thang sang ${nextFloor}` : `Đi qua cầu thang${n ? ` ${n}` : ''}` });
      needStraight = true; continue;
    }
    if (curr.type === 'ELEVATOR') {
      addStraight(curr);
      steps.push({ node: curr, icon: '🛗', text: nextFloor ? `Đi thang máy đến ${nextFloor}` : `Vào thang máy${n ? ` ${n}` : ''}` });
      needStraight = true; continue;
    }
    if (curr.type === 'ENTRANCE') {
      addStraight(curr);
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
    const mark = junctionMark(curr);
    if (mark && !mergeWithPrevStraight(`Rẽ ${dir} vào ${mark}`, icon, curr)) {
      addStraight(curr);
      steps.push({ node: curr, icon, text: mark ? `Rẽ ${dir} tại ${mark}` : `Rẽ ${dir}` });
    } else if (!mark) {
      addStraight(curr);
      steps.push({ node: curr, icon, text: `Rẽ ${dir}` });
    }
    needStraight = true;
  }

  if (needStraight && last) {
    const dest = entryIsJunction
      ? (nm(last) ? `cửa ${nm(last)}` : null)
      : (doorOf(secondLast) ?? straightDest(last));
    steps.push({ node: last, icon: '➡️', text: dest ? `Đi thẳng đến ${dest}` : 'Đi thẳng' });
  }
  if (last) {
    steps.push({ node: last, icon: '🎯', text: 'Bạn đã đến nơi', sub: nm(last) ?? undefined, highlight: true });
  }
  return steps;
};
