package com.hospital.signage.application.service;

import com.hospital.signage.application.port.in.AssetUseCase;
import com.hospital.signage.application.port.out.AssetDatabasePort;
import com.hospital.signage.application.port.out.FileStoragePort;
import com.hospital.signage.application.port.out.LocationDatabasePort;
import com.hospital.signage.application.port.out.TicketDatabasePort;
import com.hospital.signage.domain.model.Asset;
import com.hospital.signage.domain.model.Location;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AssetService implements AssetUseCase {

    private final AssetDatabasePort assetDatabasePort;
    private final LocationDatabasePort locationDatabasePort;
    private final TicketDatabasePort ticketDatabasePort;
    private final FileStoragePort fileStoragePort;

    @Override
    @org.springframework.transaction.annotation.Transactional
    public Asset createAsset(Asset asset) {
        if (asset.getId() == null) {
            asset.setId(UUID.randomUUID());
        }
        
        if (asset.getAssetCode() == null || asset.getAssetCode().trim().isEmpty()) {
            asset.setAssetCode("ASSET_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        }
        
        if (asset.getLocation() != null && asset.getLocation().getId() != null) {
            Location location = locationDatabasePort.findById(asset.getLocation().getId())
                    .orElseThrow(() -> new IllegalArgumentException("Location not found"));
            asset.setLocation(location);
        }

        asset.setCreatedAt(LocalDateTime.now());
        asset.setUpdatedAt(LocalDateTime.now());
        return assetDatabasePort.save(asset);
    }

    @Override
    @org.springframework.transaction.annotation.Transactional
    public Asset updateAsset(UUID id, Asset updatedAsset) {
        Asset existing = assetDatabasePort.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Asset not found"));

        existing.setAssetCode(updatedAsset.getAssetCode());
        existing.setName(updatedAsset.getName());
        existing.setDescription(updatedAsset.getDescription());
        existing.setLocationDescription(updatedAsset.getLocationDescription());
        existing.setSignTypeId(updatedAsset.getSignTypeId());
        existing.setMaterial(updatedAsset.getMaterial());
        existing.setSize(updatedAsset.getSize());
        existing.setStatus(updatedAsset.getStatus());
        existing.setSupplier(updatedAsset.getSupplier());
        existing.setInstalledAt(updatedAsset.getInstalledAt());
        if (updatedAsset.getImageUrl() != null && !updatedAsset.getImageUrl().equals(existing.getImageUrl())) {
            deleteImageQuietly(existing.getImageUrl());
        }
        existing.setImageUrl(updatedAsset.getImageUrl());

        if (updatedAsset.getLocation() != null && updatedAsset.getLocation().getId() != null) {
            Location location = locationDatabasePort.findById(updatedAsset.getLocation().getId())
                    .orElseThrow(() -> new IllegalArgumentException("Location not found"));
            existing.setLocation(location);
        } else {
            existing.setLocation(null);
        }

        existing.setUpdatedAt(LocalDateTime.now());
        return assetDatabasePort.save(existing);
    }

    @Override
    public Optional<Asset> getAssetById(UUID id) {
        return assetDatabasePort.findById(id);
    }

    @Override
    public Optional<Asset> getAssetByCode(String assetCode) {
        return assetDatabasePort.findByAssetCode(assetCode);
    }

    @Override
    public List<Asset> getAllAssets() {
        return assetDatabasePort.findAll();
    }

    @Override
    public Page<Asset> getAssetsPage(int page, int size) {
        return assetDatabasePort.findAll(PageRequest.of(page, size, Sort.by("createdAt").descending()));
    }

    @Override
    public List<Asset> getAssetsByLocation(Long locationId) {
        return assetDatabasePort.findByLocationId(locationId);
    }

    @Override
    public void deleteAsset(UUID id) {
        Asset asset = assetDatabasePort.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Asset not found"));
        if (ticketDatabasePort.existsByAssetId(id)) {
            throw new IllegalArgumentException("Không thể xóa biển báo này vì đang có phiếu bảo trì liên kết.");
        }
        assetDatabasePort.deleteById(id);
        deleteImageQuietly(asset.getImageUrl());
    }

    private void deleteImageQuietly(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) return;
        int lastSlash = imageUrl.lastIndexOf('/');
        String objectName = lastSlash >= 0 ? imageUrl.substring(lastSlash + 1) : imageUrl;
        try {
            fileStoragePort.delete(objectName);
        } catch (Exception e) {
            log.warn("Could not delete image '{}' from MinIO: {}", objectName, e.getMessage());
        }
    }
}
