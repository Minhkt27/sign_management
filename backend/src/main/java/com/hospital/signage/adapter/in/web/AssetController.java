package com.hospital.signage.adapter.in.web;

import com.hospital.signage.application.port.in.AssetUseCase;
import com.hospital.signage.domain.enums.AssetStatus;
import com.hospital.signage.domain.enums.Material;
import com.hospital.signage.domain.model.Asset;
import com.hospital.signage.domain.model.Location;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/assets")
@RequiredArgsConstructor
public class AssetController {

    private final AssetUseCase assetUseCase;

    @GetMapping
    public ResponseEntity<PagedResponse<Asset>> getAllAssets(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(PagedResponse.from(assetUseCase.getAssetsPage(page, size)));
    }

    @GetMapping("/all")
    public ResponseEntity<List<Asset>> getAllAssetsList() {
        return ResponseEntity.ok(assetUseCase.getAllAssets());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Asset> getAssetById(@PathVariable UUID id) {
        return assetUseCase.getAssetById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/code/{code}")
    public ResponseEntity<Asset> getAssetByCode(@PathVariable String code) {
        return assetUseCase.getAssetByCode(code)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/location/{locationId}")
    public ResponseEntity<List<Asset>> getAssetsByLocation(@PathVariable Long locationId) {
        return ResponseEntity.ok(assetUseCase.getAssetsByLocation(locationId));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ResponseEntity<Asset> createAsset(@Valid @RequestBody AssetRequest request) {
        return ResponseEntity.ok(assetUseCase.createAsset(request.toDomain()));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<Asset> updateAsset(@PathVariable UUID id, @Valid @RequestBody AssetRequest request) {
        return ResponseEntity.ok(assetUseCase.updateAsset(id, request.toDomain()));
    }

    @PreAuthorize("hasRole('ADMIN')")
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
            LocalDateTime installedAt,
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
