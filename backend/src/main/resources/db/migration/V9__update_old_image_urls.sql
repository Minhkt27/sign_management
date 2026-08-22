-- V9: Cập nhật toàn bộ các đường dẫn ảnh cũ từ local (/uploads/...) sang Cloudflare R2
-- Tên bảng có thể tham khảo từ Entity: MapFloorEntity (map_floors), AssetEntity (assets), MaintenanceTicketEntity (maintenance_tickets)

-- Bảng map_floors
UPDATE map_floors 
SET image_url = REPLACE(image_url, '/uploads/', 'https://pub-40f8b19badd94bab8e93dd2ec83514d2.r2.dev/')
WHERE image_url LIKE '/uploads/%';

-- Bảng assets
UPDATE assets 
SET image_url = REPLACE(image_url, '/uploads/', 'https://pub-40f8b19badd94bab8e93dd2ec83514d2.r2.dev/')
WHERE image_url LIKE '/uploads/%';

-- Bảng maintenance_tickets (image_before)
UPDATE maintenance_tickets 
SET image_before = REPLACE(image_before, '/uploads/', 'https://pub-40f8b19badd94bab8e93dd2ec83514d2.r2.dev/')
WHERE image_before LIKE '/uploads/%';

-- Bảng maintenance_tickets (image_after)
UPDATE maintenance_tickets 
SET image_after = REPLACE(image_after, '/uploads/', 'https://pub-40f8b19badd94bab8e93dd2ec83514d2.r2.dev/')
WHERE image_after LIKE '/uploads/%';
