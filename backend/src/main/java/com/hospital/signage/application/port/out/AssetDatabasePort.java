package com.hospital.signage.application.port.out;

import com.hospital.signage.domain.enums.AssetStatus;
import com.hospital.signage.domain.model.Asset;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AssetDatabasePort {
    Asset save(Asset asset);
    Optional<Asset> findById(UUID id);
    Optional<Asset> findByAssetCode(String assetCode);
    List<Asset> findAll();
    List<Asset> findAllByHospital(Long hospitalId);
    Page<Asset> findAll(Pageable pageable);
    Page<Asset> search(String search, Long hospitalId, Pageable pageable);
    Page<Asset> searchAndFilter(String search, AssetStatus status, Long locationId, Long signTypeId, Long hospitalId, Pageable pageable);
    Page<Asset> findByLocationId(Long locationId, Pageable pageable);
    Page<Asset> findByLocationIdAndHospital(Long locationId, Long hospitalId, Pageable pageable);
    Page<Asset> findBySignTypeId(Long signTypeId, Pageable pageable);
    boolean existsByLocationId(Long locationId);
    boolean existsBySignTypeId(Long signTypeId);
    void deleteById(UUID id);
}
