package com.hospital.signage.application.service;

import com.hospital.signage.application.port.out.MapDatabasePort;
import com.hospital.signage.domain.model.MapEdge;
import com.hospital.signage.domain.model.MapNode;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;

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

    @CacheEvict(value = {"mapGraph", "mapFloorGraph"}, allEntries = true)
    public void invalidateAll() {
    }
}
