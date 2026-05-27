package com.hospital.signage.adapter.in.web;

import com.hospital.signage.application.port.in.LocationUseCase;
import com.hospital.signage.domain.enums.LocationType;
import com.hospital.signage.domain.model.Location;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Vị trí")
@RestController
@RequestMapping("/api/locations")
@RequiredArgsConstructor
public class LocationController {

    private final LocationUseCase locationUseCase;

    @Operation(summary = "Danh sách tất cả vị trí")
    @GetMapping
    public ResponseEntity<List<Location>> getAllLocations() {
        return ResponseEntity.ok(locationUseCase.getAllLocations());
    }

    @Operation(summary = "Cây vị trí (dạng phân cấp)")
    @GetMapping("/tree")
    public ResponseEntity<List<LocationUseCase.LocationTreeNode>> getLocationTree() {
        return ResponseEntity.ok(locationUseCase.getLocationTree());
    }

    @Operation(summary = "Chi tiết vị trí theo ID")
    @GetMapping("/{id}")
    public ResponseEntity<Location> getLocationById(@PathVariable Long id) {
        return locationUseCase.getLocationById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @Operation(summary = "Tạo vị trí mới")
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ResponseEntity<Location> createLocation(@Valid @RequestBody LocationRequest req) {
        Location location = Location.builder()
                .locationCode(req.locationCode())
                .name(req.name())
                .parentId(req.parentId())
                .description(req.description())
                .type(req.type())
                .build();
        return ResponseEntity.ok(locationUseCase.createLocation(location));
    }

    @Operation(summary = "Cập nhật vị trí")
    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<Location> updateLocation(@PathVariable Long id, @Valid @RequestBody LocationRequest req) {
        Location location = Location.builder()
                .locationCode(req.locationCode())
                .name(req.name())
                .parentId(req.parentId())
                .description(req.description())
                .type(req.type())
                .build();
        return ResponseEntity.ok(locationUseCase.updateLocation(id, location));
    }

    @Operation(summary = "Xóa vị trí")
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteLocation(@PathVariable Long id) {
        locationUseCase.deleteLocation(id);
        return ResponseEntity.ok().build();
    }

    public record LocationRequest(
            @Size(max = 50) String locationCode,
            @NotBlank @Size(max = 200) String name,
            Long parentId,
            @Size(max = 500) String description,
            LocationType type
    ) {}
}
