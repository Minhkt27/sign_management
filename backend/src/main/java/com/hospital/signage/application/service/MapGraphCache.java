package com.hospital.signage.application.service;

import com.hospital.signage.application.port.out.MapDatabasePort;
import com.hospital.signage.domain.model.MapEdge;
import com.hospital.signage.domain.model.MapFloor;
import com.hospital.signage.domain.model.MapNode;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MapGraphCache {

    private final MapDatabasePort mapDatabasePort;

    public record GraphData(List<MapNode> nodes, List<MapEdge> edges) {}

    @Cacheable("mapGraph")
    public GraphData loadFullGraph() {
        return new GraphData(mapDatabasePort.findAllNodes(), mapDatabasePort.findAllEdges());
    }

    @Cacheable(value = "mapFloorGraph", key = "#floorId")
    public GraphData loadFloorGraph(Long floorId) {
        return new GraphData(
                mapDatabasePort.findNodesByFloorId(floorId),
                mapDatabasePort.findEdgesByFloorId(floorId));
    }

    @Cacheable("mapCampusGraph")
    public GraphData loadCampusGraph() {
        return mapDatabasePort.findCampusFloor()
                .map(campus -> new GraphData(
                        mapDatabasePort.findNodesByFloorId(campus.getId()),
                        mapDatabasePort.findEdgesByFloorId(campus.getId())))
                .orElse(new GraphData(List.of(), List.of()));
    }

    // floorId → locationId mapping (indoor floors only)
    @Cacheable("mapFloorLocationMap")
    public Map<Long, Long> loadFloorLocationMap() {
        return mapDatabasePort.findAllIndoorFloors().stream()
                .filter(f -> f.getLocationId() != null)
                .collect(Collectors.toMap(MapFloor::getId, MapFloor::getLocationId));
    }

    @CacheEvict(value = {"mapGraph", "mapFloorGraph", "mapCampusGraph", "mapFloorLocationMap"}, allEntries = true)
    public void invalidateAll() {
    }
}
