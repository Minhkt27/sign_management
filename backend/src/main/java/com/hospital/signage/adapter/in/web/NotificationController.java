package com.hospital.signage.adapter.in.web;

import com.hospital.signage.application.port.in.NotificationUseCase;
import com.hospital.signage.domain.model.Notification;
import com.hospital.signage.infrastructure.security.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Thông báo")
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationUseCase notificationUseCase;

    @Operation(summary = "Lấy danh sách thông báo của tôi (phân trang)")
    @GetMapping
    public ResponseEntity<PagedResponse<Notification>> getMyNotifications(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Long userId = SecurityUtils.getCurrentUserId();
        var result = notificationUseCase.getUnreadNotifications(userId, Math.max(0, page), Math.min(Math.max(1, size), 100));
        return ResponseEntity.ok(PagedResponse.from(result));
    }

    @Operation(summary = "Lấy số lượng thông báo chưa đọc")
    @GetMapping("/unread-count")
    public ResponseEntity<Long> getUnreadCount() {
        Long userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(notificationUseCase.countUnreadNotifications(userId));
    }

    @Operation(summary = "Đánh dấu 1 thông báo là đã đọc")
    @PutMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(@PathVariable Long id) {
        Long userId = SecurityUtils.getCurrentUserId();
        notificationUseCase.markAsRead(id, userId);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "Đánh dấu tất cả thông báo là đã đọc")
    @PutMapping("/read-all")
    public ResponseEntity<Void> markAllAsRead() {
        Long userId = SecurityUtils.getCurrentUserId();
        notificationUseCase.markAllAsRead(userId);
        return ResponseEntity.ok().build();
    }
}
