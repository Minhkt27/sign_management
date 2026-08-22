package com.hospital.signage.adapter.in.web;

import com.hospital.signage.application.port.in.HospitalUseCase;
import com.hospital.signage.domain.model.Hospital;
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

@Tag(name = "Bệnh viện")
@RestController
@RequestMapping("/api/hospitals")
@RequiredArgsConstructor
public class HospitalController {

    private final HospitalUseCase hospitalUseCase;

    @Operation(summary = "Danh sách tất cả bệnh viện")
    @GetMapping
    public ResponseEntity<List<Hospital>> getAllHospitals() {
        return ResponseEntity.ok(hospitalUseCase.getAllHospitals());
    }

    @Operation(summary = "Danh sách bệnh viện (phân trang)")
    @GetMapping("/page")
    @PreAuthorize("hasAuthority('HOSPITAL_MANAGE')")
    public ResponseEntity<PagedResponse<Hospital>> getHospitalsPage(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "") String search) {
        var result = hospitalUseCase.getHospitalsPage(Math.max(0, page), Math.min(Math.max(1, size), 100), search);
        return ResponseEntity.ok(PagedResponse.from(result));
    }

    @Operation(summary = "Chi tiết bệnh viện theo ID")
    @GetMapping("/{id}")
    public ResponseEntity<Hospital> getHospitalById(@PathVariable Long id) {
        return hospitalUseCase.getHospitalById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @Operation(summary = "Tìm bệnh viện gần nhất")
    @GetMapping("/nearby")
    public ResponseEntity<Hospital> getNearbyHospital(
            @RequestParam Double lat,
            @RequestParam Double lng) {
        return hospitalUseCase.getNearbyHospital(lat, lng)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    @Operation(summary = "Tạo bệnh viện mới")
    @PreAuthorize("hasAuthority('HOSPITAL_MANAGE')")
    @PostMapping
    public ResponseEntity<Hospital> createHospital(@Valid @RequestBody HospitalRequest req) {
        Hospital hospital = Hospital.builder()
                .name(req.name())
                .shortCode(req.shortCode())
                .address(req.address())
                .phone(req.phone())
                .email(req.email())
                .latitude(req.latitude())
                .longitude(req.longitude())
                .gpsRadiusM(req.gpsRadiusM() == null ? 300 : req.gpsRadiusM())
                .logoUrl(req.logoUrl())
                .active(req.active() == null ? Boolean.TRUE : req.active())
                .build();
        return ResponseEntity.ok(hospitalUseCase.createHospital(hospital));
    }

    @Operation(summary = "Cập nhật bệnh viện")
    @PreAuthorize("hasAuthority('HOSPITAL_MANAGE')")
    @PutMapping("/{id}")
    public ResponseEntity<Hospital> updateHospital(@PathVariable Long id, @Valid @RequestBody HospitalRequest req) {
        Hospital hospital = Hospital.builder()
                .name(req.name())
                .shortCode(req.shortCode())
                .address(req.address())
                .phone(req.phone())
                .email(req.email())
                .latitude(req.latitude())
                .longitude(req.longitude())
                .gpsRadiusM(req.gpsRadiusM() == null ? 300 : req.gpsRadiusM())
                .logoUrl(req.logoUrl())
                .active(req.active() == null ? Boolean.TRUE : req.active())
                .build();
        return ResponseEntity.ok(hospitalUseCase.updateHospital(id, hospital));
    }

    @Operation(summary = "Xóa bệnh viện")
    @PreAuthorize("hasAuthority('HOSPITAL_MANAGE')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteHospital(@PathVariable Long id) {
        hospitalUseCase.deleteHospital(id);
        return ResponseEntity.ok().build();
    }

    public record HospitalRequest(
            @NotBlank @Size(max = 255) String name,
            @NotBlank @Size(max = 50) String shortCode,
            @Size(max = 500) String address,
            @Size(max = 50) String phone,
            @Size(max = 255) String email,
            Double latitude,
            Double longitude,
            Integer gpsRadiusM,
            @Size(max = 500) String logoUrl,
            Boolean active
    ) {}
}
