package com.hospital.signage.application.service.imports;

import java.util.List;

/**
 * Một loại dữ liệu nhập được từ Excel. Thêm loại mới = viết thêm một bean cài đặt interface
 * này; đọc file, kiểm tra giới hạn, xem trước, giao dịch, file mẫu và API đều dùng chung.
 */
public interface ImportHandler {

    /** Định danh trong URL, ví dụ "locations" → /api/import/locations. */
    String type();

    /** Tên sheet dữ liệu và tên file mẫu. */
    String title();

    /** Quyền cần có để nhập loại này. */
    String requiredAuthority();

    /** Các cột; có thể phụ thuộc viện (ví dụ danh sách loại biển của viện đó). */
    List<ImportColumn> columns(Long hospitalId);

    /**
     * Dựng kế hoạch cho toàn bộ file. KHÔNG được ghi xuống DB ở đây — mọi việc ghi phải đăng
     * ký qua {@link ImportPlan#addWriter}. Mỗi dòng phải có đúng một kết quả create/skip/error.
     */
    void plan(List<ImportRow> rows, Long hospitalId, ImportPlan plan);
}
