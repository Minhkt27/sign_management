package com.hospital.signage.domain.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Notification {
    private Long id;
    private Long userId;
    private Long hospitalId;
    private String title;
    private String message;
    private String type;
    private Long referenceId;
    @Builder.Default
    private Boolean isRead = false;
    private Instant createdAt;
    private Instant updatedAt;
}
