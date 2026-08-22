-- V10: Cập nhật lại đường dẫn ảnh cũ từ /signage-assets/ sang Cloudflare R2

-- Bảng map_floors
UPDATE map_floors 
SET image_url = REPLACE(image_url, '/signage-assets/', 'https://pub-40f8b19badd94bab8e93dd2ec83514d2.r2.dev/')
WHERE image_url LIKE '/signage-assets/%';

-- Bảng assets
UPDATE assets 
SET image_url = REPLACE(image_url, '/signage-assets/', 'https://pub-40f8b19badd94bab8e93dd2ec83514d2.r2.dev/')
WHERE image_url LIKE '/signage-assets/%';

-- Bảng maintenance_tickets (image_before)
UPDATE maintenance_tickets 
SET image_before = REPLACE(image_before, '/signage-assets/', 'https://pub-40f8b19badd94bab8e93dd2ec83514d2.r2.dev/')
WHERE image_before LIKE '/signage-assets/%';

-- Bảng maintenance_tickets (image_after)
UPDATE maintenance_tickets 
SET image_after = REPLACE(image_after, '/signage-assets/', 'https://pub-40f8b19badd94bab8e93dd2ec83514d2.r2.dev/')
WHERE image_after LIKE '/signage-assets/%';
