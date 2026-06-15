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
public class MapEdge {
    private Long id;
    private Long nodeFromId;
    private Long nodeToId;
    private double weight;
    private boolean bidirectional;
    private Instant createdAt;
}
