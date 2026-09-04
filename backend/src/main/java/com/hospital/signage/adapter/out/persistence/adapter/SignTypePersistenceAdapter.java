package com.hospital.signage.adapter.out.persistence.adapter;

import com.hospital.signage.adapter.out.persistence.entity.SignTypeEntity;
import com.hospital.signage.adapter.out.persistence.mapper.SignTypeMapper;
import com.hospital.signage.adapter.out.persistence.repository.SignTypeRepository;
import com.hospital.signage.application.port.out.SignTypeDatabasePort;
import com.hospital.signage.domain.model.SignType;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class SignTypePersistenceAdapter implements SignTypeDatabasePort {

    private final SignTypeRepository repository;
    private final SignTypeMapper mapper;

    @Override
    public SignType save(SignType signType) {
        SignTypeEntity entity = mapper.toEntity(signType);
        SignTypeEntity saved = repository.save(entity);
        return mapper.toDomain(saved);
    }

    @Override
    public Optional<SignType> findById(Long id) {
        return repository.findById(id).map(mapper::toDomain);
    }

    @Override
    public Optional<SignType> findByCode(String code, Long hospitalId) {
        return repository.findByCodeAndHospitalId(code, hospitalId).map(mapper::toDomain);
    }

    @Override
    public List<SignType> findAll() {
        return repository.findAll().stream()
                .map(mapper::toDomain)
                .collect(Collectors.toList());
    }

    @Override
    public List<SignType> findAllByHospital(Long hospitalId) {
        return repository.findAllByHospital(hospitalId).stream()
                .map(mapper::toDomain)
                .collect(Collectors.toList());
    }

    @Override
    public Page<SignType> findPage(String search, Long hospitalId, Pageable pageable) {
        String s = search == null ? "" : search;
        return repository.search(s, hospitalId, pageable).map(mapper::toDomain);
    }

    @Override
    public void deleteById(Long id) {
        repository.deleteById(id);
    }
}
