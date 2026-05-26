package com.hospital.signage.application.port.in;

import com.hospital.signage.domain.model.Asset;
import org.springframework.data.domain.Page;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AssetUseCase {
    Asset createAsset(Asset asset);
    Asset updateAsset(UUID id, Asset asset);
    Optional<Asset> getAssetById(UUID id);
    Optional<Asset> getAssetByCode(String assetCode);
    List<Asset> getAllAssets();
    Page<Asset> getAssetsPage(int page, int size, String search);
    List<Asset> getAssetsByLocation(Long locationId);
    void deleteAsset(UUID id);
}
