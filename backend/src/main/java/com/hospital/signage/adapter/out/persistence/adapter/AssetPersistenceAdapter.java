package com.hospital.signage.adapter.out.persistence.adapter;

import com.hospital.signage.adapter.out.persistence.entity.AssetEntity;
import com.hospital.signage.adapter.out.persistence.mapper.AssetMapper;
import com.hospital.signage.adapter.out.persistence.repository.AssetRepository;
import com.hospital.signage.application.port.out.AssetDatabasePort;
import com.hospital.signage.domain.model.Asset;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class AssetPersistenceAdapter implements AssetDatabasePort {

    private final AssetRepository repository;
    private final AssetMapper mapper;

    @Override
    public Asset save(Asset asset) {
        AssetEntity entity = mapper.toEntity(asset);
        AssetEntity saved = repository.save(entity);
        return mapper.toDomain(saved);
    }

    @Override
    public Optional<Asset> findById(UUID id) {
        return repository.findById(id).map(mapper::toDomain);
    }

    @Override
    public Optional<Asset> findByAssetCode(String assetCode) {
        return repository.findByAssetCode(assetCode).map(mapper::toDomain);
    }

    @Override
    public List<Asset> findAll() {
        return repository.findAll().stream()
                .map(mapper::toDomain)
                .collect(Collectors.toList());
    }

    @Override
    public Page<Asset> findAll(Pageable pageable) {
        return repository.findAll(pageable).map(mapper::toDomain);
    }

    @Override
    public Page<Asset> search(String search, Pageable pageable) {
        String s = search == null ? "" : search;
        return repository.search(s, pageable).map(mapper::toDomain);
    }

    @Override
    public List<Asset> findByLocationId(Long locationId) {
        return repository.findByLocationId(locationId).stream()
                .map(mapper::toDomain)
                .collect(Collectors.toList());
    }

    @Override
    public List<Asset> findBySignTypeId(Long signTypeId) {
        return repository.findBySignTypeId(signTypeId).stream()
                .map(mapper::toDomain)
                .collect(Collectors.toList());
    }

    @Override
    public boolean existsByLocationId(Long locationId) {
        return repository.existsByLocationId(locationId);
    }

    @Override
    public boolean existsBySignTypeId(Long signTypeId) {
        return repository.existsBySignTypeId(signTypeId);
    }

    @Override
    public void deleteById(UUID id) {
        repository.deleteById(id);
    }
}
