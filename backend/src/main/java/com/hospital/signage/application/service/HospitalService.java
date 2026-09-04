package com.hospital.signage.application.service;

import com.hospital.signage.application.port.in.HospitalUseCase;
import com.hospital.signage.application.port.out.HospitalDatabasePort;
import com.hospital.signage.domain.model.Hospital;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class HospitalService implements HospitalUseCase {

    private static final long DEFAULT_HOSPITAL_ID = 1L;

    private final HospitalDatabasePort hospitalDatabasePort;

    @Override
    @Transactional
    public Hospital createHospital(Hospital hospital) {
        if (hospital.getShortCode() == null || hospital.getShortCode().trim().isEmpty()) {
            String base = CodeGenerator.normalizeToSegment(hospital.getName(), "BENH_VIEN");
            hospital.setShortCode(CodeGenerator.generateUnique(base,
                    code -> hospitalDatabasePort.findByShortCode(code).isPresent()));
        } else {
            hospitalDatabasePort.findByShortCode(hospital.getShortCode()).ifPresent(existing -> {
                throw new IllegalArgumentException("Mã viện '" + hospital.getShortCode() + "' đã tồn tại.");
            });
        }

        Hospital saved = hospitalDatabasePort.save(hospital);
        log.info("Hospital '{}' created with id {}", saved.getShortCode(), saved.getId());
        return saved;
    }

    @Override
    @Transactional
    public Hospital updateHospital(Long id, Hospital hospitalDetails) {
        Hospital existing = hospitalDatabasePort.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy bệnh viện với ID: " + id));

        if (hospitalDetails.getShortCode() == null || hospitalDetails.getShortCode().trim().isEmpty()) {
            throw new IllegalArgumentException("Mã viện không được để trống.");
        }

        if (!existing.getShortCode().equals(hospitalDetails.getShortCode())) {
            hospitalDatabasePort.findByShortCode(hospitalDetails.getShortCode()).ifPresent(duplicate -> {
                throw new IllegalArgumentException("Mã viện '" + hospitalDetails.getShortCode() + "' đã tồn tại.");
            });
        }

        existing.setName(hospitalDetails.getName());
        existing.setShortCode(hospitalDetails.getShortCode());
        existing.setAddress(hospitalDetails.getAddress());
        existing.setPhone(hospitalDetails.getPhone());
        existing.setEmail(hospitalDetails.getEmail());
        existing.setLatitude(hospitalDetails.getLatitude());
        existing.setLongitude(hospitalDetails.getLongitude());
        existing.setGpsRadiusM(hospitalDetails.getGpsRadiusM());
        existing.setLogoUrl(hospitalDetails.getLogoUrl());
        existing.setActive(hospitalDetails.getActive());
        return hospitalDatabasePort.save(existing);
    }

    @Override
    public Optional<Hospital> getHospitalById(Long id) {
        return hospitalDatabasePort.findById(id);
    }

    @Override
    public List<Hospital> getAllHospitals() {
        return hospitalDatabasePort.findAll();
    }

    @Override
    public Optional<Hospital> getNearbyHospital(Double lat, Double lng) {
        if (lat == null || lng == null) return Optional.empty();
        
        List<Hospital> allHospitals = hospitalDatabasePort.findAll();
        Hospital closest = null;
        double minDistance = Double.MAX_VALUE;

        for (Hospital h : allHospitals) {
            if (!Boolean.TRUE.equals(h.getActive()) || h.getLatitude() == null || h.getLongitude() == null) {
                continue;
            }
            
            double dist = haversineDistanceMeters(lat, lng, h.getLatitude(), h.getLongitude());
            if (dist < minDistance) {
                minDistance = dist;
                closest = h;
            }
        }

        if (closest != null && minDistance <= closest.getGpsRadiusM()) {
            return Optional.of(closest);
        }
        return Optional.empty();
    }

    private double haversineDistanceMeters(double lat1, double lon1, double lat2, double lon2) {
        final int EARTH_RADIUS_M = 6371000;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                   Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                   Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return EARTH_RADIUS_M * c;
    }

    @Override
    public Page<Hospital> getHospitalsPage(int page, int size, String search) {
        return hospitalDatabasePort.findPage(search, PageRequest.of(page, size));
    }

    @Override
    @Transactional
    public void deleteHospital(Long id) {
        hospitalDatabasePort.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy bệnh viện với ID: " + id));

        if (id.equals(DEFAULT_HOSPITAL_ID)) {
            throw new IllegalArgumentException("Không thể xóa bệnh viện mặc định.");
        }

        hospitalDatabasePort.deleteById(id);
    }
}
