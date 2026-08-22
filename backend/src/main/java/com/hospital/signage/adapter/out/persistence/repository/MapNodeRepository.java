package com.hospital.signage.adapter.out.persistence.repository;

import com.hospital.signage.adapter.out.persistence.entity.MapNodeEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MapNodeRepository extends JpaRepository<MapNodeEntity, Long> {
    List<MapNodeEntity> findByFloorId(Long floorId);
    List<MapNodeEntity> findByFloorIdIn(List<Long> floorIds);
    Optional<MapNodeEntity> findFirstByAssetId(UUID assetId);
    Optional<MapNodeEntity> findByLocationId(Long locationId);

    @Query("SELECT n FROM MapNodeEntity n WHERE (:hospitalId IS NULL OR n.floorId IN (SELECT f.id FROM MapFloorEntity f WHERE f.hospitalId = :hospitalId))")
    List<MapNodeEntity> findAllByHospital(@Param("hospitalId") Long hospitalId);
}
