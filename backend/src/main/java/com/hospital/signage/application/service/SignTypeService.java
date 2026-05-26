package com.hospital.signage.application.service;

import com.hospital.signage.application.port.in.SignTypeUseCase;
import com.hospital.signage.application.port.out.AssetDatabasePort;
import com.hospital.signage.application.port.out.SignTypeDatabasePort;
import com.hospital.signage.domain.model.SignType;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class SignTypeService implements SignTypeUseCase {

    private final SignTypeDatabasePort signTypeDatabasePort;
    private final AssetDatabasePort assetDatabasePort;

    @Override
    @Transactional
    public SignType createSignType(SignType signType) {
        // Check unique code
        signTypeDatabasePort.findByCode(signType.getCode()).ifPresent(existing -> {
            throw new IllegalArgumentException("Mã loại biển '" + signType.getCode() + "' đã tồn tại.");
        });

        signType.setCreatedAt(Instant.now());
        signType.setUpdatedAt(Instant.now());
        return signTypeDatabasePort.save(signType);
    }

    @Override
    @Transactional
    public SignType updateSignType(Long id, SignType signTypeDetails) {
        SignType existing = signTypeDatabasePort.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy loại biển với ID: " + id));

        // Check unique code if changed
        if (!existing.getCode().equals(signTypeDetails.getCode())) {
            signTypeDatabasePort.findByCode(signTypeDetails.getCode()).ifPresent(duplicate -> {
                throw new IllegalArgumentException("Mã loại biển '" + signTypeDetails.getCode() + "' đã tồn tại.");
            });
        }

        existing.setCode(signTypeDetails.getCode());
        existing.setName(signTypeDetails.getName());
        existing.setDescription(signTypeDetails.getDescription());
        existing.setUpdatedAt(Instant.now());
        return signTypeDatabasePort.save(existing);
    }

    @Override
    public Optional<SignType> getSignTypeById(Long id) {
        return signTypeDatabasePort.findById(id);
    }

    @Override
    public List<SignType> getAllSignTypes() {
        return signTypeDatabasePort.findAll();
    }

    @Override
    public Page<SignType> getSignTypesPage(int page, int size, String search) {
        return signTypeDatabasePort.findPage(search, PageRequest.of(page, size));
    }

    @Override
    @Transactional
    public void deleteSignType(Long id) {
        signTypeDatabasePort.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy loại biển với ID: " + id));

        // Check if any assets are using this sign type
        if (assetDatabasePort.existsBySignTypeId(id)) {
            throw new IllegalArgumentException("Không thể xóa loại biển này vì đang có biển báo sử dụng.");
        }

        signTypeDatabasePort.deleteById(id);
    }
}
