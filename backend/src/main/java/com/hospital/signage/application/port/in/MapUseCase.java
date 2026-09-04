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
    MapFloor updateFloor(Long id, MapFloor floor, Long callerHospitalId);
    Optional<MapFloor> getFloorById(Long id);
    Optional<MapFloor> getFloorByLocationId(Long locationId);
    List<MapFloor> getAllFloors(Long hospitalId);
    void deleteFloor(Long id, Long callerHospitalId);
    MapFloorData getFloorData(Long floorId, Long callerHospitalId);
    List<MapFloorData> getFloorDataBatch(List<Long> floorIds, Long callerHospitalId);

    // Campus map
    MapFloor createCampusFloor(MapFloor floor, Long callerHospitalId);
    MapFloor updateCampusFloor(MapFloor floor, Long callerHospitalId);
    Optional<MapFloorData> getCampusMap(Long hospitalId);
    void deleteCampusFloor(Long callerHospitalId);

    // Node
    MapNode createNode(MapNode node, Long callerHospitalId);
    MapNode updateNode(Long id, MapNode node, Long callerHospitalId);
    void deleteNode(Long id, Long callerHospitalId);
    Optional<MapNode> getNodeByAssetId(UUID assetId);
    Optional<MapNode> getNodeByLocationId(Long locationId);

    // Edge
    MapEdge createEdge(Long nodeFromId, Long nodeToId);
    void deleteEdge(Long id, Long callerHospitalId);

    // Wayfinding
    List<MapNode> findPath(Long fromNodeId, Long toNodeId, boolean avoidStairs, Long hospitalId);
    WayfindingResult findPathWithSegments(Long fromNodeId, Long toNodeId, boolean avoidStairs, Long hospitalId);

    enum SegmentType { INDOOR, OUTDOOR }
    record PathSegment(SegmentType type, List<MapNode> nodes) {}
    record WayfindingResult(List<PathSegment> segments) {}
    record MapFloorData(MapFloor floor, List<MapNode> nodes, List<MapEdge> edges) {}
}
