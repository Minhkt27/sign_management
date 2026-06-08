package com.hospital.signage.application.port.out;

import com.hospital.signage.domain.model.Role;

import java.util.List;
import java.util.Optional;

public interface RoleDatabasePort {
    Role save(Role role);
    Optional<Role> findById(Long id);
    Optional<Role> findByCode(String code);
    List<Role> findAll();
    void deleteById(Long id);
}
