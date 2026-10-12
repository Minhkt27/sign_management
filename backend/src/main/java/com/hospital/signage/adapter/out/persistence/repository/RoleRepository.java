package com.hospital.signage.adapter.out.persistence.repository;

import com.hospital.signage.adapter.out.persistence.entity.RoleEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RoleRepository extends JpaRepository<RoleEntity, Long> {
    Optional<RoleEntity> findByCode(String code);

    Optional<RoleEntity> findByCodeAndHospitalId(String code, Long hospitalId);

    Optional<RoleEntity> findByCodeAndHospitalIdIsNull(String code);

    @Query("SELECT r FROM RoleEntity r WHERE (:hospitalId IS NULL OR r.hospitalId IS NULL OR r.hospitalId = :hospitalId) ORDER BY r.id ASC")
    List<RoleEntity> findAllAccessible(@Param("hospitalId") Long hospitalId);
}
