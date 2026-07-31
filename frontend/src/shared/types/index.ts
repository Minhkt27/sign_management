export interface Location {
  id: number;
  locationCode?: string;
  name: string;
  parentId: number | null;
  path?: string;
  description?: string;
  type?: 'BUILDING' | 'FLOOR' | 'DEPARTMENT' | 'ROOM';
  createdAt?: string;
  updatedAt?: string;
}

export interface Hospital {
  id: number;
  name: string;
  shortCode: string;
  address?: string;
  phone?: string;
  email?: string;
  latitude?: number | null;
  longitude?: number | null;
  gpsRadiusM: number;
  logoUrl?: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LocationTreeNode {
  location: Location;
  children: LocationTreeNode[];
}

export interface SignType {
  id: number;
  code: string;
  name: string;
  description?: string;
  hospitalId?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Asset {
  id: string; // UUID
  assetCode: string;
  name?: string;
  description?: string;
  locationDescription?: string;
  location: Location;
  signTypeId?: number;
  material: 'MICA' | 'INOX' | 'LED' | 'ALU';
  size: string;
  status: 'ACTIVE' | 'DAMAGED' | 'REPAIRING' | 'SCRAPPED';
  installedAt?: string;
  supplier?: string;
  imageUrl?: string;
  hospitalId?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type UiMode = 'ADMIN' | 'TECHNICIAN';

export interface Role {
  id: number;
  code: string;
  name: string;
  description?: string;
  uiMode: UiMode;
  permissions: string[];
}

export interface User {
  id: number;
  username: string;
  fullName: string;
  roleId: number;
  phone?: string;
  customPermissions: string[];
  isActive: boolean;
  hospitalId?: number;
}

export type NodeType = 'ROOM' | 'DEPARTMENT' | 'JUNCTION' | 'STAIRS' | 'ELEVATOR' | 'ENTRANCE';

export interface MapFloor {
  id: number;
  locationId: number | null;
  imageUrl: string;
  imgWidth: number;
  imgHeight: number;
  campus: boolean;
  hospitalId?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface MapNode {
  id: number;
  floorId: number;
  x: number;
  y: number;
  type: NodeType;
  label?: string;
  locationId?: number;
  assetId?: string;
  linkedCampusNodeId?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type SegmentType = 'INDOOR' | 'OUTDOOR';

export interface PathSegment {
  type: SegmentType;
  nodes: MapNode[];
}

export interface WayfindingResult {
  segments: PathSegment[];
}

export interface MapEdge {
  id: number;
  nodeFromId: number;
  nodeToId: number;
  weight: number;
  bidirectional: boolean;
  createdAt?: string;
}

export interface MapFloorData {
  floor: MapFloor;
  nodes: MapNode[];
  edges: MapEdge[];
}

export interface MaintenanceTicket {
  id: number;
  asset: Asset; // In Java, does MaintenanceTicket contain Asset object or Asset ID? Let's check.
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  ticketStatus: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  reporter: User;
  assignee: User | null;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
  rejectionNote?: string;
  rejectionCount?: number;
  imageBefore?: string;
  imageAfter?: string;
  source?: 'MANUAL' | 'QR_SCAN';
  hospitalId?: number;
}
