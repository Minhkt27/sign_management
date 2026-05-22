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

export interface LocationTreeNode {
  location: Location;
  children: LocationTreeNode[];
}

export interface SignType {
  id: number;
  code: string;
  name: string;
  description?: string;
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
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  id: number;
  username: string;
  fullName: string;
  role: 'ADMIN' | 'TECHNICAL';
  isActive: boolean;
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
  imageBefore?: string;
  imageAfter?: string;
  source?: 'MANUAL' | 'QR_SCAN';
}
