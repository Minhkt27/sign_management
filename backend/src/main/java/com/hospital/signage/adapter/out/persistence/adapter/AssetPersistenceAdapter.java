package com.hospital.signage.adapter.out.persistence.adapter;

import com.hospital.signage.adapter.out.persistence.entity.AssetEntity;
import com.hospital.signage.adapter.out.persistence.mapper.AssetMapper;
import com.hospital.signage.adapter.out.persistence.repository.AssetRepository;
import com.hospital.signage.application.port.out.AssetDatabasePort;
import com.hospital.signage.domain.enums.AssetStatus;
import com.hospital.signage.domain.model.Asset;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
public class AssetPersistenceAdapter implements AssetDatabasePort {

    private static final int MAX_TREE_ASSETS = 1000;

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
        List<Asset> result = repository.findAll(PageRequest.of(0, MAX_TREE_ASSETS)).stream()
                .map(mapper::toDomain)
                .collect(Collectors.toList());
        if (result.size() == MAX_TREE_ASSETS) {
            log.warn("getAllAssets hit the {} limit — tree view may be incomplete", MAX_TREE_ASSETS);
        }
        return result;
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
    public Page<Asset> searchAndFilter(String search, AssetStatus status, Long locationId, Long signTypeId, Pageable pageable) {
        String s = search == null ? "" : search;
        String statusName = status == null ? null : status.name();
        return repository.searchAndFilter(s, statusName, locationId, signTypeId, pageable).map(mapper::toDomain);
    }

    @Override
    public Page<Asset> findByLocationId(Long locationId, Pageable pageable) {
        return repository.findByLocationId(locationId, pageable).map(mapper::toDomain);
    }

    @Override
    public Page<Asset> findBySignTypeId(Long signTypeId, Pageable pageable) {
        return repository.findBySignTypeId(signTypeId, pageable).map(mapper::toDomain);
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
