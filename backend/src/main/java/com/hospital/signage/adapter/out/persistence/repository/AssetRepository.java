package com.hospital.signage.adapter.out.persistence.repository;

import com.hospital.signage.adapter.out.persistence.entity.AssetEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AssetRepository extends JpaRepository<AssetEntity, UUID> {
    Optional<AssetEntity> findByAssetCode(String assetCode);
    List<AssetEntity> findByLocationId(Long locationId);
    List<AssetEntity> findBySignTypeId(Long signTypeId);
    boolean existsByLocationId(Long locationId);
    boolean existsBySignTypeId(Long signTypeId);

    @Query(value = "SELECT * FROM assets WHERE unaccent(asset_code) ILIKE unaccent('%' || :search || '%') OR unaccent(COALESCE(name, '')) ILIKE unaccent('%' || :search || '%')",
           countQuery = "SELECT count(*) FROM assets WHERE unaccent(asset_code) ILIKE unaccent('%' || :search || '%') OR unaccent(COALESCE(name, '')) ILIKE unaccent('%' || :search || '%')",
           nativeQuery = true)
    Page<AssetEntity> search(@Param("search") String search, Pageable pageable);
}
