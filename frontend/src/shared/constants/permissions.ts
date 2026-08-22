export const PERMISSION_GROUPS = [
  {
    group: 'Hệ thống & Phân quyền',
    permissions: [
      { id: 'ROLE_VIEW', name: 'Xem danh sách Nhóm quyền' },
      { id: 'ROLE_MANAGE', name: 'Quản lý Nhóm quyền (Thêm, Sửa, Xóa)' },
      { id: 'USER_VIEW', name: 'Xem danh sách Tài khoản' },
      { id: 'USER_MANAGE', name: 'Quản lý Tài khoản (Thêm, Cấp quyền)' },
    ],
  },
  {
    group: 'Quản lý Biển báo & Sơ đồ',
    permissions: [
      { id: 'ASSET_VIEW', name: 'Xem danh sách Biển báo' },
      { id: 'ASSET_MANAGE', name: 'Quản lý Biển báo (Thêm, Sửa, Xóa)' },
      { id: 'MAP_VIEW', name: 'Xem Sơ đồ' },
      { id: 'MAP_MANAGE', name: 'Quản lý Sơ đồ (Thêm vị trí, Gắn biển báo)' },
    ],
  },
  {
    group: 'Bảo trì & Sự cố',
    permissions: [
      { id: 'TICKET_VIEW', name: 'Xem danh sách Phiếu bảo trì' },
      { id: 'TICKET_MANAGE', name: 'Xử lý Phiếu bảo trì' },
      { id: 'TICKET_CREATE', name: 'Tạo Phiếu bảo trì' },
    ],
  },
  {
    group: 'Tệp tin',
    permissions: [
      { id: 'FILE_UPLOAD', name: 'Tải lên hình ảnh/Tệp tin' },
    ],
  },
];
