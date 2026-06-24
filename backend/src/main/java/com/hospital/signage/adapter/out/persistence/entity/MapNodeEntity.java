package com.hospital.signage.adapter.out.persistence.entity;

import com.hospital.signage.domain.enums.NodeType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "map_nodes", indexes = {
        @Index(name = "idx_map_nodes_floor_id",    columnList = "floor_id"),
        @Index(name = "idx_map_nodes_location_id", columnList = "location_id"),
        @Index(name = "idx_map_nodes_asset_id",    columnList = "asset_id")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MapNodeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "floor_id", nullable = false)
    private Long floorId;

    @Column(nullable = false)
    private double x;

    @Column(nullable = false)
    private double y;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private NodeType type;

    @Column(length = 255)
    private String label;

    @Column(name = "location_id")
    private Long locationId;

    @Column(name = "asset_id", columnDefinition = "uuid")
    private UUID assetId;

    @Column(name = "linked_campus_node_id")
    private Long linkedCampusNodeId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
