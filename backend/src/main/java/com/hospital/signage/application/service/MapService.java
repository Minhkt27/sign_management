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
        return mapDatabasePort.findAllIndoorFloors();
    }

    @Override
    @Transactional
    public MapFloor createCampusFloor(MapFloor floor) {
        mapDatabasePort.findCampusFloor().ifPresent(existing -> {
            throw new IllegalArgumentException("Sơ đồ tổng thể đã tồn tại (id=" + existing.getId() + ")");
        });
        floor.setCampus(true);
        floor.setLocationId(null);
        MapFloor saved = mapDatabasePort.saveFloor(floor);
        mapGraphCache.invalidateAll();
        log.info("Campus map created: id={}", saved.getId());
        return saved;
    }

    @Override
    @Transactional
    public MapFloor updateCampusFloor(MapFloor floor) {
        MapFloor existing = mapDatabasePort.findCampusFloor()
                .orElseThrow(() -> new IllegalArgumentException("Chưa có sơ đồ tổng thể"));
        existing.setImageUrl(floor.getImageUrl());
        existing.setImgWidth(floor.getImgWidth());
        existing.setImgHeight(floor.getImgHeight());
        MapFloor saved = mapDatabasePort.saveFloor(existing);
        mapGraphCache.invalidateAll();
        return saved;
    }

    @Override
    public Optional<MapFloorData> getCampusMap() {
        return mapDatabasePort.findCampusFloor().map(campus -> {
            List<MapNode> nodes = mapDatabasePort.findNodesByFloorId(campus.getId());
            List<MapEdge> edges = mapDatabasePort.findEdgesByFloorId(campus.getId());
            return new MapFloorData(campus, nodes, edges);
        });
    }

    @Override
    @Transactional
    public void deleteCampusFloor() {
        MapFloor campus = mapDatabasePort.findCampusFloor()
                .orElseThrow(() -> new IllegalArgumentException("Chưa có sơ đồ tổng thể"));
        mapDatabasePort.deleteFloorById(campus.getId());
        mapGraphCache.invalidateAll();
        log.info("Campus map deleted: id={}", campus.getId());
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
        existing.setLinkedCampusNodeId(node.getLinkedCampusNodeId());
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
            MapGraphCache.GraphData floorData = mapGraphCache.loadFloorGraph(fromNode.getFloorId());
            allNodes = floorData.nodes();
            allEdges = floorData.edges();
            if (!isReachable(fromNodeId, toNodeId, buildAdjacency(allNodes, allEdges))) {
                MapGraphCache.GraphData fullData = mapGraphCache.loadFullGraph();
                allNodes = fullData.nodes();
                allEdges = fullData.edges();
            }
        } else {
            MapGraphCache.GraphData fullData = mapGraphCache.loadFullGraph();
            allNodes = fullData.nodes();
            allEdges = fullData.edges();
        }

        if (avoidStairs) {
            allEdges = filterStairEdges(allNodes, allEdges);
        }

        return dijkstra(fromNodeId, toNodeId, allNodes, allEdges).path();
    }

    @Override
    public WayfindingResult findPathWithSegments(Long fromNodeId, Long toNodeId, boolean avoidStairs) {
        if (fromNodeId.equals(toNodeId)) {
            return mapDatabasePort.findNodeById(fromNodeId)
                    .map(n -> new WayfindingResult(List.of(new PathSegment(SegmentType.INDOOR, List.of(n)))))
                    .orElse(new WayfindingResult(List.of()));
        }

        MapNode fromNode = mapDatabasePort.findNodeById(fromNodeId)
                .orElseThrow(() -> new IllegalArgumentException("Node không tồn tại: " + fromNodeId));
        MapNode toNode = mapDatabasePort.findNodeById(toNodeId)
                .orElseThrow(() -> new IllegalArgumentException("Node không tồn tại: " + toNodeId));

        Map<Long, Long> floorLocMap = mapGraphCache.loadFloorLocationMap();
        Long fromLoc = floorLocMap.get(fromNode.getFloorId());
        Long toLoc   = floorLocMap.get(toNode.getFloorId());

        // Same building or no campus map → single indoor segment
        boolean differentBuildings = fromLoc != null && toLoc != null && !fromLoc.equals(toLoc);
        if (!differentBuildings || mapDatabasePort.findCampusFloor().isEmpty()) {
            List<MapNode> path = findPath(fromNodeId, toNodeId, avoidStairs);
            return path.isEmpty() ? new WayfindingResult(List.of())
                    : new WayfindingResult(List.of(new PathSegment(SegmentType.INDOOR, path)));
        }

        // Find nodes linked to campus in each building (any type with linkedCampusNodeId set)
        List<MapNode> srcExits = mapDatabasePort.findNodesByFloorId(fromNode.getFloorId()).stream()
                .filter(n -> n.getLinkedCampusNodeId() != null)
                .collect(Collectors.toList());
        List<MapNode> dstExits = mapDatabasePort.findNodesByFloorId(toNode.getFloorId()).stream()
                .filter(n -> n.getLinkedCampusNodeId() != null)
                .collect(Collectors.toList());

        if (srcExits.isEmpty() || dstExits.isEmpty()) {
            // No campus-linked nodes configured yet — fallback to flat indoor path
            List<MapNode> path = findPath(fromNodeId, toNodeId, avoidStairs);
            return path.isEmpty() ? new WayfindingResult(List.of())
                    : new WayfindingResult(List.of(new PathSegment(SegmentType.INDOOR, path)));
        }

        MapGraphCache.GraphData seg1Graph = applyAvoidStairs(mapGraphCache.loadFloorGraph(fromNode.getFloorId()), avoidStairs);
        MapGraphCache.GraphData seg3Graph = applyAvoidStairs(mapGraphCache.loadFloorGraph(toNode.getFloorId()), avoidStairs);
        MapGraphCache.GraphData campusGraph = mapGraphCache.loadCampusGraph();

        double bestCost = Double.MAX_VALUE;
        DijkstraResult bestSeg1 = null, bestSeg2 = null, bestSeg3 = null;

        for (MapNode srcExit : srcExits) {
            DijkstraResult r1 = dijkstra(fromNodeId, srcExit.getId(), seg1Graph.nodes(), seg1Graph.edges());
            if (r1.path().isEmpty() && !fromNodeId.equals(srcExit.getId())) continue;

            for (MapNode dstExit : dstExits) {
                DijkstraResult r2 = dijkstra(
                        srcExit.getLinkedCampusNodeId(), dstExit.getLinkedCampusNodeId(),
                        campusGraph.nodes(), campusGraph.edges());
                if (r2.path().isEmpty()) continue;

                DijkstraResult r3 = dijkstra(dstExit.getId(), toNodeId, seg3Graph.nodes(), seg3Graph.edges());
                if (r3.path().isEmpty() && !dstExit.getId().equals(toNodeId)) continue;

                double total = r1.cost() + r2.cost() + r3.cost();
                if (total < bestCost) {
                    bestCost = total;
                    bestSeg1 = r1;
                    bestSeg2 = r2;
                    bestSeg3 = r3;
                }
            }
        }

        if (bestSeg1 == null) return new WayfindingResult(List.of());

        List<PathSegment> segments = new ArrayList<>();
        if (!bestSeg1.path().isEmpty()) segments.add(new PathSegment(SegmentType.INDOOR,  bestSeg1.path()));
        if (!bestSeg2.path().isEmpty()) segments.add(new PathSegment(SegmentType.OUTDOOR, bestSeg2.path()));
        if (!bestSeg3.path().isEmpty()) segments.add(new PathSegment(SegmentType.INDOOR,  bestSeg3.path()));
        return new WayfindingResult(segments);
    }

    // ── Private helpers ────────────────────────────────────────────────────

    private record DijkstraResult(List<MapNode> path, double cost) {}

    private DijkstraResult dijkstra(Long fromId, Long toId, List<MapNode> nodes, List<MapEdge> edges) {
        if (fromId.equals(toId)) {
            Map<Long, MapNode> nm = nodes.stream().collect(Collectors.toMap(MapNode::getId, n -> n));
            MapNode n = nm.get(fromId);
            return n == null ? new DijkstraResult(Collections.emptyList(), 0.0)
                             : new DijkstraResult(List.of(n), 0.0);
        }

        Map<Long, List<long[]>> adj = buildAdjacency(nodes, edges);
        Map<Long, Double> dist = new HashMap<>();
        Map<Long, Long> prev = new HashMap<>();

        for (MapNode node : nodes) dist.put(node.getId(), Double.MAX_VALUE);
        dist.put(fromId, 0.0);

        PriorityQueue<long[]> pq = new PriorityQueue<>(Comparator.comparingDouble(a -> Double.longBitsToDouble(a[1])));
        pq.offer(new long[]{fromId, Double.doubleToLongBits(0.0)});

        while (!pq.isEmpty()) {
            long[] curr = pq.poll();
            long currId = curr[0];
            double currDist = Double.longBitsToDouble(curr[1]);
            if (currDist > dist.getOrDefault(currId, Double.MAX_VALUE)) continue;
            if (currId == toId) break;
            for (long[] nb : adj.getOrDefault(currId, Collections.emptyList())) {
                double nd = currDist + Double.longBitsToDouble(nb[1]);
                if (nd < dist.getOrDefault(nb[0], Double.MAX_VALUE)) {
                    dist.put(nb[0], nd);
                    prev.put(nb[0], currId);
                    pq.offer(new long[]{nb[0], Double.doubleToLongBits(nd)});
                }
            }
        }

        double cost = dist.getOrDefault(toId, Double.MAX_VALUE);
        if (cost >= Double.MAX_VALUE) return new DijkstraResult(Collections.emptyList(), Double.MAX_VALUE);

        Map<Long, MapNode> nodeMap = nodes.stream().collect(Collectors.toMap(MapNode::getId, n -> n));
        List<MapNode> path = new ArrayList<>();
        Long cur = toId;
        while (cur != null) {
            MapNode node = nodeMap.get(cur);
            if (node == null) break;
            path.add(0, node);
            cur = prev.get(cur);
        }
        return new DijkstraResult(path, cost);
    }

    private MapGraphCache.GraphData applyAvoidStairs(MapGraphCache.GraphData graph, boolean avoidStairs) {
        if (!avoidStairs) return graph;
        return new MapGraphCache.GraphData(graph.nodes(), filterStairEdges(graph.nodes(), graph.edges()));
    }

    private List<MapEdge> filterStairEdges(List<MapNode> nodes, List<MapEdge> edges) {
        Set<Long> stairIds = nodes.stream()
                .filter(n -> n.getType() == NodeType.STAIRS)
                .map(MapNode::getId)
                .collect(Collectors.toSet());
        return edges.stream()
                .filter(e -> !stairIds.contains(e.getNodeFromId()) && !stairIds.contains(e.getNodeToId()))
                .collect(Collectors.toList());
    }

    private boolean isReachable(Long from, Long to, Map<Long, List<long[]>> adj) {
        Set<Long> visited = new HashSet<>();
        Queue<Long> queue = new java.util.ArrayDeque<>();
        queue.add(from);
        visited.add(from);
        while (!queue.isEmpty()) {
            Long cur = queue.poll();
            if (cur.equals(to)) return true;
            for (long[] nb : adj.getOrDefault(cur, Collections.emptyList())) {
                if (visited.add(nb[0])) queue.add(nb[0]);
            }
        }
        return false;
    }

    private Map<Long, List<long[]>> buildAdjacency(List<MapNode> nodes, List<MapEdge> edges) {
        Map<Long, List<long[]>> adj = new HashMap<>();
        for (MapNode node : nodes) adj.put(node.getId(), new ArrayList<>());
        for (MapEdge edge : edges) {
            long wb = Double.doubleToLongBits(edge.getWeight());
            adj.computeIfAbsent(edge.getNodeFromId(), k -> new ArrayList<>()).add(new long[]{edge.getNodeToId(), wb});
            if (edge.isBidirectional()) {
                adj.computeIfAbsent(edge.getNodeToId(), k -> new ArrayList<>()).add(new long[]{edge.getNodeFromId(), wb});
            }
        }
        return adj;
    }
}
