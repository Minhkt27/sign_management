package com.hospital.signage.application.port.in;

import com.hospital.signage.domain.model.Location;
import java.util.List;
import java.util.Optional;

public interface LocationUseCase {
    Location createLocation(Location location);
    Location updateLocation(Long id, Location location);
    Optional<Location> getLocationById(Long id);
    List<Location> getAllLocations();
    List<Location> getChildrenLocations(Long parentId);
    void deleteLocation(Long id);
    List<LocationTreeNode> getLocationTree();

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
