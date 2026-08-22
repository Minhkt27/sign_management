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
public class Hospital {
    private Long id;
    private String name;
    private String shortCode;
    private String address;
    private String phone;
    private String email;
    private Double latitude;
    private Double longitude;
    private Integer gpsRadiusM;
    private String logoUrl;
    private Boolean active;
    private Instant createdAt;
    private Instant updatedAt;
}
