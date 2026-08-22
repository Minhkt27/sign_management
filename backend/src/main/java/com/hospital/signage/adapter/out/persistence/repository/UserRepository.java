package com.hospital.signage.adapter.out.persistence.repository;

import com.hospital.signage.adapter.out.persistence.entity.UserEntity;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<UserEntity, Long> {
    Optional<UserEntity> findByUsername(String username);
    List<UserEntity> findByRoleId(Long roleId);
    List<UserEntity> findByHospitalId(Long hospitalId);

    @Query("SELECT u FROM UserEntity u WHERE u.roleId = :roleId AND (:hospitalId IS NULL OR u.hospitalId = :hospitalId)")
    List<UserEntity> findByRoleIdAndHospital(@Param("roleId") Long roleId, @Param("hospitalId") Long hospitalId);

    @Query(value = "SELECT * FROM users WHERE (:hospitalId IS NULL OR hospital_id = :hospitalId) AND (" +
                   "unaccent(username) ILIKE unaccent('%' || :search || '%') OR unaccent(full_name) ILIKE unaccent('%' || :search || '%')) " +
                   "ORDER BY created_at DESC",
           countQuery = "SELECT count(*) FROM users WHERE (:hospitalId IS NULL OR hospital_id = :hospitalId) AND (" +
                        "unaccent(username) ILIKE unaccent('%' || :search || '%') OR unaccent(full_name) ILIKE unaccent('%' || :search || '%'))",
           nativeQuery = true)
    Page<UserEntity> search(@Param("search") String search, @Param("hospitalId") Long hospitalId, Pageable pageable);
}
