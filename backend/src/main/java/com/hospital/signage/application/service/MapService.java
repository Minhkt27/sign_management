package com.hospital.signage.application.service;

import com.hospital.signage.application.port.in.MapUseCase;
import com.hospital.signage.application.port.out.MapDatabasePort;
import com.hospital.signage.domain.enums.NodeType;
import com.hospital.signage.domain.model.MapEdge;
import com.hospital.signage.domain.model.MapFloor;
import com.hospital.signage.domain.model.MapNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MapService implements MapUseCase {

    private final MapDatabasePort mapDatabasePort;
    private final MapGraphCache mapGraphCache;

    // ── Floor ──────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public MapFloor createFloor(MapFloor floor) {
        mapDatabasePort.findFloorByLocationId(floor.getLocationId()).ifPresent(existing -> {
            throw new IllegalArgumentException("Tầng này đã có sơ đồ (id=" + existing.getId() + ")");
        });
        MapFloor saved = mapDatabasePort.saveFloor(floor);
        log.info("MapFloor created: id={}, locationId={}", saved.getId(), saved.getLocationId());
        return saved;
    }

    @Override
    @Transactional
    public MapFloor updateFloor(Long id, MapFloor floor) {
        MapFloor existing = mapDatabasePort.findFloorById(id)
                .orElseThrow(() -> new IllegalArgumentException("Sơ đồ không tồn tại: " + id));
        existing.setImageUrl(floor.getImageUrl());
        existing.setImgWidth(floor.getImgWidth());
        existing.setImgHeight(floor.getImgHeight());
        return mapDatabasePort.saveFloor(existing);
    }

    @Override
    public Optional<MapFloor> getFloorById(Long id) {
        return mapDatabasePort.findFloorById(id);
    }

    @Override
    public Optional<MapFloor> getFloorByLocationId(Long locationId) {
        return mapDatabasePort.findFloorByLocationId(locationId);
    }

    @Override
    public List<MapFloor> getAllFloors() {
        return mapDatabasePort.findAllFloors();
    }

    @Override
    @Transactional
    public void deleteFloor(Long id) {
        mapDatabasePort.findFloorById(id)
                .orElseThrow(() -> new IllegalArgumentException("Sơ đồ không tồn tại: " + id));
        mapDatabasePort.deleteFloorById(id);
        log.info("MapFloor deleted: id={}", id);
    }

    @Override
    public MapFloorData getFloorData(Long floorId) {
        MapFloor floor = mapDatabasePort.findFloorById(floorId)
                .orElseThrow(() -> new IllegalArgumentException("Sơ đồ không tồn tại: " + floorId));
        List<MapNode> nodes = mapDatabasePort.findNodesByFloorId(floorId);
        List<MapEdge> edges = mapDatabasePort.findEdgesByFloorId(floorId);
        return new MapFloorData(floor, nodes, edges);
    }

    @Override
    public List<MapFloorData> getFloorDataBatch(List<Long> floorIds) {
        if (floorIds == null || floorIds.isEmpty()) return Collections.emptyList();
        List<MapFloor> floors = mapDatabasePort.findFloorsByIds(floorIds);
        List<MapNode> allNodes = mapDatabasePort.findNodesByFloorIds(floorIds);
        List<MapEdge> allEdges = mapDatabasePort.findEdgesByFloorIds(floorIds);

        Map<Long, List<MapNode>> nodesByFloor = allNodes.stream()
                .collect(Collectors.groupingBy(MapNode::getFloorId));

        // nodeId → floorId lookup for efficient edge grouping
        Map<Long, Long> nodeFloorMap = allNodes.stream()
                .collect(Collectors.toMap(MapNode::getId, MapNode::getFloorId));

        // Edge belongs to a floor if either endpoint is on that floor (same logic as findByFloorId)
        Map<Long, List<MapEdge>> edgesByFloor = new HashMap<>();
        for (MapEdge edge : allEdges) {
            Long fromFloor = nodeFloorMap.get(edge.getNodeFromId());
            Long toFloor   = nodeFloorMap.get(edge.getNodeToId());
            if (fromFloor != null) edgesByFloor.computeIfAbsent(fromFloor, k -> new ArrayList<>()).add(edge);
            if (toFloor != null && !toFloor.equals(fromFloor)) {
                edgesByFloor.computeIfAbsent(toFloor, k -> new ArrayList<>()).add(edge);
            }
        }

        return floors.stream()
                .map(f -> new MapFloorData(
                        f,
                        nodesByFloor.getOrDefault(f.getId(), Collections.emptyList()),
                        edgesByFloor.getOrDefault(f.getId(), Collections.emptyList())
                ))
                .collect(Collectors.toList());
    }

    // ── Node ───────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public MapNode createNode(MapNode node) {
        mapDatabasePort.findFloorById(node.getFloorId())
                .orElseThrow(() -> new IllegalArgumentException("Sơ đồ không tồn tại: " + node.getFloorId()));
        MapNode saved = mapDatabasePort.saveNode(node);
        mapGraphCache.invalidateAll();
        log.info("MapNode created: id={}, floorId={}, type={}", saved.getId(), saved.getFloorId(), saved.getType());
        return saved;
    }

    @Override
    @Transactional
    public MapNode updateNode(Long id, MapNode node) {
        MapNode existing = mapDatabasePort.findNodeById(id)
                .orElseThrow(() -> new IllegalArgumentException("Node không tồn tại: " + id));
        if (node.getX() != null) existing.setX(node.getX());
        if (node.getY() != null) existing.setY(node.getY());
        existing.setType(node.getType());
        existing.setLabel(node.getLabel());
        existing.setLocationId(node.getLocationId());
        existing.setAssetId(node.getAssetId());
        MapNode saved = mapDatabasePort.saveNode(existing);
        mapGraphCache.invalidateAll();
        return saved;
    }

    @Override
    @Transactional
    public void deleteNode(Long id) {
        mapDatabasePort.findNodeById(id)
                .orElseThrow(() -> new IllegalArgumentException("Node không tồn tại: " + id));
        mapDatabasePort.deleteNodeById(id);
        mapGraphCache.invalidateAll();
        log.info("MapNode deleted: id={}", id);
    }

    @Override
    public Optional<MapNode> getNodeByAssetId(UUID assetId) {
        return mapDatabasePort.findNodeByAssetId(assetId);
    }

    @Override
    public Optional<MapNode> getNodeByLocationId(Long locationId) {
        return mapDatabasePort.findNodeByLocationId(locationId);
    }

    // ── Edge ───────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public MapEdge createEdge(Long nodeFromId, Long nodeToId) {
        MapNode from = mapDatabasePort.findNodeById(nodeFromId)
                .orElseThrow(() -> new IllegalArgumentException("Node không tồn tại: " + nodeFromId));
        MapNode to = mapDatabasePort.findNodeById(nodeToId)
                .orElseThrow(() -> new IllegalArgumentException("Node không tồn tại: " + nodeToId));

        double dx = to.getX() - from.getX();
        double dy = to.getY() - from.getY();
        double weight = Math.sqrt(dx * dx + dy * dy);

        MapEdge edge = MapEdge.builder()
                .nodeFromId(nodeFromId)
                .nodeToId(nodeToId)
                .weight(weight)
                .bidirectional(true)
                .build();

        MapEdge saved = mapDatabasePort.saveEdge(edge);
        mapGraphCache.invalidateAll();
        log.info("MapEdge created: id={}, from={}, to={}, weight={}", saved.getId(), nodeFromId, nodeToId, String.format("%.4f", weight));
        return saved;
    }

    @Override
    @Transactional
    public void deleteEdge(Long id) {
        mapDatabasePort.findEdgeById(id)
                .orElseThrow(() -> new IllegalArgumentException("Edge không tồn tại: " + id));
        mapDatabasePort.deleteEdgeById(id);
        mapGraphCache.invalidateAll();
        log.info("MapEdge deleted: id={}", id);
    }

    // ── Wayfinding (Dijkstra's) ────────────────────────────────────────────

    @Override
    public List<MapNode> findPath(Long fromNodeId, Long toNodeId, boolean avoidStairs) {
        if (fromNodeId.equals(toNodeId)) {
            return mapDatabasePort.findNodeById(fromNodeId)
                    .map(Collections::singletonList)
                    .orElse(Collections.emptyList());
        }

        MapNode fromNode = mapDatabasePort.findNodeById(fromNodeId)
                .orElseThrow(() -> new IllegalArgumentException("Node không tồn tại: " + fromNodeId));
        MapNode toNode = mapDatabasePort.findNodeById(toNodeId)
                .orElseThrow(() -> new IllegalArgumentException("Node không tồn tại: " + toNodeId));

        List<MapNode> allNodes;
        List<MapEdge> allEdges;
        if (java.util.Objects.equals(fromNode.getFloorId(), toNode.getFloorId())) {
            // Thử tìm đường nội tầng trước; nếu không có (chỉ đi được qua tầng khác) thì load toàn bộ
            MapGraphCache.GraphData floorData = mapGraphCache.loadFloorGraph(fromNode.getFloorId());
            allNodes = floorData.nodes();
            allEdges = floorData.edges();
            boolean reachable = isReachable(fromNodeId, toNodeId, buildAdjacency(allNodes, allEdges));
            if (!reachable) {
                MapGraphCache.GraphData fullData = mapGraphCache.loadFullGraph();
                allNodes = fullData.nodes();
                allEdges = fullData.edges();
            }
        } else {
            // Khác tầng: cần toàn bộ để tìm đường qua elevator/stairs
            MapGraphCache.GraphData fullData = mapGraphCache.loadFullGraph();
            allNodes = fullData.nodes();
            allEdges = fullData.edges();
        }

        if (avoidStairs) {
            Set<Long> stairIds = allNodes.stream()
                    .filter(n -> n.getType() == NodeType.STAIRS)
                    .map(MapNode::getId)
                    .collect(Collectors.toSet());
            allEdges = allEdges.stream()
                    .filter(e -> !stairIds.contains(e.getNodeFromId()) && !stairIds.contains(e.getNodeToId()))
                    .collect(Collectors.toList());
        }

        Map<Long, List<long[]>> adj = buildAdjacency(allNodes, allEdges);
        Map<Long, Double> dist = new HashMap<>();
        Map<Long, Long> prev = new HashMap<>();

        for (MapNode node : allNodes) dist.put(node.getId(), Double.MAX_VALUE);
        dist.put(fromNodeId, 0.0);

        PriorityQueue<long[]> pq = new PriorityQueue<>(Comparator.comparingDouble(a -> Double.longBitsToDouble(a[1])));
        pq.offer(new long[]{fromNodeId, Double.doubleToLongBits(0.0)});

        while (!pq.isEmpty()) {
            long[] curr = pq.poll();
            long currId = curr[0];
            double currDist = Double.longBitsToDouble(curr[1]);

            if (currDist > dist.getOrDefault(currId, Double.MAX_VALUE)) continue;
            if (currId == toNodeId) break;

            for (long[] neighbor : adj.getOrDefault(currId, Collections.emptyList())) {
                double weight = Double.longBitsToDouble(neighbor[1]);
                double newDist = currDist + weight;
                if (newDist < dist.getOrDefault(neighbor[0], Double.MAX_VALUE)) {
                    dist.put(neighbor[0], newDist);
                    prev.put(neighbor[0], currId);
                    pq.offer(new long[]{neighbor[0], Double.doubleToLongBits(newDist)});
                }
            }
        }

        if (dist.getOrDefault(toNodeId, Double.MAX_VALUE) >= Double.MAX_VALUE) {
            return Collections.emptyList();
        }

        Map<Long, MapNode> nodeMap = allNodes.stream().collect(Collectors.toMap(MapNode::getId, n -> n));
        List<MapNode> path = new ArrayList<>();
        Long cur = toNodeId;
        while (cur != null) {
            MapNode node = nodeMap.get(cur);
            if (node == null) break;
            path.add(0, node);
            cur = prev.get(cur);
        }
        return path;
    }

    private boolean isReachable(Long from, Long to, Map<Long, List<long[]>> adj) {
        Set<Long> visited = new HashSet<>();
        Queue<Long> queue = new java.util.ArrayDeque<>();
        queue.add(from);
        visited.add(from);
        while (!queue.isEmpty()) {
            Long cur = queue.poll();
            if (cur.equals(to)) return true;
            for (long[] neighbor : adj.getOrDefault(cur, Collections.emptyList())) {
                if (visited.add(neighbor[0])) queue.add(neighbor[0]);
            }
        }
        return false;
    }

    private Map<Long, List<long[]>> buildAdjacency(List<MapNode> nodes, List<MapEdge> edges) {
        Map<Long, List<long[]>> adj = new HashMap<>();
        for (MapNode node : nodes) adj.put(node.getId(), new ArrayList<>());
        for (MapEdge edge : edges) {
            long weightBits = Double.doubleToLongBits(edge.getWeight());
            adj.computeIfAbsent(edge.getNodeFromId(), k -> new ArrayList<>())
               .add(new long[]{edge.getNodeToId(), weightBits});
            if (edge.isBidirectional()) {
                adj.computeIfAbsent(edge.getNodeToId(), k -> new ArrayList<>())
                   .add(new long[]{edge.getNodeFromId(), weightBits});
            }
        }
        return adj;
    }
}
