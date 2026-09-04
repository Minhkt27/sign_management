package com.hospital.signage.adapter.out.persistence.repository;

import com.hospital.signage.adapter.out.persistence.entity.LocationEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LocationRepository extends JpaRepository<LocationEntity, Long> {
    List<LocationEntity> findByParentId(Long parentId);
    boolean existsByParentId(Long parentId);
    boolean existsByLocationCodeAndHospitalId(String locationCode, Long hospitalId);

    @Query("SELECT l FROM LocationEntity l WHERE (:hospitalId IS NULL OR l.hospitalId = :hospitalId)")
    List<LocationEntity> findAllByHospital(@Param("hospitalId") Long hospitalId);

    @Query("SELECT l FROM LocationEntity l WHERE l.parent.id = :parentId AND (:hospitalId IS NULL OR l.hospitalId = :hospitalId)")
    List<LocationEntity> findByParentIdAndHospital(@Param("parentId") Long parentId, @Param("hospitalId") Long hospitalId);

    @Modifying(clearAutomatically = true)
    @Query("UPDATE LocationEntity l SET l.path = CONCAT(:newPath, SUBSTRING(l.path, LENGTH(:oldPath) + 1)) WHERE l.path LIKE CONCAT(:oldPath, '.%')")
    void bulkUpdatePathPrefix(@Param("oldPath") String oldPath, @Param("newPath") String newPath);
}
