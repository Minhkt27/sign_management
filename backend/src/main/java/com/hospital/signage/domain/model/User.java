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
public class User {
    private Long id;
    private String username;
    private String password;
    private String fullName;
    private Long roleId;
    @Builder.Default
    private List<String> customPermissions = new ArrayList<>();
    private Boolean isActive;
    private String refreshToken;
    private Instant createdAt;
    private Instant updatedAt;
}
