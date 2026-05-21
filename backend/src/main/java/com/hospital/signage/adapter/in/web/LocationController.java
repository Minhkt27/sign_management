package com.hospital.signage.adapter.in.web;

import com.hospital.signage.application.port.in.LocationUseCase;
import com.hospital.signage.domain.model.Location;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/locations")
@RequiredArgsConstructor
public class LocationController {

    private final LocationUseCase locationUseCase;

    @GetMapping
    public ResponseEntity<List<Location>> getAllLocations() {
        return ResponseEntity.ok(locationUseCase.getAllLocations());
    }

    @GetMapping("/tree")
    public ResponseEntity<List<LocationUseCase.LocationTreeNode>> getLocationTree() {
        return ResponseEntity.ok(locationUseCase.getLocationTree());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Location> getLocationById(@PathVariable Long id) {
        return locationUseCase.getLocationById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Location> createLocation(@RequestBody Location location) {
        return ResponseEntity.ok(locationUseCase.createLocation(location));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Location> updateLocation(@PathVariable Long id, @RequestBody Location location) {
        return ResponseEntity.ok(locationUseCase.updateLocation(id, location));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteLocation(@PathVariable Long id) {
        locationUseCase.deleteLocation(id);
        return ResponseEntity.ok().build();
    }
}
