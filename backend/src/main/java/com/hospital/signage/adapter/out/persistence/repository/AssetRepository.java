package com.hospital.signage.adapter.out.persistence.repository;

import com.hospital.signage.adapter.out.persistence.entity.AssetEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.EntityGraph;

@Repository
public interface AssetRepository extends JpaRepository<AssetEntity, UUID> {
    
    @EntityGraph(attributePaths = {"location"})
    Optional<AssetEntity> findByAssetCode(String assetCode);

    @EntityGraph(attributePaths = {"location"})
    Page<AssetEntity> findByLocationId(Long locationId, Pageable pageable);

    @EntityGraph(attributePaths = {"location"})
    Page<AssetEntity> findBySignTypeId(Long signTypeId, Pageable pageable);

    boolean existsByLocationId(Long locationId);
    boolean existsBySignTypeId(Long signTypeId);

    @Query(value = "SELECT * FROM assets WHERE f_unaccent(asset_code) ILIKE f_unaccent('%' || :search || '%') OR f_unaccent(COALESCE(name, '')) ILIKE f_unaccent('%' || :search || '%') ORDER BY created_at DESC",
           countQuery = "SELECT count(*) FROM assets WHERE f_unaccent(asset_code) ILIKE f_unaccent('%' || :search || '%') OR f_unaccent(COALESCE(name, '')) ILIKE f_unaccent('%' || :search || '%')",
           nativeQuery = true)
    Page<AssetEntity> search(@Param("search") String search, Pageable pageable);
}
