package com.hospital.signage.adapter.out.persistence.adapter;

import com.hospital.signage.adapter.out.persistence.entity.HospitalEntity;
import com.hospital.signage.adapter.out.persistence.mapper.HospitalMapper;
import com.hospital.signage.adapter.out.persistence.repository.HospitalRepository;
import com.hospital.signage.application.port.out.HospitalDatabasePort;
import com.hospital.signage.domain.model.Hospital;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class HospitalPersistenceAdapter implements HospitalDatabasePort {

    private final HospitalRepository repository;
    private final HospitalMapper mapper;

    @Override
    public Hospital save(Hospital hospital) {
        HospitalEntity entity = mapper.toEntity(hospital);
        HospitalEntity saved = repository.save(entity);
        return mapper.toDomain(saved);
    }

    @Override
    public Optional<Hospital> findById(Long id) {
        return repository.findById(id).map(mapper::toDomain);
    }

    @Override
    public Optional<Hospital> findByShortCode(String shortCode) {
        return repository.findByShortCode(shortCode).map(mapper::toDomain);
    }

    @Override
    public List<Hospital> findAll() {
        return repository.findAll().stream()
                .map(mapper::toDomain)
                .collect(Collectors.toList());
    }

    @Override
    public Page<Hospital> findPage(String search, Pageable pageable) {
        String s = search == null ? "" : search;
        return repository.search(s, pageable).map(mapper::toDomain);
    }

    @Override
    public void deleteById(Long id) {
        repository.deleteById(id);
    }
}
