-- V11: Cập nhật triệt để mọi định dạng URL cũ, bỏ giới hạn bắt đầu chuỗi và thêm điều kiện lọc rỗng

-- Bảng map_floors
UPDATE map_floors 
SET image_url = REPLACE(REPLACE(image_url, 'http://localhost:9000/signage-assets/', 'https://pub-40f8b19badd94bab8e93dd2ec83514d2.r2.dev/'), '/signage-assets/', 'https://pub-40f8b19badd94bab8e93dd2ec83514d2.r2.dev/')
WHERE image_url IS NOT NULL AND image_url != '' AND (image_url LIKE '%/signage-assets/%' OR image_url LIKE '%localhost%');

-- Bảng assets
UPDATE assets 
SET image_url = REPLACE(REPLACE(image_url, 'http://localhost:9000/signage-assets/', 'https://pub-40f8b19badd94bab8e93dd2ec83514d2.r2.dev/'), '/signage-assets/', 'https://pub-40f8b19badd94bab8e93dd2ec83514d2.r2.dev/')
WHERE image_url IS NOT NULL AND image_url != '' AND (image_url LIKE '%/signage-assets/%' OR image_url LIKE '%localhost%');

-- Bảng maintenance_tickets (image_before)
UPDATE maintenance_tickets 
SET image_before = REPLACE(REPLACE(image_before, 'http://localhost:9000/signage-assets/', 'https://pub-40f8b19badd94bab8e93dd2ec83514d2.r2.dev/'), '/signage-assets/', 'https://pub-40f8b19badd94bab8e93dd2ec83514d2.r2.dev/')
WHERE image_before IS NOT NULL AND image_before != '' AND (image_before LIKE '%/signage-assets/%' OR image_before LIKE '%localhost%');

-- Bảng maintenance_tickets (image_after)
UPDATE maintenance_tickets 
SET image_after = REPLACE(REPLACE(image_after, 'http://localhost:9000/signage-assets/', 'https://pub-40f8b19badd94bab8e93dd2ec83514d2.r2.dev/'), '/signage-assets/', 'https://pub-40f8b19badd94bab8e93dd2ec83514d2.r2.dev/')
WHERE image_after IS NOT NULL AND image_after != '' AND (image_after LIKE '%/signage-assets/%' OR image_after LIKE '%localhost%');

-- Fix lỗi trùng lặp (nếu có)
UPDATE map_floors SET image_url = REPLACE(image_url, 'https://pub-40f8b19badd94bab8e93dd2ec83514d2.r2.dev/https://pub-40f8b19badd94bab8e93dd2ec83514d2.r2.dev/', 'https://pub-40f8b19badd94bab8e93dd2ec83514d2.r2.dev/') WHERE image_url LIKE '%https://pub-%https://pub-%';
UPDATE assets SET image_url = REPLACE(image_url, 'https://pub-40f8b19badd94bab8e93dd2ec83514d2.r2.dev/https://pub-40f8b19badd94bab8e93dd2ec83514d2.r2.dev/', 'https://pub-40f8b19badd94bab8e93dd2ec83514d2.r2.dev/') WHERE image_url LIKE '%https://pub-%https://pub-%';
UPDATE maintenance_tickets SET image_before = REPLACE(image_before, 'https://pub-40f8b19badd94bab8e93dd2ec83514d2.r2.dev/https://pub-40f8b19badd94bab8e93dd2ec83514d2.r2.dev/', 'https://pub-40f8b19badd94bab8e93dd2ec83514d2.r2.dev/') WHERE image_before LIKE '%https://pub-%https://pub-%';
UPDATE maintenance_tickets SET image_after = REPLACE(image_after, 'https://pub-40f8b19badd94bab8e93dd2ec83514d2.r2.dev/https://pub-40f8b19badd94bab8e93dd2ec83514d2.r2.dev/', 'https://pub-40f8b19badd94bab8e93dd2ec83514d2.r2.dev/') WHERE image_after LIKE '%https://pub-%https://pub-%';
