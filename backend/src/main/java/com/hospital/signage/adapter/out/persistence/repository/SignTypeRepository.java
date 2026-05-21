package com.hospital.signage.adapter.out.persistence.repository;

import com.hospital.signage.adapter.out.persistence.entity.SignTypeEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SignTypeRepository extends JpaRepository<SignTypeEntity, Long> {
    Optional<SignTypeEntity> findByCode(String code);
}
