package com.hospital.signage.domain.model;

import com.hospital.signage.domain.enums.LocationType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Location {
    private Long id;
    private String locationCode; // For display and lookup, e.g. "B1-T2-P01"
    private String name;
    private Long hospitalId;
    private Long parentId;
    private String path; // For ltree structure later
    private String description;
    private LocationType type;
    private Instant createdAt;
    private Instant updatedAt;
}
