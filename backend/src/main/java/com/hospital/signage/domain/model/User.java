package com.hospital.signage.domain.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
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
    @JsonIgnore
    private String password;
    private String fullName;
    private Long roleId;
    private String phone;
    @Builder.Default
    private List<String> customPermissions = new ArrayList<>();
    private Boolean isActive;
    @JsonIgnore
    private String refreshToken;
    private Instant createdAt;
    private Instant updatedAt;
}
