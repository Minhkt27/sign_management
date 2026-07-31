package com.hospital.signage.adapter.out.persistence.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Entity
@Table(name = "map_floors")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MapFloorEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "hospital_id", nullable = false)
    private Long hospitalId;

    @Column(name = "location_id")
    private Long locationId;

    @Column(name = "image_url", nullable = false, length = 500)
    private String imageUrl;

    @Column(name = "img_width", nullable = false)
    private int imgWidth;

    @Column(name = "img_height", nullable = false)
    private int imgHeight;

    @Column(name = "is_campus", nullable = false)
    private boolean campus;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
