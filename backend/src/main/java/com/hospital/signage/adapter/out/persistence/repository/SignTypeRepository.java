package com.hospital.signage.adapter.out.persistence.repository;

import com.hospital.signage.adapter.out.persistence.entity.SignTypeEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface SignTypeRepository extends JpaRepository<SignTypeEntity, Long> {
    Optional<SignTypeEntity> findByCode(String code);

    @Query(value = "SELECT * FROM sign_types WHERE unaccent(code) ILIKE unaccent('%' || :search || '%') OR unaccent(name) ILIKE unaccent('%' || :search || '%') ORDER BY created_at DESC",
           countQuery = "SELECT count(*) FROM sign_types WHERE unaccent(code) ILIKE unaccent('%' || :search || '%') OR unaccent(name) ILIKE unaccent('%' || :search || '%')",
           nativeQuery = true)
    Page<SignTypeEntity> search(@Param("search") String search, Pageable pageable);
}
