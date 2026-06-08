package com.hospital.signage.adapter.out.persistence.adapter;

import com.hospital.signage.adapter.out.persistence.entity.RoleEntity;
import com.hospital.signage.adapter.out.persistence.mapper.RoleMapper;
import com.hospital.signage.adapter.out.persistence.repository.RoleRepository;
import com.hospital.signage.application.port.out.RoleDatabasePort;
import com.hospital.signage.domain.model.Role;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class RolePersistenceAdapter implements RoleDatabasePort {

    private final RoleRepository repository;
    private final RoleMapper mapper;

    @Override
    public Role save(Role role) {
        RoleEntity entity = mapper.toEntity(role);
        RoleEntity saved = repository.save(entity);
        return mapper.toDomain(saved);
    }

    @Override
    public Optional<Role> findById(Long id) {
        return repository.findById(id).map(mapper::toDomain);
    }

    @Override
    public Optional<Role> findByCode(String code) {
        return repository.findByCode(code).map(mapper::toDomain);
    }

    @Override
    public List<Role> findAll() {
        return repository.findAll().stream().map(mapper::toDomain).toList();
    }

    @Override
    public void deleteById(Long id) {
        repository.deleteById(id);
    }
}
