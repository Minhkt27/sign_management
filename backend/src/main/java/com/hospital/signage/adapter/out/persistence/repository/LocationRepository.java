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

    @Modifying(clearAutomatically = true)
    @Query("UPDATE LocationEntity l SET l.path = CONCAT(:newPath, SUBSTRING(l.path, LENGTH(:oldPath) + 1)) WHERE l.path LIKE CONCAT(:oldPath, '.%')")
    void bulkUpdatePathPrefix(@Param("oldPath") String oldPath, @Param("newPath") String newPath);
}
