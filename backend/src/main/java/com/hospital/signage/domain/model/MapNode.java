package com.hospital.signage.domain.model;

import com.hospital.signage.domain.enums.NodeType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MapNode {
    private Long id;
    private Long floorId;
    private Double x;
    private Double y;
    private NodeType type;
    private String label;
    private Long locationId;
    private UUID assetId;
    private Instant createdAt;
    private Instant updatedAt;
}
