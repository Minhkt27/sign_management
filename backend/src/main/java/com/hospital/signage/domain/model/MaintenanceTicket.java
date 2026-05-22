package com.hospital.signage.domain.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import com.hospital.signage.domain.enums.Priority;
import com.hospital.signage.domain.enums.TicketSource;
import com.hospital.signage.domain.enums.TicketStatus;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MaintenanceTicket {
    private Long id;
    private Asset asset;
    private User reporter;
    private User assignee;
    private String description;
    private Priority priority;
    private TicketStatus ticketStatus;
    private String imageBefore;
    private String imageAfter;
    private TicketSource source;
    private String rejectionNote;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime completedAt;
}
