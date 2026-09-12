package com.hospital.signage.application.port.in;

import com.hospital.signage.domain.model.Notification;
import org.springframework.data.domain.Page;

public interface NotificationUseCase {
    /** Toàn bộ thông báo của một người dùng, mới nhất trước — gồm cả đã đọc lẫn chưa đọc. */
    Page<Notification> getNotifications(Long userId, int page, int size);
    long countUnreadNotifications(Long userId);
    void markAsRead(Long id, Long userId);
    void markAllAsRead(Long userId);
    void notifyAdmins(Long hospitalId, String title, String message, String type, Long referenceId);
    void notifyUser(Long userId, Long hospitalId, String title, String message, String type, Long referenceId);
}
