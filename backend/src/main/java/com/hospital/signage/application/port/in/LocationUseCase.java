package com.hospital.signage.application.port.in;

import com.hospital.signage.domain.model.Location;
import java.util.List;
import java.util.Map;
import java.util.Optional;

public interface LocationUseCase {
    Location createLocation(Location location);
    Location updateLocation(Long id, Location location, Long callerHospitalId);
    Optional<Location> getLocationById(Long id, Long callerHospitalId);
    List<Location> getAllLocations(Long hospitalId);
    List<Location> getChildrenLocations(Long parentId, Long hospitalId);
    void deleteLocation(Long id, Long callerHospitalId);

    /** Xoá sẽ kéo theo những gì — dùng để hiện hộp xác nhận trước khi xoá cả cây. */
    DeleteImpact getDeleteImpact(Long id, Long callerHospitalId);

    /** Xoá vị trí cùng toàn bộ vị trí con. Bị từ chối nếu trong cây còn biển báo hoặc sơ đồ tầng. */
    void deleteLocationTree(Long id, Long callerHospitalId);

    /**
     * @param descendantsByType số vị trí con theo loại, ví dụ "Phòng" → 12
     * @param blockers          những thứ còn chặn việc xoá; rỗng = xoá được
     */
    record DeleteImpact(Long id, String name, int descendantCount, Map<String, Integer> descendantsByType,
                        List<String> blockers) {
    }
    List<LocationTreeNode> getLocationTree(Long hospitalId);

    class LocationTreeNode {
        private Long id;
        private String locationCode;
        private String name;
        private Long parentId;
        private String path;
        private String description;
        private List<LocationTreeNode> children;

        public LocationTreeNode(Location location, List<LocationTreeNode> children) {
            this.id = location.getId();
            this.locationCode = location.getLocationCode();
            this.name = location.getName();
            this.parentId = location.getParentId();
            this.path = location.getPath();
            this.description = location.getDescription();
            this.children = children;
        }

        // Getters and Setters
        public Long getId() { return id; }
        public String getLocationCode() { return locationCode; }
        public String getName() { return name; }
        public Long getParentId() { return parentId; }
        public String getPath() { return path; }
        public String getDescription() { return description; }
        public List<LocationTreeNode> getChildren() { return children; }
        public void setChildren(List<LocationTreeNode> children) { this.children = children; }
    }
}
