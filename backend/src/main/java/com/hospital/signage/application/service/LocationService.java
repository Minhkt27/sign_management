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
    private final com.hospital.signage.application.port.out.MapDatabasePort mapDatabasePort;

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

        // Liệt kê hết mọi thứ đang vướng trong một lần thay vì báo từng cái: dọn xong vị trí
        // con rồi mới biết còn biển báo, dọn xong biển báo rồi mới biết còn sơ đồ tầng — mỗi
        // vòng lại phải thử xoá lại mới biết còn gì.
        List<String> blockers = new ArrayList<>();
        long childCount = locationDatabasePort.countByParentId(id);
        long assetCount = assetDatabasePort.countByLocationId(id);
        // map_floors.location_id là NOT NULL và không có ON DELETE, nên sơ đồ tầng cũng chặn
        // xoá. Thiếu bước kiểm tra này thì khoá ngoại ném ra câu chung chung về "liên kết dữ
        // liệu" và người dùng không đoán được là vướng sơ đồ.
        boolean hasFloorPlan = mapDatabasePort.findFloorByLocationId(id).isPresent();

        if (childCount > 0) blockers.add(childCount + " vị trí con trực thuộc");
        if (assetCount > 0) blockers.add(assetCount + " biển báo");
        if (hasFloorPlan) blockers.add("1 sơ đồ tầng");

        if (!blockers.isEmpty()) {
            throw new IllegalArgumentException(
                    "Không thể xóa vị trí này vì vẫn còn " + String.join(", ", blockers)
                    + ". Vui lòng chuyển hoặc xóa các dữ liệu đó trước.");
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
            locationDatabasePort.bulkUpdatePathPrefix(oldPath, updated.getPath(), updated.getHospitalId());
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
    @Override
    public DeleteImpact getDeleteImpact(Long id, Long callerHospitalId) {
        Location root = locationDatabasePort.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Location not found"));
        assertSameHospital(root, callerHospitalId);
        return impactOf(root, subtreeDeepestLast(root));
    }

    @Override
    @Transactional
    public void deleteLocationTree(Long id, Long callerHospitalId) {
        Location root = locationDatabasePort.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Location not found"));
        assertSameHospital(root, callerHospitalId);
        List<Location> subtree = subtreeDeepestLast(root);
        // Tính lại ngay trong giao dịch xoá, không tin con số người dùng đã xem: giữa lúc mở
        // hộp xác nhận và lúc bấm, người khác có thể vừa gắn biển vào một phòng trong cây.
        DeleteImpact impact = impactOf(root, subtree);
        if (!impact.blockers().isEmpty()) {
            throw new IllegalArgumentException("Không thể xóa \"" + root.getName() + "\" vì trong đó vẫn còn "
                    + String.join(", ", impact.blockers()) + ". Vui lòng chuyển hoặc xóa các dữ liệu đó trước.");
        }
        // Xoá từ cấp sâu nhất lên: parent_id không có ON DELETE nên xoá cha trước sẽ vướng khoá ngoại.
        for (int i = subtree.size() - 1; i >= 0; i--) {
            locationDatabasePort.deleteById(subtree.get(i).getId());
        }
        log.warn("Location {} '{}' deleted together with {} descendant(s)", id, root.getName(), subtree.size() - 1);
    }

    /** Vị trí gốc + mọi vị trí con cháu, cha luôn đứng trước con. */
    private List<Location> subtreeDeepestLast(Location root) {
        Map<Long, List<Location>> byParent = new HashMap<>();
        for (Location l : locationDatabasePort.findAllByHospital(root.getHospitalId())) {
            if (l.getParentId() != null) byParent.computeIfAbsent(l.getParentId(), k -> new ArrayList<>()).add(l);
        }
        List<Location> ordered = new ArrayList<>();
        Deque<Location> queue = new ArrayDeque<>(List.of(root));
        Set<Long> visited = new HashSet<>();
        while (!queue.isEmpty()) {
            Location current = queue.poll();
            if (!visited.add(current.getId())) continue; // phòng dữ liệu lỗi tạo vòng lặp cha-con
            ordered.add(current);
            queue.addAll(byParent.getOrDefault(current.getId(), List.of()));
        }
        return ordered;
    }

    private DeleteImpact impactOf(Location root, List<Location> subtree) {
        Map<String, Integer> byType = new LinkedHashMap<>();
        long assets = 0;
        int floorPlans = 0;
        for (Location l : subtree) {
            if (l != root) byType.merge(typeLabel(l.getType()), 1, Integer::sum);
            assets += assetDatabasePort.countByLocationId(l.getId());
            if (mapDatabasePort.findFloorByLocationId(l.getId()).isPresent()) floorPlans++;
        }
        List<String> blockers = new ArrayList<>();
        if (assets > 0) blockers.add(assets + " biển báo");
        if (floorPlans > 0) blockers.add(floorPlans + " sơ đồ tầng");
        return new DeleteImpact(root.getId(), root.getName(), subtree.size() - 1, byType, blockers);
    }

    private static String typeLabel(LocationType type) {
        if (type == null) return "Vị trí";
        return switch (type) {
            case BUILDING -> "Tòa";
            case FLOOR -> "Tầng";
            case DEPARTMENT -> "Khoa";
            case ROOM -> "Phòng";
        };
    }

    private void assertSameHospital(Location location, Long callerHospitalId) {
        if (callerHospitalId != null && !callerHospitalId.equals(location.getHospitalId())) {
            throw new com.hospital.signage.domain.exception.HospitalScopeException(
                    "Không có quyền truy cập vị trí thuộc bệnh viện khác.");
        }
    }
}
