-- Role TECHNICAL (V5) chỉ có ["ASSET_VIEW", "TICKET_VIEW", "TICKET_MANAGE"], thiếu FILE_UPLOAD.
-- Vì UI chụp ảnh trước/sau khi xử lý phiếu bảo trì (TaskDetailPage) chỉ hiện ra khi user có
-- quyền FILE_UPLOAD hoặc ASSET_MANAGE, KTV dùng role mặc định chưa từng thấy được tính năng này.
-- Điều kiện NOT (permissions @> ...) để tránh thêm trùng nếu ai đó đã tự cấp quyền này qua UI rồi.
UPDATE roles
SET permissions = permissions || '["FILE_UPLOAD"]'::jsonb
WHERE code = 'TECHNICAL'
  AND NOT (permissions @> '["FILE_UPLOAD"]'::jsonb);
