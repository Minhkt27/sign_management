package com.hospital.signage.application.service;

import com.hospital.signage.application.port.in.AssetUseCase;
import com.hospital.signage.application.port.out.AssetDatabasePort;
import com.hospital.signage.application.port.out.LocationDatabasePort;
import com.hospital.signage.domain.model.Asset;
import com.hospital.signage.domain.model.Location;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.hospital.signage.application.port.out.TicketDatabasePort;

@Service
@RequiredArgsConstructor
public class AssetService implements AssetUseCase {

    private final AssetDatabasePort assetDatabasePort;
    private final LocationDatabasePort locationDatabasePort;
    private final TicketDatabasePort ticketDatabasePort;

    @Override
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
    public List<Asset> getAssetsByLocation(Long locationId) {
        return assetDatabasePort.findByLocationId(locationId);
    }

    @Override
    public void deleteAsset(UUID id) {
        if (!ticketDatabasePort.findByAssetId(id).isEmpty()) {
            throw new IllegalArgumentException("Không thể xóa biển báo này vì đang có phiếu bảo trì liên kết.");
        }
        assetDatabasePort.deleteById(id);
    }
}
