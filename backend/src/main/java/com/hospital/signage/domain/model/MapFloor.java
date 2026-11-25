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
public class MapFloor {
    private Long id;
    private Long hospitalId;
    private Long locationId;
    private String imageUrl;
    private int imgWidth;
    private int imgHeight;
    // Tiêu đề hiển thị trên trang chỉ đường; null = dùng tên tầng.
    private String title;
    private boolean campus;
    private Instant createdAt;
    private Instant updatedAt;
}
