package com.hospital.signage.application.port.out;

import com.hospital.signage.domain.model.Asset;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AssetDatabasePort {
    Asset save(Asset asset);
    Optional<Asset> findById(UUID id);
    Optional<Asset> findByAssetCode(String assetCode);
    List<Asset> findAll();
    List<Asset> findByLocationId(Long locationId);
    List<Asset> findBySignTypeId(Long signTypeId);
    void deleteById(UUID id);
}
