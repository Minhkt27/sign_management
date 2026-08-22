package com.hospital.signage.application.service;

import com.hospital.signage.application.port.out.MapDatabasePort;
import com.hospital.signage.domain.model.MapEdge;
import com.hospital.signage.domain.model.MapNode;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MapGraphCache {

    private final MapDatabasePort mapDatabasePort;

    public record GraphData(List<MapNode> nodes, List<MapEdge> edges) {}

    @Cacheable(value = "mapGraph", key = "#hospitalId")
    public GraphData loadFullGraph(Long hospitalId) {
        return new GraphData(mapDatabasePort.findAllNodes(hospitalId), mapDatabasePort.findAllEdgesByHospital(hospitalId));
    }

    @Cacheable(value = "mapFloorGraph", key = "#floorId")
    public GraphData loadFloorGraph(Long floorId) {
        return new GraphData(
                mapDatabasePort.findNodesByFloorId(floorId),
                mapDatabasePort.findEdgesByFloorId(floorId));
    }

    @Cacheable(value = "mapCampusGraph", key = "#hospitalId")
    public GraphData loadCampusGraph(Long hospitalId) {
        return mapDatabasePort.findCampusFloor(hospitalId)
                .map(campus -> new GraphData(
                        mapDatabasePort.findNodesByFloorId(campus.getId()),
                        mapDatabasePort.findEdgesByFloorId(campus.getId())))
                .orElse(new GraphData(List.of(), List.of()));
    }

    // All indoor nodes/edges — campus floor strictly excluded to prevent rogue cross-floor edges
    @Cacheable(value = "mapIndoorFullGraph", key = "#hospitalId")
    public GraphData loadFullIndoorGraph(Long hospitalId) {
        Long campusFloorId = mapDatabasePort.findCampusFloor(hospitalId)
                .map(f -> f.getId())
                .orElse(null);
        List<MapNode> allNodes = mapDatabasePort.findAllNodes(hospitalId);
        List<MapEdge> allEdges = mapDatabasePort.findAllEdgesByHospital(hospitalId);
        if (campusFloorId == null) return new GraphData(allNodes, allEdges);

        final Long cid = campusFloorId;
        List<MapNode> indoorNodes = allNodes.stream()
                .filter(n -> !cid.equals(n.getFloorId()))
                .collect(Collectors.toList());
        Set<Long> indoorIds = indoorNodes.stream()
                .map(n -> n.getId())
                .collect(Collectors.toSet());
        List<MapEdge> indoorEdges = allEdges.stream()
                .filter(e -> indoorIds.contains(e.getNodeFromId()) && indoorIds.contains(e.getNodeToId()))
                .collect(Collectors.toList());
        return new GraphData(indoorNodes, indoorEdges);
    }

    // floorId → locationId mapping (indoor floors only)
    @Cacheable(value = "mapFloorLocationMap", key = "#hospitalId")
    public Map<Long, Long> loadFloorLocationMap(Long hospitalId) {
        return mapDatabasePort.findAllIndoorFloors(hospitalId).stream()
                .filter(f -> f.getLocationId() != null)
                .collect(Collectors.toMap(f -> f.getId(), f -> f.getLocationId()));
    }

    @CacheEvict(value = {"mapGraph", "mapFloorGraph", "mapCampusGraph", "mapFloorLocationMap", "mapIndoorFullGraph"}, allEntries = true)
    public void invalidateAll() {
    }
}
