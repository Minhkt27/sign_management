package com.hospital.signage.application.service.imports;

import com.hospital.signage.application.port.in.LocationUseCase;
import com.hospital.signage.domain.enums.LocationType;
import com.hospital.signage.domain.model.Location;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Tìm hoặc lên kế hoạch tạo vị trí theo đường dẫn Tòa › Tầng › Khoa › Phòng, dùng chung cho
 * mọi loại nhập có cột vị trí (nhập vị trí, nhập biển báo...).
 *
 * <p>So khớp theo TÊN dưới cùng một vị trí cha, không phân biệt hoa/thường và khoảng trắng
 * thừa: "Phòng 101" ở Khoa A và "Phòng 101" ở Khoa B là hai phòng khác nhau. Vị trí chưa có
 * chỉ được ghi nhận trong bộ nhớ; chỉ khi gọi {@link #ensureCreated} mới thật sự tạo.
 */
public final class LocationPlanner {

    public static final List<String> LEVEL_HEADERS = List.of("Tòa", "Tầng", "Khoa", "Phòng");
    private static final List<LocationType> LEVEL_TYPES =
            List.of(LocationType.BUILDING, LocationType.FLOOR, LocationType.DEPARTMENT, LocationType.ROOM);
    private static final int MAX_NAME = 255;

    /** Một vị trí: đã có trong DB, hoặc mới được lên kế hoạch tạo. */
    public static final class Node {
        private final Node parent;
        private final String name;
        private final LocationType type;
        private final int firstRow;
        private Location location;
        private final Map<String, Node> children = new LinkedHashMap<>();

        private Node(Node parent, String name, LocationType type, Location existing, int firstRow) {
            this.parent = parent;
            this.name = name;
            this.type = type;
            this.location = existing;
            this.firstRow = firstRow;
        }

        public boolean existedBefore() {
            return firstRow == 0;
        }

        /** Dòng đầu tiên trong file nhắc tới vị trí mới này (0 nếu đã có từ trước). */
        public int firstRow() {
            return firstRow;
        }

        public LocationType type() {
            return type;
        }

        public String path() {
            return parent == null || parent.name == null ? name : parent.path() + " › " + name;
        }

        Location location() {
            return location;
        }
    }

    /** Kết quả phân giải một dòng: vị trí sâu nhất, hoặc lỗi, kèm các vị trí mới mà dòng này sinh ra. */
    public record Resolution(Node node, String error, List<Node> created) {
    }

    private final Long hospitalId;
    private final Node root = new Node(null, null, null, null, 0);
    private final List<Node> plannedInOrder = new ArrayList<>();

    public LocationPlanner(List<Location> existing, Long hospitalId) {
        this.hospitalId = hospitalId;
        Map<Long, List<Location>> byParent = new HashMap<>();
        for (Location l : existing) {
            byParent.computeIfAbsent(l.getParentId(), k -> new ArrayList<>()).add(l);
        }
        attach(root, byParent.getOrDefault(null, List.of()), byParent);
    }

    private void attach(Node parent, List<Location> locations, Map<Long, List<Location>> byParent) {
        for (Location l : locations) {
            // Nếu trong DB có 2 vị trí cùng tên dưới cùng cha, lấy cái đầu tiên — không tạo thêm.
            Node node = parent.children.computeIfAbsent(ImportText.key(l.getName()),
                    k -> new Node(parent, l.getName(), l.getType(), l, 0));
            if (node.location == l) {
                attach(node, byParent.getOrDefault(l.getId(), List.of()), byParent);
            }
        }
    }

    /** Đọc 4 cột vị trí của một dòng. Trả về null nếu cả 4 cột đều trống. */
    public static List<String> levelsOf(ImportRow row) {
        List<String> names = new ArrayList<>();
        for (String header : LEVEL_HEADERS) names.add(row.get(header));
        return names.stream().allMatch(n -> n == null) ? null : names;
    }

    public Resolution resolve(List<String> names, int row) {
        int depth = 0;
        for (int i = 0; i < names.size(); i++) {
            if (names.get(i) != null) depth = i + 1;
        }
        for (int i = 0; i < depth; i++) {
            if (names.get(i) == null) {
                return new Resolution(null, "Cột \"" + LEVEL_HEADERS.get(i) + "\" đang trống nhưng cột \""
                        + LEVEL_HEADERS.get(depth - 1) + "\" có giá trị. Hãy điền đủ các cấp từ Tòa trở xuống.", List.of());
            }
            if (names.get(i).length() > MAX_NAME) {
                return new Resolution(null, "Tên ở cột \"" + LEVEL_HEADERS.get(i) + "\" dài quá " + MAX_NAME + " ký tự.", List.of());
            }
        }
        Node current = root;
        List<Node> created = new ArrayList<>();
        for (int i = 0; i < depth; i++) {
            String name = names.get(i);
            Node parent = current;
            int level = i;
            current = parent.children.computeIfAbsent(ImportText.key(name), k -> {
                Node n = new Node(parent, name, LEVEL_TYPES.get(level), null, row);
                created.add(n);
                plannedInOrder.add(n);
                return n;
            });
        }
        return new Resolution(current, null, created);
    }

    public List<Node> planned() {
        return List.copyOf(plannedInOrder);
    }

    /** Tạo thật vị trí (và các cấp cha còn thiếu). Chỉ gọi trong bước ghi. */
    public Location ensureCreated(Node node, LocationUseCase locations) {
        if (node.location != null) return node.location;
        Location parent = node.parent == root ? null : ensureCreated(node.parent, locations);
        node.location = locations.createLocation(Location.builder()
                .name(node.name)
                .hospitalId(hospitalId)
                .parentId(parent != null ? parent.getId() : null)
                .type(node.type)
                .build());
        return node.location;
    }

    public static String typeLabel(LocationType type) {
        if (type == null) return "Vị trí";
        return switch (type) {
            case BUILDING -> "Tòa";
            case FLOOR -> "Tầng";
            case DEPARTMENT -> "Khoa";
            case ROOM -> "Phòng";
            default -> "Vị trí";
        };
    }
}
