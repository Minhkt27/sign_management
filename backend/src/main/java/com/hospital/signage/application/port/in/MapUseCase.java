package com.hospital.signage.application.port.in;

import com.hospital.signage.domain.model.MapEdge;
import com.hospital.signage.domain.model.MapFloor;
import com.hospital.signage.domain.model.MapNode;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MapUseCase {

    // Floor
    MapFloor createFloor(MapFloor floor);
    MapFloor updateFloor(Long id, MapFloor floor);
    Optional<MapFloor> getFloorById(Long id);
    Optional<MapFloor> getFloorByLocationId(Long locationId);
    List<MapFloor> getAllFloors(Long hospitalId);
    void deleteFloor(Long id);
    MapFloorData getFloorData(Long floorId);
    List<MapFloorData> getFloorDataBatch(List<Long> floorIds);

    // Campus map
    MapFloor createCampusFloor(MapFloor floor);
    MapFloor updateCampusFloor(MapFloor floor);
    Optional<MapFloorData> getCampusMap(Long hospitalId);
    void deleteCampusFloor();

    // Node
    MapNode createNode(MapNode node);
    MapNode updateNode(Long id, MapNode node);
    void deleteNode(Long id);
    Optional<MapNode> getNodeByAssetId(UUID assetId);
    Optional<MapNode> getNodeByLocationId(Long locationId);

    // Edge
    MapEdge createEdge(Long nodeFromId, Long nodeToId);
    void deleteEdge(Long id);

    // Wayfinding
    List<MapNode> findPath(Long fromNodeId, Long toNodeId, boolean avoidStairs, Long hospitalId);
    WayfindingResult findPathWithSegments(Long fromNodeId, Long toNodeId, boolean avoidStairs, Long hospitalId);

    enum SegmentType { INDOOR, OUTDOOR }
    record PathSegment(SegmentType type, List<MapNode> nodes) {}
    record WayfindingResult(List<PathSegment> segments) {}
    record MapFloorData(MapFloor floor, List<MapNode> nodes, List<MapEdge> edges) {}
}
