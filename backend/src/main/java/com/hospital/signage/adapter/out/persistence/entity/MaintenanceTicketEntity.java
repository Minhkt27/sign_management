package com.hospital.signage.adapter.out.persistence.entity;

import com.hospital.signage.domain.enums.Priority;
import com.hospital.signage.domain.enums.TicketSource;
import com.hospital.signage.domain.enums.TicketStatus;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.Column;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.FetchType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.EnumType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Entity
@Table(name = "maintenance_tickets", indexes = {
        @Index(name = "idx_tickets_asset_id",    columnList = "asset_id"),
        @Index(name = "idx_tickets_assignee_id", columnList = "assignee_id"),
        @Index(name = "idx_tickets_created_at",  columnList = "created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MaintenanceTicketEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "asset_id", nullable = false)
    private AssetEntity asset;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reporter_id", nullable = false)
    private UserEntity reporter;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignee_id")
    private UserEntity assignee;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Priority priority;

    @Enumerated(EnumType.STRING)
    @Column(name = "ticket_status", nullable = false)
    private TicketStatus ticketStatus;

    @Column(name = "image_before", length = 500)
    private String imageBefore;

    @Column(name = "image_after", length = 500)
    private String imageAfter;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false)
    private TicketSource source;

    @Column(name = "rejection_note", columnDefinition = "TEXT")
    private String rejectionNote;

    @Column(name = "rejection_count", nullable = false)
    @Builder.Default
    private int rejectionCount = 0;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    @Column(name = "completed_at")
    private Instant completedAt;
}
