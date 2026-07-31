package com.hospital.signage.application.port.out;

import com.hospital.signage.domain.model.SignType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

public interface SignTypeDatabasePort {
    SignType save(SignType signType);
    Optional<SignType> findById(Long id);
    Optional<SignType> findByCode(String code);
    List<SignType> findAll();
    List<SignType> findAllByHospital(Long hospitalId);
    Page<SignType> findPage(String search, Long hospitalId, Pageable pageable);
    void deleteById(Long id);
}
