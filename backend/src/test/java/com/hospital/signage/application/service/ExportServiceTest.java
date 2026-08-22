package com.hospital.signage.application.service;

import com.hospital.signage.adapter.out.persistence.repository.AssetRepository;
import com.hospital.signage.adapter.out.persistence.repository.TicketRepository;
import com.hospital.signage.adapter.out.persistence.repository.UserRepository;
import com.hospital.signage.domain.model.User;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ExportServiceTest {

    @Mock
    private TicketRepository ticketRepository;
    @Mock
    private AssetRepository assetRepository;
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private ExportService exportService;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    private void loginAs(Long hospitalId) {
        User principal = User.builder().id(1L).username("caller").hospitalId(hospitalId).build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, Collections.emptyList()));
    }

    @Test
    void exportUsers_regularAdmin_onlyExportsOwnHospital() throws Exception {
        loginAs(1L);
        when(userRepository.findByHospitalId(1L)).thenReturn(List.of());

        exportService.exportUsers();

        verify(userRepository).findByHospitalId(1L);
        verify(userRepository, never()).findAll();
    }

    @Test
    void exportUsers_superAdmin_exportsAllHospitals() throws Exception {
        loginAs(null);
        when(userRepository.findAll()).thenReturn(List.of());

        exportService.exportUsers();

        verify(userRepository).findAll();
        verify(userRepository, never()).findByHospitalId(any());
    }

    @Test
    void exportAssets_regularAdmin_onlyExportsOwnHospital() throws Exception {
        loginAs(1L);
        Page<com.hospital.signage.adapter.out.persistence.entity.AssetEntity> emptyPage = new PageImpl<>(List.of());
        when(assetRepository.findByHospitalId(eq(1L), any())).thenReturn(emptyPage);

        exportService.exportAssets("");

        verify(assetRepository).findByHospitalId(eq(1L), any());
        verify(assetRepository, never()).findAll();
    }
}
