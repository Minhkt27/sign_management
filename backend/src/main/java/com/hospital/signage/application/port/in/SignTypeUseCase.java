package com.hospital.signage.application.port.in;

import com.hospital.signage.domain.model.SignType;
import org.springframework.data.domain.Page;

import java.util.List;
import java.util.Optional;

public interface SignTypeUseCase {
    SignType createSignType(SignType signType);
    SignType updateSignType(Long id, SignType signType);
    Optional<SignType> getSignTypeById(Long id);
    List<SignType> getAllSignTypes();
    Page<SignType> getSignTypesPage(int page, int size, String search);
    void deleteSignType(Long id);
}
