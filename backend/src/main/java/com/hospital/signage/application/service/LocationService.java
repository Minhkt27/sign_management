package com.hospital.signage.application.service;

import com.hospital.signage.application.port.in.LocationUseCase;
import com.hospital.signage.application.port.out.AssetDatabasePort;
import com.hospital.signage.application.port.out.LocationDatabasePort;
import com.hospital.signage.domain.enums.LocationType;
import com.hospital.signage.domain.model.Location;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LocationService implements LocationUseCase {

    private final LocationDatabasePort locationDatabasePort;
    private final AssetDatabasePort assetDatabasePort;

    @Override
    @Transactional
    public Location createLocation(Location location) {
        Location parent = location.getParentId() != null
                ? locationDatabasePort.findById(location.getParentId())
                        .orElseThrow(() -> new IllegalArgumentException("Parent location not found"))
                : null;

        if (parent != null && !java.util.Objects.equals(parent.getHospitalId(), location.getHospitalId())) {
            throw new IllegalArgumentException("Vị trí cha thuộc bệnh viện khác.");
        }

        if (location.getLocationCode() == null || location.getLocationCode().trim().isEmpty()) {
            location.setLocationCode(generateLocationCode(location.getName(), parent, location.getHospitalId()));
        }

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

        Location saved = locationDatabasePort.save(location);
        log.info("Location '{}' (id={}, code={}) created under parent {}",
                saved.getName(), saved.getId(), saved.getLocationCode(), saved.getParentId());
        return saved;
    }

    @Override
    public Optional<Location> getLocationById(Long id, Long callerHospitalId) {
        return locationDatabasePort.findById(id)
                .filter(loc -> callerHospitalId == null || callerHospitalId.equals(loc.getHospitalId()));
    }

    @Override
    public List<Location> getAllLocations(Long hospitalId) {
        return locationDatabasePort.findAllByHospital(hospitalId);
    }

    @Override
    public List<Location> getChildrenLocations(Long parentId, Long hospitalId) {
        return locationDatabasePort.findByParentIdAndHospital(parentId, hospitalId);
    }

    @Override
    @Transactional
    public void deleteLocation(Long id, Long callerHospitalId) {
        Location existing = locationDatabasePort.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Location not found"));
        assertSameHospital(existing, callerHospitalId);

        if (locationDatabasePort.existsByParentId(id)) {
            throw new IllegalArgumentException("Không thể xóa vị trí này vì vẫn còn vị trí con trực thuộc.");
        }
        if (assetDatabasePort.existsByLocationId(id)) {
            throw new IllegalArgumentException("Không thể xóa vị trí này vì đang có biển báo liên kết.");
        }
        locationDatabasePort.deleteById(id);
        log.info("Location {} deleted", id);
    }

    @Override
    @Transactional
    public Location updateLocation(Long id, Location locationDetails, Long callerHospitalId) {
        Location existing = locationDatabasePort.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Location not found"));
        assertSameHospital(existing, callerHospitalId);

        String oldPath = existing.getPath();
        existing.setName(locationDetails.getName());
        existing.setDescription(locationDetails.getDescription());

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
            log.info("Location {} path updated: {} → {}", id, oldPath, updated.getPath());
        }

        return updated;
    }

    @Override
    public List<LocationTreeNode> getLocationTree(Long hospitalId) {
        List<Location> allLocations = locationDatabasePort.findAllByHospital(hospitalId);

        Map<Long, List<Location>> parentGroup = allLocations.stream()
                .filter(l -> l.getParentId() != null)
                .collect(Collectors.groupingBy(l -> l.getParentId()));

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
        childNodes.sort(Comparator.comparing(n -> n.getLocationCode()));
        return new LocationTreeNode(node, childNodes);
    }

    // Generates a readable code like "TANG_1" or "B_A_TANG_1" based on parent code + name.
    // Appends a numeric suffix (_2, _3 ...) if the base code already exists.
    private String generateLocationCode(String name, Location parent, Long hospitalId) {
        String segment = CodeGenerator.normalizeToSegment(name, "LOC");
        String base = parent != null ? parent.getLocationCode() + "_" + segment : segment;
        return CodeGenerator.generateUnique(base, code -> locationDatabasePort.existsByLocationCode(code, hospitalId));
    }

    private String cleanForLtree(String input) {
        if (input == null) return "";
        return input.replaceAll("[^a-zA-Z0-9_]", "_");
    }

    // callerHospitalId == null nghĩa là SUPER_ADMIN, không giới hạn viện nào.
    private void assertSameHospital(Location location, Long callerHospitalId) {
        if (callerHospitalId != null && !callerHospitalId.equals(location.getHospitalId())) {
            throw new com.hospital.signage.domain.exception.HospitalScopeException(
                    "Không có quyền truy cập vị trí thuộc bệnh viện khác.");
        }
    }
}
