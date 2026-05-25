package com.hospital.signage.application.service;

import com.hospital.signage.application.port.in.LocationUseCase;
import com.hospital.signage.application.port.out.AssetDatabasePort;
import com.hospital.signage.application.port.out.LocationDatabasePort;
import com.hospital.signage.domain.enums.LocationType;
import com.hospital.signage.domain.model.Location;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LocationService implements LocationUseCase {

    private final LocationDatabasePort locationDatabasePort;
    private final AssetDatabasePort assetDatabasePort;

    @Override
    @Transactional
    public Location createLocation(Location location) {
        location.setCreatedAt(LocalDateTime.now());
        location.setUpdatedAt(LocalDateTime.now());

        if (location.getLocationCode() == null || location.getLocationCode().trim().isEmpty()) {
            String base = "LOC_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
            location.setLocationCode(base);
        }

        // Fetch parent once, reuse for type inference and path building
        Location parent = location.getParentId() != null
                ? locationDatabasePort.findById(location.getParentId())
                        .orElseThrow(() -> new IllegalArgumentException("Parent location not found"))
                : null;

        if (location.getType() == null) {
            if (parent == null) {
                location.setType(LocationType.BUILDING);
            } else if (parent.getType() == LocationType.BUILDING) {
                location.setType(LocationType.FLOOR);
            } else if (parent.getType() == LocationType.FLOOR) {
                location.setType(LocationType.DEPARTMENT);
            } else {
                location.setType(LocationType.ROOM);
            }
        }

        String label = cleanForLtree(location.getLocationCode());
        location.setPath(parent != null ? parent.getPath() + "." + label : label);

        return locationDatabasePort.save(location);
    }

    private String cleanForLtree(String input) {
        if (input == null) return "";
        // Replace non-alphanumeric/non-underscore characters with underscore
        return input.replaceAll("[^a-zA-Z0-9_]", "_");
    }

    @Override
    public Optional<Location> getLocationById(Long id) {
        return locationDatabasePort.findById(id);
    }

    @Override
    public List<Location> getAllLocations() {
        return locationDatabasePort.findAll();
    }

    @Override
    public List<Location> getChildrenLocations(Long parentId) {
        return locationDatabasePort.findByParentId(parentId);
    }

    @Override
    @Transactional
    public void deleteLocation(Long id) {
        if (locationDatabasePort.existsByParentId(id)) {
            throw new IllegalArgumentException("Không thể xóa vị trí này vì vẫn còn vị trí con trực thuộc.");
        }
        if (assetDatabasePort.existsByLocationId(id)) {
            throw new IllegalArgumentException("Không thể xóa vị trí này vì đang có biển báo liên kết.");
        }
        locationDatabasePort.deleteById(id);
    }

    @Override
    @Transactional
    public Location updateLocation(Long id, Location locationDetails) {
        Location existing = locationDatabasePort.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Location not found"));

        String oldPath = existing.getPath();
        existing.setName(locationDetails.getName());
        existing.setDescription(locationDetails.getDescription());
        existing.setUpdatedAt(LocalDateTime.now());

        if (locationDetails.getLocationCode() != null && !locationDetails.getLocationCode().equals(existing.getLocationCode())) {
            existing.setLocationCode(locationDetails.getLocationCode());
            String label = cleanForLtree(locationDetails.getLocationCode());
            if (existing.getParentId() != null) {
                Location parent = locationDatabasePort.findById(existing.getParentId())
                        .orElseThrow(() -> new IllegalArgumentException("Parent location not found"));
                existing.setPath(parent.getPath() + "." + label);
            } else {
                existing.setPath(label);
            }
        }

        Location updated = locationDatabasePort.save(existing);

        if (!updated.getPath().equals(oldPath)) {
            locationDatabasePort.bulkUpdatePathPrefix(oldPath, updated.getPath());
        }

        return updated;
    }

    @Override
    public List<LocationTreeNode> getLocationTree() {
        List<Location> allLocations = locationDatabasePort.findAll();
        
        // Group by parentId
        Map<Long, List<Location>> parentGroup = allLocations.stream()
                .filter(l -> l.getParentId() != null)
                .collect(Collectors.groupingBy(Location::getParentId));

        // Find root nodes
        List<Location> roots = allLocations.stream()
                .filter(l -> l.getParentId() == null)
                .collect(Collectors.toList());

        List<LocationTreeNode> tree = new ArrayList<>();
        for (Location root : roots) {
            tree.add(buildTreeNode(root, parentGroup));
        }

        return tree;
    }

    private LocationTreeNode buildTreeNode(Location node, Map<Long, List<Location>> parentGroup) {
        List<Location> children = parentGroup.getOrDefault(node.getId(), Collections.emptyList());
        List<LocationTreeNode> childNodes = new ArrayList<>();
        
        for (Location child : children) {
            childNodes.add(buildTreeNode(child, parentGroup));
        }

        // Sort children by code or name
        childNodes.sort(Comparator.comparing(LocationTreeNode::getLocationCode));

        return new LocationTreeNode(node, childNodes);
    }
}
