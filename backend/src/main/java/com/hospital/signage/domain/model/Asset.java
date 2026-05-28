package com.hospital.signage.domain.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import com.hospital.signage.domain.enums.AssetStatus;
import com.hospital.signage.domain.enums.Material;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Asset {
    private UUID id;
    private String assetCode;
    private String name;
    private String description;
    private String locationDescription;
    private Location location;
    private Long signTypeId;
    private Material material;
    private String size;
    private AssetStatus status;
    private Instant installedAt;
    private String supplier;
    private Instant createdAt;
    private Instant updatedAt;
    private String imageUrl;
    private Long createdBy;
}
