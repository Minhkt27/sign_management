package com.hospital.signage.application.service;

import com.hospital.signage.adapter.out.persistence.entity.NotificationEntity;
import com.hospital.signage.adapter.out.persistence.entity.UserEntity;
import com.hospital.signage.adapter.out.persistence.mapper.NotificationMapper;
import com.hospital.signage.adapter.out.persistence.repository.NotificationRepository;
import com.hospital.signage.adapter.out.persistence.repository.UserRepository;
import com.hospital.signage.adapter.out.persistence.repository.RoleRepository;
import com.hospital.signage.application.port.in.NotificationUseCase;
import com.hospital.signage.domain.model.Notification;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService implements NotificationUseCase {

    private final NotificationRepository notificationRepository;
    private final NotificationMapper notificationMapper;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;

    @Override
    @Transactional(readOnly = true)
    public Page<Notification> getUnreadNotifications(Long userId, int page, int size) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(page, size))
                .map(notificationMapper::toDomain);
    }

    @Override
    @Transactional(readOnly = true)
    public long countUnreadNotifications(Long userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    @Override
    @Transactional
    public void markAsRead(Long id, Long userId) {
        notificationRepository.markAsReadByIdAndUserId(id, userId);
    }

    @Override
    @Transactional
    public void markAllAsRead(Long userId) {
        notificationRepository.markAllAsReadByUserId(userId);
    }

    @Override
    @Transactional
    public void notifyAdmins(Long hospitalId, String title, String message, String type, Long referenceId) {
        Set<Long> ticketManageRoleIds = roleRepository.findAll().stream()
                .filter(r -> r.getPermissions() != null && r.getPermissions().contains("TICKET_MANAGE"))
                .map(r -> r.getId())
                .collect(Collectors.toSet());

        List<UserEntity> admins = userRepository.findAll().stream()
                .filter(u -> {
                    boolean hasPermission = (u.getCustomPermissions() != null && u.getCustomPermissions().contains("TICKET_MANAGE"))
                            || (u.getRoleId() != null && ticketManageRoleIds.contains(u.getRoleId()));
                    
                    if (!hasPermission) return false;
                    
                    // Allow SUPER_ADMIN (hospital_id == null) or same hospital
                    return u.getHospitalId() == null || u.getHospitalId().equals(hospitalId);
                })
                .toList();

        List<NotificationEntity> notifications = admins.stream().map(admin -> NotificationEntity.builder()
                .userId(admin.getId())
                .hospitalId(hospitalId)
                .title(title)
                .message(message)
                .type(type)
                .referenceId(referenceId)
                .isRead(false)
                .build()).toList();

        notificationRepository.saveAll(notifications);
        log.info("Created {} notifications for event {}", notifications.size(), title);
    }

    @Override
    @Transactional
    public void notifyUser(Long userId, Long hospitalId, String title, String message, String type, Long referenceId) {
        NotificationEntity notification = NotificationEntity.builder()
                .userId(userId)
                .hospitalId(hospitalId)
                .title(title)
                .message(message)
                .type(type)
                .referenceId(referenceId)
                .isRead(false)
                .build();
        
        notificationRepository.save(notification);
        log.info("Created notification for user {} for event {}", userId, title);
    }
}
