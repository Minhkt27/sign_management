package com.hospital.signage.application.service;

import com.hospital.signage.application.port.out.AssetDatabasePort;
import com.hospital.signage.application.port.out.HospitalDatabasePort;
import com.hospital.signage.application.port.out.LocationDatabasePort;
import com.hospital.signage.application.port.out.UserDatabasePort;
import com.hospital.signage.domain.model.Hospital;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HospitalServiceTest {

    @Mock private HospitalDatabasePort hospitalDatabasePort;
    @Mock private UserDatabasePort userDatabasePort;
    @Mock private LocationDatabasePort locationDatabasePort;
    @Mock private AssetDatabasePort assetDatabasePort;
    @Mock private com.hospital.signage.application.port.out.SignTypeDatabasePort signTypeDatabasePort;
    @Mock private com.hospital.signage.adapter.out.persistence.repository.NotificationRepository notificationRepository;

    @InjectMocks private HospitalService hospitalService;

    private static final Long HOSPITAL_ID = 7L;

    @BeforeEach
    void setUp() {
        Hospital hospital = Hospital.builder().id(HOSPITAL_ID).name("Bệnh viện B").shortCode("BVB").build();
        lenient().when(hospitalDatabasePort.findById(HOSPITAL_ID)).thenReturn(Optional.of(hospital));
        lenient().when(userDatabasePort.countByHospital(HOSPITAL_ID)).thenReturn(0L);
        lenient().when(locationDatabasePort.countByHospital(HOSPITAL_ID)).thenReturn(0L);
        lenient().when(assetDatabasePort.countByHospital(HOSPITAL_ID)).thenReturn(0L);
        lenient().when(signTypeDatabasePort.countByHospital(HOSPITAL_ID)).thenReturn(0L);
        lenient().when(notificationRepository.countByHospitalId(HOSPITAL_ID)).thenReturn(0L);
    }

    @Test
    void benhVienKhongConDuLieu_xoaDuoc() {
        hospitalService.deleteHospital(HOSPITAL_ID);

        verify(hospitalDatabasePort).deleteById(HOSPITAL_ID);
    }

    // Khoá ngoại dưới database cũng chặn, nhưng khi đó người dùng chỉ nhận câu chung chung
    // "có các liên kết dữ liệu khác" mà không biết phải dọn cái gì.
    @Test
    void conTaiKhoanVaBienBao_baoRoConLaiNhungGi() {
        when(userDatabasePort.countByHospital(HOSPITAL_ID)).thenReturn(3L);
        when(assetDatabasePort.countByHospital(HOSPITAL_ID)).thenReturn(12L);

        assertThatThrownBy(() -> hospitalService.deleteHospital(HOSPITAL_ID))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("3 tài khoản")
                .hasMessageContaining("12 biển báo");

        verify(hospitalDatabasePort, never()).deleteById(any());
    }

    @Test
    void conViTri_cungBiChan() {
        when(locationDatabasePort.countByHospital(HOSPITAL_ID)).thenReturn(8L);

        assertThatThrownBy(() -> hospitalService.deleteHospital(HOSPITAL_ID))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("8 vị trí");
    }

    // Loại biển và thông báo tồn tại độc lập với tài khoản/vị trí/biển báo, nên viện có thể
    // sạch ba thứ kia mà vẫn còn chúng. Bỏ sót là rơi về câu chung chung của khoá ngoại.
    @Test
    void conLoaiBien_cungBiChan() {
        when(signTypeDatabasePort.countByHospital(HOSPITAL_ID)).thenReturn(4L);

        assertThatThrownBy(() -> hospitalService.deleteHospital(HOSPITAL_ID))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("4 loại biển");

        verify(hospitalDatabasePort, never()).deleteById(any());
    }

    @Test
    void conThongBao_cungBiChan() {
        when(notificationRepository.countByHospitalId(HOSPITAL_ID)).thenReturn(11L);

        assertThatThrownBy(() -> hospitalService.deleteHospital(HOSPITAL_ID))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("11 thông báo");
    }

    @Test
    void benhVienMacDinh_khongBaoGioXoaDuoc() {
        Hospital macDinh = Hospital.builder().id(1L).name("Bệnh viện A").shortCode("BVA").build();
        lenient().when(hospitalDatabasePort.findById(1L)).thenReturn(Optional.of(macDinh));

        assertThatThrownBy(() -> hospitalService.deleteHospital(1L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("mặc định");

        verify(hospitalDatabasePort, never()).deleteById(any());
    }

    @Test
    void benhVienKhongTonTai_baoLoiRo() {
        when(hospitalDatabasePort.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> hospitalService.deleteHospital(99L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Không tìm thấy bệnh viện");
    }
}
