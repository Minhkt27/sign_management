package com.hospital.signage.application.port.in;

import com.hospital.signage.domain.enums.AssetStatus;
import com.hospital.signage.domain.model.Asset;
import org.springframework.data.domain.Page;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AssetUseCase {
    Asset createAsset(Asset asset);
    Asset updateAsset(UUID id, Asset asset, Long callerHospitalId);
    Optional<Asset> getAssetById(UUID id);
    Optional<Asset> getAssetByCode(String assetCode, Long hospitalId);
    List<Asset> getAllAssets(Long hospitalId);
    Page<Asset> getAssetsPage(int page, int size, String search, Long hospitalId);
    Page<Asset> getAssetsPage(int page, int size, String search, AssetStatus status, Long locationId, Long signTypeId, Long hospitalId);
    Page<Asset> getAssetsByLocation(Long locationId, int page, int size, Long hospitalId);
    void deleteAsset(UUID id, Long callerHospitalId);
}
