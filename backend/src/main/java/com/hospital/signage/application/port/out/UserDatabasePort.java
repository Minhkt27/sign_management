package com.hospital.signage.application.port.out;

import com.hospital.signage.domain.enums.Role;
import com.hospital.signage.domain.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

public interface UserDatabasePort {
    User save(User user);
    Optional<User> findById(Long id);
    Optional<User> findByUsername(String username);
    List<User> findByRole(Role role);
    List<User> findAll();
    Page<User> findPage(String search, Pageable pageable);
}
