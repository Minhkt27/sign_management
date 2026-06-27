package com.hospital.signage.adapter.out.persistence.repository;

import com.hospital.signage.adapter.out.persistence.entity.MapFloorEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MapFloorRepository extends JpaRepository<MapFloorEntity, Long> {
    Optional<MapFloorEntity> findByLocationId(Long locationId);
    Optional<MapFloorEntity> findByCampusTrue();
    List<MapFloorEntity> findByCampusFalse();
}
