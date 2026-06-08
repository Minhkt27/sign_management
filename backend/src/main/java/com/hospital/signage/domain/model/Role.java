package com.hospital.signage.domain.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Role {
    private Long id;
    private String code;
    private String name;
    private String description;
    @Builder.Default
    private List<String> permissions = new ArrayList<>();
    private Instant createdAt;
    private Instant updatedAt;
}
