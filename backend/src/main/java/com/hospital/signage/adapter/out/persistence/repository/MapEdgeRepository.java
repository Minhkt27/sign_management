package com.hospital.signage.adapter.out.persistence.repository;

import com.hospital.signage.adapter.out.persistence.entity.MapEdgeEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MapEdgeRepository extends JpaRepository<MapEdgeEntity, Long> {

    @Query("SELECT e FROM MapEdgeEntity e WHERE e.nodeFromId IN :nodeIds OR e.nodeToId IN :nodeIds")
    List<MapEdgeEntity> findByNodeIds(@Param("nodeIds") List<Long> nodeIds);

    @Query("SELECT e FROM MapEdgeEntity e WHERE e.nodeFromId IN (SELECT n.id FROM MapNodeEntity n WHERE n.floorId = :floorId) OR e.nodeToId IN (SELECT n.id FROM MapNodeEntity n WHERE n.floorId = :floorId)")
    List<MapEdgeEntity> findByFloorId(@Param("floorId") Long floorId);

    @Query("SELECT e FROM MapEdgeEntity e WHERE e.nodeFromId IN (SELECT n.id FROM MapNodeEntity n WHERE n.floorId IN :floorIds) OR e.nodeToId IN (SELECT n.id FROM MapNodeEntity n WHERE n.floorId IN :floorIds)")
    List<MapEdgeEntity> findByFloorIds(@Param("floorIds") List<Long> floorIds);

    @Query("SELECT COUNT(e) > 0 FROM MapEdgeEntity e WHERE (e.nodeFromId = :a AND e.nodeToId = :b) OR (e.nodeFromId = :b AND e.nodeToId = :a)")
    boolean existsBetween(@Param("a") Long nodeA, @Param("b") Long nodeB);
}
