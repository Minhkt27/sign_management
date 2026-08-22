package com.hospital.signage.application.port.in;

import com.hospital.signage.domain.model.Hospital;
import org.springframework.data.domain.Page;

import java.util.List;
import java.util.Optional;

public interface HospitalUseCase {
    Hospital createHospital(Hospital hospital);
    Hospital updateHospital(Long id, Hospital hospital);
    Optional<Hospital> getHospitalById(Long id);
    List<Hospital> getAllHospitals();
    Optional<Hospital> getNearbyHospital(Double lat, Double lng);
    Page<Hospital> getHospitalsPage(int page, int size, String search);
    void deleteHospital(Long id);
}
