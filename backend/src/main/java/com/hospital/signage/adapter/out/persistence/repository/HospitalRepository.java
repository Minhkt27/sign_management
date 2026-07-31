package com.hospital.signage.adapter.out.persistence.repository;

import com.hospital.signage.adapter.out.persistence.entity.HospitalEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface HospitalRepository extends JpaRepository<HospitalEntity, Long> {
    Optional<HospitalEntity> findByShortCode(String shortCode);

    @Query(value = "SELECT * FROM hospitals WHERE unaccent(short_code) ILIKE unaccent('%' || :search || '%') OR unaccent(name) ILIKE unaccent('%' || :search || '%') ORDER BY created_at DESC",
           countQuery = "SELECT count(*) FROM hospitals WHERE unaccent(short_code) ILIKE unaccent('%' || :search || '%') OR unaccent(name) ILIKE unaccent('%' || :search || '%')",
           nativeQuery = true)
    Page<HospitalEntity> search(@Param("search") String search, Pageable pageable);
}
