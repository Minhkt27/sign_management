package com.hospital.signage.application.service;

import com.hospital.signage.application.port.out.AssetDatabasePort;
import com.hospital.signage.application.port.out.FileStoragePort;
import com.hospital.signage.application.port.out.LocationDatabasePort;
import com.hospital.signage.application.port.out.TicketDatabasePort;
import com.hospital.signage.domain.enums.AssetStatus;
import com.hospital.signage.domain.enums.Material;
import com.hospital.signage.domain.model.Asset;
import com.hospital.signage.domain.model.Location;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AssetServiceTest {

    @Mock
    private AssetDatabasePort assetDatabasePort;

    @Mock
    private LocationDatabasePort locationDatabasePort;

    @Mock
    private TicketDatabasePort ticketDatabasePort;

    @Mock
    private FileStoragePort fileStoragePort;

    @InjectMocks
    private AssetService assetService;

    private Asset sampleAsset;

    @BeforeEach
    void setUp() {
        sampleAsset = new Asset();
        sampleAsset.setId(UUID.randomUUID());
        sampleAsset.setAssetCode("ASSET-001");
        sampleAsset.setMaterial(Material.LED);
        sampleAsset.setStatus(AssetStatus.ACTIVE);
    }

    @Test
    void createAsset_withoutCode_generatesCode() {
        Asset input = new Asset();
        input.setMaterial(Material.MICA);
        when(assetDatabasePort.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Asset result = assetService.createAsset(input);

        assertThat(result.getAssetCode()).startsWith("ASSET_");
        assertThat(result.getId()).isNotNull();
    }

    @Test
    void createAsset_withValidLocation_linksLocation() {
        Location location = new Location();
        location.setId(1L);

        Asset input = new Asset();
        input.setAssetCode("ASSET-002");
        input.setLocation(location);

        when(locationDatabasePort.findById(1L)).thenReturn(Optional.of(location));
        when(assetDatabasePort.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Asset result = assetService.createAsset(input);

        assertThat(result.getLocation()).isEqualTo(location);
        verify(locationDatabasePort).findById(1L);
    }

    @Test
    void createAsset_withInvalidLocation_throwsIllegalArgument() {
        Location location = new Location();
        location.setId(99L);

        Asset input = new Asset();
        input.setLocation(location);
        when(locationDatabasePort.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> assetService.createAsset(input))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Location not found");
    }

    @Test
    void getAssetById_existingId_returnsAsset() {
        sampleAsset.setHospitalId(1L);
        when(assetDatabasePort.findById(sampleAsset.getId())).thenReturn(Optional.of(sampleAsset));

        Optional<Asset> result = assetService.getAssetById(sampleAsset.getId(), 1L);

        assertThat(result).isPresent().contains(sampleAsset);
    }

    @Test
    void getAssetById_missingId_returnsEmpty() {
        UUID missing = UUID.randomUUID();
        when(assetDatabasePort.findById(missing)).thenReturn(Optional.empty());

        assertThat(assetService.getAssetById(missing, 1L)).isEmpty();
    }

    @Test
    void getAssetById_belongsToOtherHospital_returnsEmpty() {
        sampleAsset.setHospitalId(2L);
        when(assetDatabasePort.findById(sampleAsset.getId())).thenReturn(Optional.of(sampleAsset));

        assertThat(assetService.getAssetById(sampleAsset.getId(), 1L)).isEmpty();
    }

    @Test
    void getAssetById_superAdmin_ignoresHospitalId() {
        sampleAsset.setHospitalId(2L);
        when(assetDatabasePort.findById(sampleAsset.getId())).thenReturn(Optional.of(sampleAsset));

        Optional<Asset> result = assetService.getAssetById(sampleAsset.getId(), null);

        assertThat(result).isPresent().contains(sampleAsset);
    }

    @Test
    void deleteAsset_withLinkedTickets_throwsIllegalArgument() {
        when(assetDatabasePort.findById(sampleAsset.getId())).thenReturn(Optional.of(sampleAsset));
        when(ticketDatabasePort.existsByAssetId(sampleAsset.getId())).thenReturn(true);

        assertThatThrownBy(() -> assetService.deleteAsset(sampleAsset.getId(), null))
                .isInstanceOf(IllegalArgumentException.class);

        verify(assetDatabasePort, never()).deleteById(any());
    }

    @Test
    void deleteAsset_withNoTickets_deletesSuccessfully() {
        when(assetDatabasePort.findById(sampleAsset.getId())).thenReturn(Optional.of(sampleAsset));
        when(ticketDatabasePort.existsByAssetId(sampleAsset.getId())).thenReturn(false);
        doNothing().when(assetDatabasePort).deleteById(sampleAsset.getId());

        assetService.deleteAsset(sampleAsset.getId(), null);

        verify(assetDatabasePort).deleteById(sampleAsset.getId());
    }

    @Test
    void getAllAssets_returnsList() {
        when(assetDatabasePort.findAllByHospital(any())).thenReturn(List.of(sampleAsset));

        List<Asset> result = assetService.getAllAssets(1L);

        assertThat(result).hasSize(1).contains(sampleAsset);
    }
}
