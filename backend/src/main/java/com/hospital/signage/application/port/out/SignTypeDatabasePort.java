package com.hospital.signage.application.port.out;

import com.hospital.signage.domain.model.SignType;

import java.util.List;
import java.util.Optional;

public interface SignTypeDatabasePort {
    SignType save(SignType signType);
    Optional<SignType> findById(Long id);
    Optional<SignType> findByCode(String code);
    List<SignType> findAll();
    void deleteById(Long id);
}
