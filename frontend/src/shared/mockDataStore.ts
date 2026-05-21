// Types defined inline to avoid import issues

export interface MockLocation {
  id: number;
  name: string;
  parentId: number | null;
  path: string;
  description?: string;
  createdAt?: string;
}

export interface MockAsset {
  id: string;
  assetCode: string;
  locationId: number;
  material: 'MICA' | 'INOX' | 'LED' | 'ALU';
  size: string;
  status: 'ACTIVE' | 'DAMAGED' | 'REPAIRING' | 'SCRAPPED';
  installedAt: string;
  supplier: string;
}

export interface MockUser {
  id: number;
  username: string;
  fullName: string;
  role: 'ADMIN' | 'TECHNICAL';
  isActive: boolean;
}

export interface MockTicket {
  id: number;
  assetId: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  ticketStatus: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  reporterId: number;
  assigneeId: number | null;
  createdAt: string;
  updatedAt?: string;
  imageBefore?: string;
  imageAfter?: string;
}

// Initial Data
const initialLocations: MockLocation[] = [
  { id: 1, name: 'Tòa nhà A (Building A)', parentId: null, path: '1', description: 'Khu khám bệnh và điều trị ngoại trú', createdAt: '2024-01-01' },
  { id: 2, name: 'Tòa nhà B (Building B)', parentId: null, path: '2', description: 'Khu kỹ thuật cao và phòng mổ', createdAt: '2024-01-01' },
  { id: 3, name: 'Tầng 1 (Building A)', parentId: 1, path: '1.3', description: 'Tầng 1 Tòa nhà A', createdAt: '2024-01-02' },
  { id: 4, name: 'Tầng 2 (Building A)', parentId: 1, path: '1.4', description: 'Tầng 2 Tòa nhà A', createdAt: '2024-01-02' },
  { id: 5, name: 'Phòng cấp cứu (Emergency Room)', parentId: 3, path: '1.3.5', description: 'Cấp cứu bệnh nhân 24/7', createdAt: '2024-01-03' },
  { id: 6, name: 'Phòng mổ số 1 (Operating Room 1)', parentId: 4, path: '1.4.6', description: 'Phòng mổ vô trùng', createdAt: '2024-01-03' },
  { id: 7, name: 'Tầng 1 (Building B)', parentId: 2, path: '2.7', description: 'Tầng 1 Tòa nhà B', createdAt: '2024-01-02' },
  { id: 8, name: 'Phòng Chụp X-Ray (X-Ray Room)', parentId: 7, path: '2.7.8', description: 'Phòng chuẩn đoán hình ảnh', createdAt: '2024-01-03' },
];

const initialAssets: MockAsset[] = [
  { id: '11111111-1111-1111-1111-111111111111', assetCode: 'ASSET-ER-01', locationId: 5, material: 'LED', size: '100x40 cm', status: 'DAMAGED', installedAt: '2024-01-15', supplier: 'Mica Art Co.' },
  { id: '22222222-2222-2222-2222-222222222222', assetCode: 'ASSET-ER-02', locationId: 5, material: 'MICA', size: '40x20 cm', status: 'ACTIVE', installedAt: '2024-01-15', supplier: 'Mica Art Co.' },
  { id: '33333333-3333-3333-3333-333333333333', assetCode: 'ASSET-OR-01', locationId: 6, material: 'INOX', size: '60x30 cm', status: 'ACTIVE', installedAt: '2024-02-10', supplier: 'Inox Metalworks' },
  { id: '44444444-4444-4444-4444-444444444444', assetCode: 'ASSET-XR-01', locationId: 8, material: 'ALU', size: '80x45 cm', status: 'REPAIRING', installedAt: '2024-03-01', supplier: 'Alu Signs' },
  { id: '55555555-5555-5555-5555-555555555555', assetCode: 'ASSET-XR-02', locationId: 8, material: 'MICA', size: '30x15 cm', status: 'ACTIVE', installedAt: '2024-03-01', supplier: 'Alu Signs' }
];

const initialUsers: MockUser[] = [
  { id: 1, username: 'admin', fullName: 'Quản trị viên (Admin)', role: 'ADMIN', isActive: true },
  { id: 2, username: 'tech1', fullName: 'Nguyễn Văn Hùng', role: 'TECHNICAL', isActive: true },
  { id: 3, username: 'tech2', fullName: 'Trần Thị Lan', role: 'TECHNICAL', isActive: true }
];

const initialTickets: MockTicket[] = [
  { 
    id: 1001, 
    assetId: '11111111-1111-1111-1111-111111111111', 
    description: 'Bảng hiệu LED bị lỗi nhấp nháy bóng đèn liên tục, không hiển thị chữ cấp cứu.',
    priority: 'CRITICAL', 
    ticketStatus: 'OPEN', 
    reporterId: 1, 
    assigneeId: null, 
    createdAt: '2026-05-18T08:00:00Z' 
  },
  { 
    id: 1002, 
    assetId: '44444444-4444-4444-4444-444444444444', 
    description: 'Biển báo Inox phòng chụp X-Ray bị trầy xước bề mặt và lỏng ốc vít gắn tường.',
    priority: 'MEDIUM', 
    ticketStatus: 'IN_PROGRESS', 
    reporterId: 1, 
    assigneeId: 2, 
    createdAt: '2026-05-19T09:30:00Z',
    imageBefore: 'https://images.unsplash.com/photo-1584438784894-089d6a128f3e?w=500'
  }
];

