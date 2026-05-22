package com.hospital.signage.adapter.out.persistence.adapter;

import com.hospital.signage.adapter.out.persistence.entity.UserEntity;
import com.hospital.signage.adapter.out.persistence.mapper.UserMapper;
import com.hospital.signage.adapter.out.persistence.repository.UserRepository;
import com.hospital.signage.application.port.out.UserDatabasePort;
import com.hospital.signage.domain.model.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class UserPersistenceAdapter implements UserDatabasePort {

    private final UserRepository repository;
    private final UserMapper mapper;

    @Override
    public User save(User user) {
        UserEntity entity = mapper.toEntity(user);
        UserEntity saved = repository.save(entity);
        return mapper.toDomain(saved);
    }

    @Override
    public Optional<User> findById(Long id) {
        return repository.findById(id).map(mapper::toDomain);
    }

    @Override
    public Optional<User> findByUsername(String username) {
        return repository.findByUsername(username).map(mapper::toDomain);
    }

    @Override
    public List<User> findByRole(com.hospital.signage.domain.enums.Role role) {
        return repository.findByRole(role).stream()
                .map(mapper::toDomain)
                .collect(java.util.stream.Collectors.toList());
    }

    @Override
    public List<User> findAll() {
        return repository.findAll().stream().map(mapper::toDomain).toList();
    }
}
