package com.hospital.signage.application.port.out;

import com.hospital.signage.domain.model.MapEdge;
import com.hospital.signage.domain.model.MapFloor;
import com.hospital.signage.domain.model.MapNode;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MapDatabasePort {

    // Floor
    MapFloor saveFloor(MapFloor floor);
    Optional<MapFloor> findFloorById(Long id);
    Optional<MapFloor> findFloorByLocationId(Long locationId);
    Optional<MapFloor> findCampusFloor();
    List<MapFloor> findAllIndoorFloors();
    List<MapFloor> findAllFloors();
    List<MapFloor> findFloorsByIds(List<Long> ids);
    void deleteFloorById(Long id);

    // Node
    MapNode saveNode(MapNode node);
    Optional<MapNode> findNodeById(Long id);
    List<MapNode> findNodesByFloorId(Long floorId);
    List<MapNode> findNodesByFloorIds(List<Long> floorIds);
    Optional<MapNode> findNodeByAssetId(UUID assetId);
    Optional<MapNode> findNodeByLocationId(Long locationId);
    void deleteNodeById(Long id);

    // Edge
    MapEdge saveEdge(MapEdge edge);
    Optional<MapEdge> findEdgeById(Long id);
    List<MapEdge> findEdgesByFloorId(Long floorId);
    List<MapEdge> findEdgesByFloorIds(List<Long> floorIds);
    List<MapEdge> findEdgesByNodeId(Long nodeId);
    List<MapEdge> findAllEdges();
    void deleteEdgeById(Long id);
    boolean existsEdgeBetween(Long nodeAId, Long nodeBId);

    // Wayfinding
    List<MapNode> findAllNodes();
}
