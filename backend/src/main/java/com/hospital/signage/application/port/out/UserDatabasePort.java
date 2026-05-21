package com.hospital.signage.application.port.out;

import com.hospital.signage.domain.enums.Role;
import com.hospital.signage.domain.model.User;

import java.util.List;
import java.util.Optional;

public interface UserDatabasePort {
    User save(User user);
    Optional<User> findById(Long id);
    Optional<User> findByUsername(String username);
    List<User> findByRole(Role role);
}
