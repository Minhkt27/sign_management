package com.hospital.signage.adapter.out.persistence.entity;

import com.hospital.signage.domain.enums.AssetStatus;
import com.hospital.signage.domain.enums.Material;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
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

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "assets")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssetEntity {

    @Id
    private UUID id;

    @Column(name = "asset_code", unique = true, nullable = false)
    private String assetCode;

    private String name;

    private String description;

    @Column(name = "location_description")
    private String locationDescription;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "location_id")
    private LocationEntity location;

    @Column(name = "sign_type_id")
    private Long signTypeId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Material material;

    private String size;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AssetStatus status;

    @Column(name = "installed_at")
    private LocalDateTime installedAt;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    private String supplier;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "created_by")
    private Long createdBy;
}
