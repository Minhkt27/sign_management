package com.hospital.signage.application.port.out;

import com.hospital.signage.domain.model.Hospital;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

public interface HospitalDatabasePort {
    Hospital save(Hospital hospital);
    Optional<Hospital> findById(Long id);
    Optional<Hospital> findByShortCode(String shortCode);
    List<Hospital> findAll();
    Page<Hospital> findPage(String search, Pageable pageable);
    void deleteById(Long id);
}
