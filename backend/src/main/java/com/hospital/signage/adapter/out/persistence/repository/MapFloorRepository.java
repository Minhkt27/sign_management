package com.hospital.signage.adapter.out.persistence.repository;

import com.hospital.signage.adapter.out.persistence.entity.MapFloorEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MapFloorRepository extends JpaRepository<MapFloorEntity, Long> {
    Optional<MapFloorEntity> findByLocationId(Long locationId);

    @Query("SELECT f FROM MapFloorEntity f WHERE f.campus = true AND (:hospitalId IS NULL OR f.hospitalId = :hospitalId)")
    Optional<MapFloorEntity> findByCampusTrue(@Param("hospitalId") Long hospitalId);

    @Query("SELECT f FROM MapFloorEntity f WHERE f.campus = false AND (:hospitalId IS NULL OR f.hospitalId = :hospitalId)")
    List<MapFloorEntity> findByCampusFalse(@Param("hospitalId") Long hospitalId);
}
