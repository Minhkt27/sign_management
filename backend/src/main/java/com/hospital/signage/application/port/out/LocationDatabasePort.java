package com.hospital.signage.application.port.out;

import com.hospital.signage.domain.model.Location;

import java.util.List;
import java.util.Optional;

public interface LocationDatabasePort {
    Location save(Location location);
    Optional<Location> findById(Long id);
    List<Location> findAll();
    List<Location> findByParentId(Long parentId);
    boolean existsByParentId(Long parentId);
    void bulkUpdatePathPrefix(String oldPath, String newPath);
    void deleteById(Long id);
}
