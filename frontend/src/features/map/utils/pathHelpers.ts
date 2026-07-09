import { MapNode, MapFloorData, Location, MapFloor } from '@/shared/types';

// Loại bỏ dấu tiếng Việt để tìm kiếm không phân biệt dấu.
// "phong" khớp "Phòng", "khu x ray" khớp "Khu X-Quang".
export const normalize = (s: string) =>
  s.normalize('NFD')
   .replace(/\p{Mn}/gu, '')  // strip all combining marks: à→a, ò→o, ê→e …
   .replace(/[đĐ]/g, 'd')   // đ/Đ không decompose qua NFD, phải xử lý riêng
   .toLowerCase();

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
  const dot = dx1 * dx2 + dy1 * dy2;
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
  const len1 = Math.hypot(dx, dy);
  const len2 = Math.hypot(rx, ry);
  if (len1 < 1e-5 || len2 < 1e-5) return null;
  const cross = (dx / len1) * (ry / len2) - (dy / len1) * (rx / len2);
  if (Math.abs(cross) < 0.15) return null; // sin(theta) < 0.15 => theta < ~8.6 degrees
  return cross > 0 ? 'phải' : 'trái';
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

  // Lookup nhanh: nodeId → node object và type
  const nodeMap = new Map<number, MapNode>();
  const nodeTypeMap = new Map<number, string>();
  for (const fd of allFloorData) {
    for (const n of fd.nodes ?? []) {
      if (n) { nodeMap.set(n.id, n); nodeTypeMap.set(n.id, n.type); }
    }
  }

  // adjacencyMap: nodeId → danh sách neighbor id (từ edges, có bidirectional)
  // navDegreeMap: số cạnh JUNCTION↔JUNCTION — dùng để xác định ngã 3/4
  const NAV_TYPES = new Set(['JUNCTION', 'ENTRANCE']);
  const adjacencyMap = new Map<number, number[]>();
  const navDegreeMap = new Map<number, number>();
  for (const fd of allFloorData) {
    for (const edge of fd.edges ?? []) {
      if (!edge) continue;
      const { nodeFromId: f, nodeToId: t, bidirectional: bi } = edge;
      if (!adjacencyMap.has(f)) adjacencyMap.set(f, []);
      adjacencyMap.get(f)!.push(t);
      if (bi) {
        if (!adjacencyMap.has(t)) adjacencyMap.set(t, []);
        adjacencyMap.get(t)!.push(f);
      }
      const ft = nodeTypeMap.get(f), tt = nodeTypeMap.get(t);
      if (NAV_TYPES.has(ft ?? '') && NAV_TYPES.has(tt ?? '')) {
        navDegreeMap.set(f, (navDegreeMap.get(f) ?? 0) + 1);
        if (bi) navDegreeMap.set(t, (navDegreeMap.get(t) ?? 0) + 1);
      }
    }
  }

  // Phòng/khoa nối trực tiếp qua cạnh đồ thị
  const connectedRoom = (node: MapNode, excludeId?: number): NearbyNode => {
    for (const nid of adjacencyMap.get(node.id) ?? []) {
      if (excludeId !== undefined && nid === excludeId) continue;
      const t = nodeTypeMap.get(nid);
      if (t !== 'ROOM' && t !== 'DEPARTMENT') continue;
      const n = nodeMap.get(nid);
      if (!n) continue;
      const lbl = nm(n);
      if (lbl) return { name: lbl, node: n };
    }
    return null;
  };

  // Landmark: tên chính của node → phòng nối trực tiếp → null
  const landmarkOf = (node: MapNode, excludeId?: number): NearbyNode => {
    const selfName = nm(node);
    if (selfName) return { name: selfName, node };
    return connectedRoom(node, excludeId);
  };

  const junctionMark = (node: MapNode, prevId?: number): string | null => landmarkOf(node, prevId)?.name ?? null;

  // Mô tả topo điểm rẽ khi không có landmark
  const topoLabel = (node: MapNode): string | null => {
    if (!NAV_TYPES.has(node.type)) return null;
    const deg = navDegreeMap.get(node.id) ?? 0;
    if (deg === 3) return 'ngã 3';
    if (deg >= 4) return 'ngã 4';
    return null;
  };

  steps.push({ node: path[0], icon: '📍', text: `Bắt đầu tại ${nm(path[0]) ?? 'điểm xuất phát'}` });

  let needStraight = true;
  let startIdx = 1;

  const startType = path[0].type;
  const isExitableStart = (startType === 'ROOM' || startType === 'DEPARTMENT'
    || startType === 'ELEVATOR' || startType === 'STAIRS')
    && path.length > 2 && path[1].type === 'JUNCTION';
  if (isExitableStart) {
    const exitTurn = turnDir(path[0], path[1], path[2]);
    const dirText = exitTurn === 'right' ? 'rẽ phải' : exitTurn === 'left' ? 'rẽ trái' : 'đi thẳng';
    // ⬆️ khi đi thẳng ra hành lang, không dùng ➡️ tránh nhầm "rẽ phải"
    const icon = exitTurn === 'right' ? '↪️' : exitTurn === 'left' ? '↩️' : '⬆️';
    const startName = nm(path[0]);
    const exitText = startName ? `Ra khỏi ${startName}` : (
      startType === 'ELEVATOR' ? 'Ra khỏi thang máy' :
        startType === 'STAIRS' ? 'Ra khỏi cầu thang' : 'Ra hành lang'
    );
    steps.push({ node: path[1], icon, text: `${exitText}, ${dirText}` });
    startIdx = 2;
    needStraight = true;
  }

  const last = path[path.length - 1];
  const secondLast = path[path.length - 2];
  const endIsRoom = last?.type === 'ROOM' || last?.type === 'DEPARTMENT';
  const entryIsJunction = path.length > 2 && secondLast?.type === 'JUNCTION' && endIsRoom;
  const loopEnd = entryIsJunction ? path.length - 2 : path.length - 1;

  let skipNextJunction = false;

  // ⬆️ là icon duy nhất cho "đi thẳng" — dùng để nhận biết khi merge
  const addStraight = (fromNode: MapNode, toNode: MapNode) => {
    if (!needStraight) return;
    const lm = landmarkOf(toNode, fromNode.id);
    let text: string;
    if (lm) {
      const side = lm.node.id !== toNode.id ? sideOf(fromNode, toNode, lm.node) : null;
      text = side ? `Đi thẳng, thấy ${lm.name} bên tay ${side}` : `Đi thẳng đến ${lm.name}`;
    } else {
      const topo = topoLabel(toNode);
      text = topo ? `Đi thẳng đến ${topo}` : 'Đi thẳng';
    }
    steps.push({ node: toNode, icon: '⬆️', text });
    needStraight = false;
  };

  // Merge bước "rẽ" vào bước "đi thẳng" trước đó nếu có (nhận biết qua icon ⬆️)
  const mergeWithPrevStraight = (newText: string, newIcon: string, refNode: MapNode): boolean => {
    const lastStep = steps[steps.length - 1];
    if (!lastStep || lastStep.icon !== '⬆️') return false;

    if (lastStep.text.startsWith('Ra khỏi') || lastStep.text.includes('bên tay')) {
      const baseText = lastStep.text.replace(', đi thẳng', '');
      const turnSuffix = newText.startsWith('Đến') ? newText.split(',')[1].trim() : newText.toLowerCase();
      steps[steps.length - 1] = { node: refNode, icon: newIcon, text: `${baseText}, ${turnSuffix}` };
      return true;
    }

    steps[steps.length - 1] = { node: refNode, icon: newIcon, text: newText };
    return true;
  };

  for (let i = startIdx; i < loopEnd; i++) {
    const prev = path[i - 1];
    const curr = path[i];
    const next = path[i + 1];
    const n = nm(curr);
    const nextFloor = next.floorId !== curr.floorId ? fn(next.floorId) : null;

    const justArrived = prev.floorId !== curr.floorId;
    if (justArrived) {
      const transitType = prev.type === 'STAIRS' ? 'cầu thang' : 'thang máy';
      const exitTurn = turnDir(prev, curr, next);
      const dirText = exitTurn === 'right' ? 'rẽ phải' : exitTurn === 'left' ? 'rẽ trái' : 'đi thẳng';
      const icon = exitTurn === 'right' ? '↪️' : exitTurn === 'left' ? '↩️' : '⬆️';
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
      // Named entrance: skip addStraight — "Đi qua X" already implies "go there".
      // Unnamed: keep addStraight as direction hint.
      if (!n) addStraight(prev, curr);
      steps.push({ node: curr, icon: '🚪', text: n ? `Đi qua ${n}` : 'Đi qua lối vào' });
      needStraight = true; continue;
    }

    if (next.type === 'STAIRS' || next.type === 'ELEVATOR') {
      needStraight = true; continue;
    }

    const turn = turnDir(prev, curr, next);
    if (turn === 'straight') { needStraight = true; continue; }

    const dir = turn === 'right' ? 'phải' : 'trái';
    const icon = turn === 'right' ? '↪️' : '↩️';
    const mark = junctionMark(curr, prev.id);
    const topo = !mark ? topoLabel(curr) : null;
    const contextMark = mark ?? topo; // landmark → ngã 3/4 → null

    // Capture what came before — used to add "Sau đó" connector on consecutive turns
    const prevStepIcon = steps[steps.length - 1]?.icon ?? '';
    const prevWasTurn = prevStepIcon === '↪️' || prevStepIcon === '↩️';

    // With context: concise "rẽ phải" (landmark already orients the user)
    // Without context: natural "rẽ sang phải/trái" + connector "Sau đó" when consecutive
    const noCtxText = prevWasTurn ? `Sau đó rẽ sang ${dir}` : `Rẽ sang ${dir}`;
    const mergeText = contextMark ? `Đến ${contextMark}, rẽ ${dir}` : noCtxText;

    // Merge bước rẽ vào bước "đi thẳng" kề trước (nếu có) — 2 lần thử:
    // Lần 1: trước addStraight (⬆️ đã có sẵn từ trước)
    // Lần 2: sau addStraight (⬆️ vừa được thêm vào)
    if (!mergeWithPrevStraight(mergeText, icon, curr)) {
      addStraight(prev, curr);
      if (!mergeWithPrevStraight(mergeText, icon, curr)) {
        steps.push({ node: curr, icon, text: contextMark ? `Rẽ ${dir} tại ${contextMark}` : noCtxText });
      }
    }
    needStraight = true;
  }

  if (needStraight && last && path.length > 1) {
    const fromNode = secondLast ?? path[0];
    let text: string;
    if (entryIsJunction) {
      const finalName = nm(last);
      text = finalName ? `Đi thẳng đến cửa ${finalName}` : 'Đi thẳng';
    } else {
      const lm = connectedRoom(fromNode) ?? landmarkOf(last);
      if (lm) {
        const side = lm.node.id !== last.id ? sideOf(fromNode, last, lm.node) : null;
        text = side ? `Đi thẳng, thấy ${lm.name} bên tay ${side}` : `Đi thẳng đến ${lm.name}`;
      } else {
        text = 'Đi thẳng';
      }
    }
    steps.push({ node: last, icon: '⬆️', text });
  }

  if (last) {
    const destName = nm(last);
    let sideText = '';
    if (endIsRoom && path.length >= 3) {
      const thirdFromLast = path[path.length - 3];
      const turn = turnDir(thirdFromLast, secondLast!, last);
      if (turn === 'left') sideText = ' — bên tay trái';
      else if (turn === 'right') sideText = ' — bên tay phải';
    }
    steps.push({ node: last, icon: '🎯', text: `Bạn đã đến nơi${sideText}`, sub: destName ?? undefined, highlight: true });
  }
  return steps;
};
