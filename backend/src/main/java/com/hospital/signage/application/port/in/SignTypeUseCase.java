package com.hospital.signage.application.port.in;

import com.hospital.signage.domain.model.SignType;

import java.util.List;
import java.util.Optional;

public interface SignTypeUseCase {
    SignType createSignType(SignType signType);
    SignType updateSignType(Long id, SignType signType);
    Optional<SignType> getSignTypeById(Long id);
    List<SignType> getAllSignTypes();
    void deleteSignType(Long id);
}