export const mockDataStore = {
  // Initialize
  init: () => {
    if (!localStorage.getItem('mock_locations')) {
      localStorage.setItem('mock_locations', JSON.stringify(initialLocations));
    }
    if (!localStorage.getItem('mock_assets')) {
      localStorage.setItem('mock_assets', JSON.stringify(initialAssets));
    }
    if (!localStorage.getItem('mock_users')) {
      localStorage.setItem('mock_users', JSON.stringify(initialUsers));
    }
    if (!localStorage.getItem('mock_tickets')) {
      localStorage.setItem('mock_tickets', JSON.stringify(initialTickets));
    }
  },

  // Locations
  getLocations: (): MockLocation[] => {
    mockDataStore.init();
    return JSON.parse(localStorage.getItem('mock_locations') || '[]');
  },
  createLocation: (location: Omit<MockLocation, 'id' | 'path'>): MockLocation => {
    const locs = mockDataStore.getLocations();
    const newId = locs.length > 0 ? Math.max(...locs.map(l => l.id)) + 1 : 1;
    const parent = locs.find(l => l.id === location.parentId);
    const path = parent ? `${parent.path}.${newId}` : `${newId}`;
    
    const newLoc: MockLocation = {
      ...location,
      id: newId,
      path,
      createdAt: new Date().toISOString().split('T')[0]
    };
    
    locs.push(newLoc);
    localStorage.setItem('mock_locations', JSON.stringify(locs));
    return newLoc;
  },

  // Assets
  getAssets: (): MockAsset[] => {
    mockDataStore.init();
    return JSON.parse(localStorage.getItem('mock_assets') || '[]');
  },
  getAssetById: (id: string): MockAsset | undefined => {
    return mockDataStore.getAssets().find(a => a.id === id);
  },
  createAsset: (asset: Omit<MockAsset, 'id'>): MockAsset => {
    const assets = mockDataStore.getAssets();
    const newAsset: MockAsset = {
      ...asset,
      id: crypto.randomUUID()
    };
    assets.push(newAsset);
    localStorage.setItem('mock_assets', JSON.stringify(assets));
    return newAsset;
  },
  updateAsset: (id: string, updates: Partial<MockAsset>): MockAsset => {
    const assets = mockDataStore.getAssets();
    const index = assets.findIndex(a => a.id === id);
    if (index === -1) throw new Error('Asset not found');
    
    assets[index] = { ...assets[index], ...updates };
    localStorage.setItem('mock_assets', JSON.stringify(assets));
    return assets[index];
  },
  deleteAsset: (id: string) => {
    const assets = mockDataStore.getAssets();
    const filtered = assets.filter(a => a.id !== id);
    localStorage.setItem('mock_assets', JSON.stringify(filtered));
  },

  // Users
  getUsers: (): MockUser[] => {
    mockDataStore.init();
    return JSON.parse(localStorage.getItem('mock_users') || '[]');
  },

  // Tickets
  getTickets: (): MockTicket[] => {
    mockDataStore.init();
    return JSON.parse(localStorage.getItem('mock_tickets') || '[]');
  },
  getTicketById: (id: number): MockTicket | undefined => {
    return mockDataStore.getTickets().find(t => t.id === id);
  },
  createTicket: (ticket: Omit<MockTicket, 'id' | 'createdAt' | 'ticketStatus' | 'assigneeId'>): MockTicket => {
    const tickets = mockDataStore.getTickets();
    const newId = tickets.length > 0 ? Math.max(...tickets.map(t => t.id)) + 1 : 1001;
    
    const newTicket: MockTicket = {
      ...ticket,
      id: newId,
      ticketStatus: 'OPEN',
      assigneeId: null,
      createdAt: new Date().toISOString()
    };
    
    tickets.push(newTicket);
    localStorage.setItem('mock_tickets', JSON.stringify(tickets));
    
    // Also update asset status to DAMAGED
    mockDataStore.updateAsset(ticket.assetId, { status: 'DAMAGED' });
    
    return newTicket;
  },
  assignTicket: (id: number, assigneeId: number): MockTicket => {
    const tickets = mockDataStore.getTickets();
    const index = tickets.findIndex(t => t.id === id);
    if (index === -1) throw new Error('Ticket not found');
    
    tickets[index].assigneeId = assigneeId;
    tickets[index].ticketStatus = 'IN_PROGRESS';
    tickets[index].updatedAt = new Date().toISOString();
    
    localStorage.setItem('mock_tickets', JSON.stringify(tickets));
    
    // Also update asset status to REPAIRING
    mockDataStore.updateAsset(tickets[index].assetId, { status: 'REPAIRING' });
    
    return tickets[index];
  },
  updateTicketStatus: (id: number, status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED', imageBefore?: string, imageAfter?: string): MockTicket => {
    const tickets = mockDataStore.getTickets();
    const index = tickets.findIndex(t => t.id === id);
    if (index === -1) throw new Error('Ticket not found');
    
    tickets[index].ticketStatus = status;
    if (imageBefore) tickets[index].imageBefore = imageBefore;
    if (imageAfter) tickets[index].imageAfter = imageAfter;
    tickets[index].updatedAt = new Date().toISOString();
    
    localStorage.setItem('mock_tickets', JSON.stringify(tickets));
    
    // Update asset status accordingly
    let assetStatus: 'ACTIVE' | 'DAMAGED' | 'REPAIRING' | 'SCRAPPED' = 'ACTIVE';
    if (status === 'OPEN') assetStatus = 'DAMAGED';
    else if (status === 'IN_PROGRESS') assetStatus = 'REPAIRING';
    else if (status === 'RESOLVED' || status === 'CLOSED') assetStatus = 'ACTIVE';
    
    mockDataStore.updateAsset(tickets[index].assetId, { status: assetStatus });
    
    return tickets[index];
  }
};
