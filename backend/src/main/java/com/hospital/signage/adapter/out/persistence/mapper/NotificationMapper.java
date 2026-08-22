package com.hospital.signage.adapter.out.persistence.mapper;

import com.hospital.signage.adapter.out.persistence.entity.NotificationEntity;
import com.hospital.signage.domain.model.Notification;
import org.springframework.stereotype.Component;

@Component
public class NotificationMapper {
    public Notification toDomain(NotificationEntity entity) {
        if (entity == null) return null;
        return Notification.builder()
                .id(entity.getId())
                .userId(entity.getUserId())
                .hospitalId(entity.getHospitalId())
                .title(entity.getTitle())
                .message(entity.getMessage())
                .type(entity.getType())
                .referenceId(entity.getReferenceId())
                .isRead(entity.getIsRead())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    public NotificationEntity toEntity(Notification domain) {
        if (domain == null) return null;
        return NotificationEntity.builder()
                .id(domain.getId())
                .userId(domain.getUserId())
                .hospitalId(domain.getHospitalId())
                .title(domain.getTitle())
                .message(domain.getMessage())
                .type(domain.getType())
                .referenceId(domain.getReferenceId())
                .isRead(domain.getIsRead())
                .build();
    }
}
