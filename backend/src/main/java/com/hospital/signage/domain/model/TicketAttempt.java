package com.hospital.signage.domain.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Một lần sửa đã bị Admin từ chối, chụp lại tại thời điểm từ chối.
 * Lưu dạng JSON trong maintenance_tickets.rejected_attempts — thời điểm để ở dạng chuỗi
 * ISO-8601 để JSON không phụ thuộc cấu hình module thời gian của Jackson.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TicketAttempt {
    private int attempt;
    private String imageBefore;
    private String imageAfter;
    private String technicianName;
    private String submittedAt;
    private String rejectedAt;
    private String rejectedBy;
    private String rejectionNote;
}
