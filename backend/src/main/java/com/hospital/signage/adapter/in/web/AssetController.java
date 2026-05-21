package com.hospital.signage.adapter.in.web;

import com.hospital.signage.application.port.in.AssetUseCase;
import com.hospital.signage.domain.model.Asset;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/assets")
@RequiredArgsConstructor
public class AssetController {

    private final AssetUseCase assetUseCase;

    @GetMapping
    public ResponseEntity<List<Asset>> getAllAssets() {
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

    @PostMapping
    public ResponseEntity<Asset> createAsset(@RequestBody Asset asset) {
        return ResponseEntity.ok(assetUseCase.createAsset(asset));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Asset> updateAsset(@PathVariable UUID id, @RequestBody Asset asset) {
        try {
            return ResponseEntity.ok(assetUseCase.updateAsset(id, asset));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAsset(@PathVariable UUID id) {
        assetUseCase.deleteAsset(id);
        return ResponseEntity.ok().build();
    }
}
