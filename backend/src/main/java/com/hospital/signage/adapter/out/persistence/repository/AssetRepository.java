package com.hospital.signage.adapter.out.persistence.repository;

import com.hospital.signage.adapter.out.persistence.entity.AssetEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface AssetRepository extends JpaRepository<AssetEntity, UUID> {

    @Override
    @EntityGraph(attributePaths = {"location"})
    Optional<AssetEntity> findById(UUID id);

    @Override
    @EntityGraph(attributePaths = {"location"})
    Page<AssetEntity> findAll(Pageable pageable);

    @EntityGraph(attributePaths = {"location"})
    Optional<AssetEntity> findByAssetCode(String assetCode);

    @EntityGraph(attributePaths = {"location"})
    Page<AssetEntity> findByLocationId(Long locationId, Pageable pageable);

    @EntityGraph(attributePaths = {"location"})
    Page<AssetEntity> findBySignTypeId(Long signTypeId, Pageable pageable);

    boolean existsByLocationId(Long locationId);
    boolean existsBySignTypeId(Long signTypeId);

    @Query(value = "SELECT * FROM assets WHERE f_unaccent(asset_code) ILIKE f_unaccent(CONCAT('%', :search, '%')) " +
                   "OR f_unaccent(COALESCE(name, '')) ILIKE f_unaccent(CONCAT('%', :search, '%')) " +
                   "ORDER BY created_at DESC",
           countQuery = "SELECT COUNT(*) FROM assets WHERE f_unaccent(asset_code) ILIKE f_unaccent(CONCAT('%', :search, '%')) " +
                        "OR f_unaccent(COALESCE(name, '')) ILIKE f_unaccent(CONCAT('%', :search, '%'))",
           nativeQuery = true)
    Page<AssetEntity> search(@Param("search") String search, Pageable pageable);

    @Query(value = "SELECT * FROM assets WHERE " +
                   "(f_unaccent(asset_code) ILIKE f_unaccent(CONCAT('%', :search, '%')) " +
                   "OR f_unaccent(COALESCE(name, '')) ILIKE f_unaccent(CONCAT('%', :search, '%'))) " +
                   "AND (:status IS NULL OR status = :status) " +
                   "AND (:locationId IS NULL OR location_id = :locationId) " +
                   "AND (:signTypeId IS NULL OR sign_type_id = :signTypeId) " +
                   "ORDER BY created_at DESC",
           countQuery = "SELECT COUNT(*) FROM assets WHERE " +
                   "(f_unaccent(asset_code) ILIKE f_unaccent(CONCAT('%', :search, '%')) " +
                   "OR f_unaccent(COALESCE(name, '')) ILIKE f_unaccent(CONCAT('%', :search, '%'))) " +
                   "AND (:status IS NULL OR status = :status) " +
                   "AND (:locationId IS NULL OR location_id = :locationId) " +
                   "AND (:signTypeId IS NULL OR sign_type_id = :signTypeId)",
           nativeQuery = true)
    Page<AssetEntity> searchAndFilter(@Param("search") String search, @Param("status") String status,
            @Param("locationId") Long locationId, @Param("signTypeId") Long signTypeId, Pageable pageable);
}
