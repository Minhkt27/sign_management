package com.hospital.signage.adapter.out.persistence.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Entity
@Table(name = "map_edges", indexes = {
        @Index(name = "idx_map_edges_from", columnList = "node_from_id"),
        @Index(name = "idx_map_edges_to",   columnList = "node_to_id")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MapEdgeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "node_from_id", nullable = false)
    private Long nodeFromId;

    @Column(name = "node_to_id", nullable = false)
    private Long nodeToId;

    @Column(nullable = false)
    private double weight;

    @Column(nullable = false)
    private boolean bidirectional = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
