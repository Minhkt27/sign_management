package com.hospital.signage.adapter.out.persistence.adapter;

import com.hospital.signage.adapter.out.persistence.entity.LocationEntity;
import com.hospital.signage.adapter.out.persistence.mapper.LocationMapper;
import com.hospital.signage.adapter.out.persistence.repository.LocationRepository;
import com.hospital.signage.application.port.out.LocationDatabasePort;
import com.hospital.signage.domain.model.Location;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class LocationPersistenceAdapter implements LocationDatabasePort {

    private final LocationRepository repository;
    private final LocationMapper mapper;

    @Override
    public Location save(Location location) {
        LocationEntity entity = mapper.toEntity(location);
        LocationEntity saved = repository.save(entity);
        return mapper.toDomain(saved);
    }

    @Override
    public Optional<Location> findById(Long id) {
        return repository.findById(id).map(mapper::toDomain);
    }

    @Override
    public List<Location> findAll() {
        return repository.findAll().stream()
                .map(mapper::toDomain)
                .collect(Collectors.toList());
    }

    @Override
    public List<Location> findByParentId(Long parentId) {
        return repository.findByParentId(parentId).stream()
                .map(mapper::toDomain)
                .collect(Collectors.toList());
    }

    @Override
    public boolean existsByParentId(Long parentId) {
        return repository.existsByParentId(parentId);
    }

    @Override
    public void bulkUpdatePathPrefix(String oldPath, String newPath) {
        repository.bulkUpdatePathPrefix(oldPath, newPath);
    }

    @Override
    public void deleteById(Long id) {
        repository.deleteById(id);
    }
}
