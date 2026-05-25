package com.hospital.signage.adapter.out.persistence.repository;

import com.hospital.signage.adapter.out.persistence.entity.UserEntity;
import com.hospital.signage.domain.enums.Role;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<UserEntity, Long> {
    Optional<UserEntity> findByUsername(String username);
    List<UserEntity> findByRole(Role role);
    Page<UserEntity> findByUsernameContainingIgnoreCaseOrFullNameContainingIgnoreCase(
            String username, String fullName, Pageable pageable);
}
