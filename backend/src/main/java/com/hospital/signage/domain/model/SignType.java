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
public class SignType {
    private Long id;
    private String code;
    private String name;
    private String description;
    private Long hospitalId;
    private Instant createdAt;
    private Instant updatedAt;
}
