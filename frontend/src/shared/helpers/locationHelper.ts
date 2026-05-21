import { Location } from '@/shared/types';

export const sortLocationsHierarchically = (locations: Location[]): Location[] => {
  return [...locations].sort((a, b) => {
    const pathA = a.path || '';
    const pathB = b.path || '';
    
    const partsA = pathA.split('.');
    const partsB = pathB.split('.');
    const minLength = Math.min(partsA.length, partsB.length);
    
    for (let i = 0; i < minLength; i++) {
      const numA = Number(partsA[i]);
      const numB = Number(partsB[i]);
      
      if (!isNaN(numA) && !isNaN(numB)) {
        if (numA !== numB) return numA - numB;
      } else {
        if (partsA[i] !== partsB[i]) {
          return partsA[i].localeCompare(partsB[i]);
        }
      }
    }
    
    return partsA.length - partsB.length;
  });
};

export const getDepth = (path?: string): number => {
  if (!path) return 0;
  return path.split('.').length - 1;
};

export const getTypeLabel = (type?: string): string => {
  switch (type) {
    case 'BUILDING': return 'Tòa nhà';
    case 'FLOOR': return 'Tầng';
    case 'DEPARTMENT': return 'Khoa/Phòng';
    case 'ROOM': return 'Phòng';
    default: return type || '';
  }
};

export const getIndentedLocationName = (loc: Location): string => {
  const depth = getDepth(loc.path);
  const prefix = '\u00A0\u00A0\u00A0\u00A0'.repeat(depth) + (depth > 0 ? '├─ ' : '');
  const typeLabel = loc.type ? ` (${getTypeLabel(loc.type)})` : '';
  return `${prefix}${loc.name}${typeLabel}`;
};

export const getFullLocationPath = (locationId: number | undefined, locations: Location[]): string => {
  if (!locationId) return 'Chưa xác định';
  
  const pathParts: string[] = [];
  let currentId: number | null = locationId;
  const visited = new Set<number>();

  while (currentId !== null && currentId !== undefined && !visited.has(currentId)) {
    visited.add(currentId);
    const found = locations.find(loc => loc.id === currentId);
    if (!found) break;
    
    pathParts.unshift(found.name);
    currentId = found.parentId;
  }

  return pathParts.join(' / ');
};

export interface LocationLevels {
  buildingId: number | '';
  floorId: number | '';
  roomId: number | '';
}

export const resolveLocationLevels = (locationId: number | undefined, locations: Location[]): LocationLevels => {
  const result: LocationLevels = { buildingId: '', floorId: '', roomId: '' };
  if (!locationId || locations.length === 0) return result;

  const chain: Location[] = [];
  let currentId: number | null = locationId;
  const visited = new Set<number>();

  while (currentId !== null && currentId !== undefined && !visited.has(currentId)) {
    visited.add(currentId);
    const found = locations.find(loc => loc.id === currentId);
    if (!found) break;
    
    chain.unshift(found);
    currentId = found.parentId;
  }

  if (chain.length > 0) {
    result.buildingId = chain[0].id;
  }
  if (chain.length > 1) {
    result.floorId = chain[1].id;
  }
  if (chain.length > 2) {
    result.roomId = chain[2].id;
  }

  return result;
};
