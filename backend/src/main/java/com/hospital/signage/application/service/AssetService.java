package com.hospital.signage.application.service;

import com.hospital.signage.application.port.in.AssetUseCase;
import com.hospital.signage.application.port.out.AssetDatabasePort;
import com.hospital.signage.application.port.out.FileStoragePort;
import com.hospital.signage.application.port.out.LocationDatabasePort;
import com.hospital.signage.application.port.out.SignTypeDatabasePort;
import com.hospital.signage.application.port.out.TicketDatabasePort;
import com.hospital.signage.domain.model.Asset;
import com.hospital.signage.domain.model.Location;

import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AssetService implements AssetUseCase {

    private final AssetDatabasePort assetDatabasePort;
    private final LocationDatabasePort locationDatabasePort;
    private final SignTypeDatabasePort signTypeDatabasePort;
    private final TicketDatabasePort ticketDatabasePort;
    private final FileStoragePort fileStoragePort;

    @Override
    @Transactional
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
            if (!java.util.Objects.equals(location.getHospitalId(), asset.getHospitalId())) {
                throw new IllegalArgumentException("Vị trí thuộc bệnh viện khác.");
            }
            asset.setLocation(location);
        }

        validateSignTypeExists(asset.getSignTypeId());

        return assetDatabasePort.save(asset);
    }

    private void validateSignTypeExists(Long signTypeId) {
        if (signTypeId != null && signTypeDatabasePort.findById(signTypeId).isEmpty()) {
            throw new IllegalArgumentException("Sign type not found");
        }
    }

    @Override
    @Transactional
    public Asset updateAsset(UUID id, Asset updatedAsset, Long callerHospitalId) {
        Asset existing = assetDatabasePort.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Asset not found"));
        assertSameHospital(existing, callerHospitalId);

        existing.setAssetCode(updatedAsset.getAssetCode());
        existing.setName(updatedAsset.getName());
        existing.setDescription(updatedAsset.getDescription());
        existing.setLocationDescription(updatedAsset.getLocationDescription());
        validateSignTypeExists(updatedAsset.getSignTypeId());
        existing.setSignTypeId(updatedAsset.getSignTypeId());
        existing.setMaterial(updatedAsset.getMaterial());
        existing.setSize(updatedAsset.getSize());
        existing.setStatus(updatedAsset.getStatus());
        existing.setSupplier(updatedAsset.getSupplier());
        existing.setInstalledAt(updatedAsset.getInstalledAt());
        String oldImageUrl = null;
        if (updatedAsset.getImageUrl() != null && !updatedAsset.getImageUrl().equals(existing.getImageUrl())) {
            oldImageUrl = existing.getImageUrl();
        }
        existing.setImageUrl(updatedAsset.getImageUrl());

        if (updatedAsset.getLocation() != null && updatedAsset.getLocation().getId() != null) {
            Location location = locationDatabasePort.findById(updatedAsset.getLocation().getId())
                    .orElseThrow(() -> new IllegalArgumentException("Location not found"));
            existing.setLocation(location);
        } else {
            existing.setLocation(null);
        }

        Asset saved = assetDatabasePort.save(existing);
        scheduleImageDeletion(oldImageUrl);
        return saved;
    }

    @Override
    public Optional<Asset> getAssetById(UUID id, Long callerHospitalId) {
        return assetDatabasePort.findById(id)
                .filter(asset -> callerHospitalId == null || callerHospitalId.equals(asset.getHospitalId()));
    }

    @Override
    public Optional<Asset> getAssetByCode(String assetCode, Long hospitalId) {
        List<Asset> assets = assetDatabasePort.findByAssetCode(assetCode, hospitalId);
        if (assets.isEmpty()) return Optional.empty();
        if (assets.size() > 1) {
            throw new IllegalArgumentException("Có nhiều biển báo có cùng mã này. Vui lòng chỉ định rõ bệnh viện.");
        }
        return Optional.of(assets.get(0));
    }

    @Override
    public List<Asset> getAllAssets(Long hospitalId) {
        return assetDatabasePort.findAllByHospital(hospitalId);
    }

    @Override
    public Page<Asset> getAssetsPage(int page, int size, String search, Long hospitalId) {
        return assetDatabasePort.search(search, hospitalId, PageRequest.of(page, size));
    }

    @Override
    public Page<Asset> getAssetsPage(int page, int size, String search, com.hospital.signage.domain.enums.AssetStatus status,
            Long locationId, Long signTypeId, Long hospitalId) {
        return assetDatabasePort.searchAndFilter(search, status, locationId, signTypeId, hospitalId, PageRequest.of(page, size));
    }

    @Override
    public Page<Asset> getAssetsByLocation(Long locationId, int page, int size, Long hospitalId) {
        return assetDatabasePort.findByLocationIdAndHospital(locationId, hospitalId, PageRequest.of(page, size));
    }

    @Override
    @Transactional
    public void deleteAsset(UUID id, Long callerHospitalId) {
        Asset asset = assetDatabasePort.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Asset not found"));
        assertSameHospital(asset, callerHospitalId);
        if (ticketDatabasePort.existsByAssetId(id)) {
            throw new IllegalArgumentException("Không thể xóa biển báo này vì đang có phiếu bảo trì liên kết.");
        }
        assetDatabasePort.deleteById(id);
        scheduleImageDeletion(asset.getImageUrl());
    }

    // callerHospitalId == null nghĩa là SUPER_ADMIN, không giới hạn viện nào.
    private void assertSameHospital(Asset asset, Long callerHospitalId) {
        if (callerHospitalId != null && !callerHospitalId.equals(asset.getHospitalId())) {
            throw new com.hospital.signage.domain.exception.HospitalScopeException(
                    "Không có quyền truy cập biển báo thuộc bệnh viện khác.");
        }
    }

    // Registers a post-commit hook so MinIO deletion only happens after DB commits.
    // If the transaction rolls back, the file is untouched.
    private void scheduleImageDeletion(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) return;
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                deleteImageQuietly(imageUrl);
            }
        });
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
