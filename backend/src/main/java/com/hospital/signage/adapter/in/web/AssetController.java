package com.hospital.signage.adapter.in.web;

import com.hospital.signage.application.port.in.AssetUseCase;
import com.hospital.signage.domain.enums.AssetStatus;
import com.hospital.signage.domain.enums.Material;
import com.hospital.signage.domain.model.Asset;
import com.hospital.signage.domain.model.Location;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Tag(name = "Biển báo")
@RestController
@RequestMapping("/api/assets")
@RequiredArgsConstructor
public class AssetController {

    private final AssetUseCase assetUseCase;

    @Operation(summary = "Danh sách biển báo (phân trang, lọc theo status/locationId/signTypeId)")
    @GetMapping
    public ResponseEntity<PagedResponse<Asset>> getAllAssets(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "") String search,
            @RequestParam(required = false) AssetStatus status,
            @RequestParam(required = false) Long locationId,
            @RequestParam(required = false) Long signTypeId) {
        int p = Math.max(0, page);
        int s = Math.min(Math.max(1, size), 100);
        if (status == null && locationId == null && signTypeId == null) {
            return ResponseEntity.ok(PagedResponse.from(assetUseCase.getAssetsPage(p, s, search)));
        }
        return ResponseEntity.ok(PagedResponse.from(assetUseCase.getAssetsPage(p, s, search, status, locationId, signTypeId)));
    }

    @Operation(summary = "Toàn bộ biển báo (tối đa 1000, dùng cho cây/bản đồ)")
    @GetMapping("/all")
    public ResponseEntity<List<Asset>> getAllAssetsList() {
        return ResponseEntity.ok(assetUseCase.getAllAssets());
    }

    @Operation(summary = "Chi tiết biển báo theo ID")
    @GetMapping("/{id}")
    public ResponseEntity<Asset> getAssetById(@PathVariable UUID id) {
        return assetUseCase.getAssetById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @Operation(summary = "Tìm biển báo theo mã")
    @GetMapping("/code/{code}")
    public ResponseEntity<Asset> getAssetByCode(@PathVariable String code) {
        return assetUseCase.getAssetByCode(code)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @Operation(summary = "Biển báo theo vị trí")
    @GetMapping("/location/{locationId}")
    public ResponseEntity<PagedResponse<Asset>> getAssetsByLocation(
            @PathVariable Long locationId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(PagedResponse.from(assetUseCase.getAssetsByLocation(locationId, Math.max(0, page), Math.min(Math.max(1, size), 100))));
    }

    @Operation(summary = "Tạo biển báo mới")
    @PreAuthorize("hasAuthority('ASSET_MANAGE')")
    @PostMapping
    public ResponseEntity<Asset> createAsset(@Valid @RequestBody AssetRequest request) {
        return ResponseEntity.ok(assetUseCase.createAsset(request.toDomain()));
    }

    @Operation(summary = "Cập nhật biển báo")
    @PreAuthorize("hasAuthority('ASSET_MANAGE')")
    @PutMapping("/{id}")
    public ResponseEntity<Asset> updateAsset(@PathVariable UUID id, @Valid @RequestBody AssetRequest request) {
        return ResponseEntity.ok(assetUseCase.updateAsset(id, request.toDomain()));
    }

    @Operation(summary = "Xóa biển báo")
    @PreAuthorize("hasAuthority('ASSET_MANAGE')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAsset(@PathVariable UUID id) {
        assetUseCase.deleteAsset(id);
        return ResponseEntity.ok().build();
    }

    public record AssetRequest(
            String assetCode,
            String name,
            String description,
            String locationDescription,
            LocationRef location,
            Long signTypeId,
            @NotNull(message = "Material không được để trống") Material material,
            String size,
            @NotNull(message = "Status không được để trống") AssetStatus status,
            Instant installedAt,
            String supplier,
            String imageUrl
    ) {
        Asset toDomain() {
            Asset asset = new Asset();
            asset.setAssetCode(assetCode);
            asset.setName(name);
            asset.setDescription(description);
            asset.setLocationDescription(locationDescription);
            if (location != null && location.id() != null) {
                Location loc = new Location();
                loc.setId(location.id());
                asset.setLocation(loc);
            }
            asset.setSignTypeId(signTypeId);
            asset.setMaterial(material);
            asset.setSize(size);
            asset.setStatus(status);
            asset.setInstalledAt(installedAt);
            asset.setSupplier(supplier);
            asset.setImageUrl(imageUrl);
            return asset;
        }
    }

    public record LocationRef(Long id) {}
}
