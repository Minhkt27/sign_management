package com.hospital.signage.adapter.out.persistence.adapter;

import com.hospital.signage.adapter.out.persistence.mapper.MapEdgeMapper;
import com.hospital.signage.adapter.out.persistence.mapper.MapFloorMapper;
import com.hospital.signage.adapter.out.persistence.mapper.MapNodeMapper;
import com.hospital.signage.adapter.out.persistence.repository.MapEdgeRepository;
import com.hospital.signage.adapter.out.persistence.repository.MapFloorRepository;
import com.hospital.signage.adapter.out.persistence.repository.MapNodeRepository;
import com.hospital.signage.application.port.out.MapDatabasePort;
import com.hospital.signage.domain.model.MapEdge;
import com.hospital.signage.domain.model.MapFloor;
import com.hospital.signage.domain.model.MapNode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class MapPersistenceAdapter implements MapDatabasePort {

    private final MapFloorRepository floorRepository;
    private final MapNodeRepository nodeRepository;
    private final MapEdgeRepository edgeRepository;
    private final MapFloorMapper floorMapper;
    private final MapNodeMapper nodeMapper;
    private final MapEdgeMapper edgeMapper;

    // ── Floor ──────────────────────────────────────────────────────────────

    @Override
    public MapFloor saveFloor(MapFloor floor) {
        return floorMapper.toDomain(floorRepository.save(floorMapper.toEntity(floor)));
    }

    @Override
    public Optional<MapFloor> findFloorById(Long id) {
        return floorRepository.findById(id).map(floorMapper::toDomain);
    }

    @Override
    public Optional<MapFloor> findFloorByLocationId(Long locationId) {
        return floorRepository.findByLocationId(locationId).map(floorMapper::toDomain);
    }

    @Override
    public Optional<MapFloor> findCampusFloor() {
        return floorRepository.findByCampusTrue().map(floorMapper::toDomain);
    }

    @Override
    public List<MapFloor> findAllIndoorFloors() {
        return floorRepository.findByCampusFalse().stream().map(floorMapper::toDomain).collect(Collectors.toList());
    }

    @Override
    public List<MapFloor> findAllFloors() {
        return floorRepository.findAll().stream().map(floorMapper::toDomain).collect(Collectors.toList());
    }

    @Override
    public List<MapFloor> findFloorsByIds(List<Long> ids) {
        return floorRepository.findAllById(ids).stream().map(floorMapper::toDomain).collect(Collectors.toList());
    }

    @Override
    public void deleteFloorById(Long id) {
        floorRepository.deleteById(id);
    }

    // ── Node ───────────────────────────────────────────────────────────────

    @Override
    public MapNode saveNode(MapNode node) {
        return nodeMapper.toDomain(nodeRepository.save(nodeMapper.toEntity(node)));
    }

    @Override
    public Optional<MapNode> findNodeById(Long id) {
        return nodeRepository.findById(id).map(nodeMapper::toDomain);
    }

    @Override
    public List<MapNode> findNodesByFloorId(Long floorId) {
        return nodeRepository.findByFloorId(floorId).stream().map(nodeMapper::toDomain).collect(Collectors.toList());
    }

    @Override
    public List<MapNode> findNodesByFloorIds(List<Long> floorIds) {
        return nodeRepository.findByFloorIdIn(floorIds).stream().map(nodeMapper::toDomain).collect(Collectors.toList());
    }

    @Override
    public Optional<MapNode> findNodeByAssetId(UUID assetId) {
        return nodeRepository.findFirstByAssetId(assetId).map(nodeMapper::toDomain);
    }

    @Override
    public Optional<MapNode> findNodeByLocationId(Long locationId) {
        return nodeRepository.findByLocationId(locationId).map(nodeMapper::toDomain);
    }

    @Override
    public void deleteNodeById(Long id) {
        nodeRepository.deleteById(id);
    }

    // ── Edge ───────────────────────────────────────────────────────────────

    @Override
    public MapEdge saveEdge(MapEdge edge) {
        return edgeMapper.toDomain(edgeRepository.save(edgeMapper.toEntity(edge)));
    }

    @Override
    public Optional<MapEdge> findEdgeById(Long id) {
        return edgeRepository.findById(id).map(edgeMapper::toDomain);
    }

    @Override
    public List<MapEdge> findEdgesByFloorId(Long floorId) {
        return edgeRepository.findByFloorId(floorId).stream().map(edgeMapper::toDomain).collect(Collectors.toList());
    }

    @Override
    public List<MapEdge> findEdgesByFloorIds(List<Long> floorIds) {
        return edgeRepository.findByFloorIds(floorIds).stream().map(edgeMapper::toDomain).collect(Collectors.toList());
    }

    @Override
    public List<MapEdge> findEdgesByNodeId(Long nodeId) {
        return edgeRepository.findByNodeIds(List.of(nodeId)).stream().map(edgeMapper::toDomain).collect(Collectors.toList());
    }

    @Override
    public List<MapEdge> findAllEdges() {
        return edgeRepository.findAll().stream().map(edgeMapper::toDomain).collect(Collectors.toList());
    }

    @Override
    public void deleteEdgeById(Long id) {
        edgeRepository.deleteById(id);
    }

    @Override
    public boolean existsEdgeBetween(Long nodeAId, Long nodeBId) {
        return edgeRepository.existsBetween(nodeAId, nodeBId);
    }

    @Override
    public List<MapNode> findAllNodes() {
        return nodeRepository.findAll().stream().map(nodeMapper::toDomain).collect(Collectors.toList());
    }
}
