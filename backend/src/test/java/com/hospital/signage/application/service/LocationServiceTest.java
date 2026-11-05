package com.hospital.signage.application.service;

import com.hospital.signage.application.port.out.AssetDatabasePort;
import com.hospital.signage.application.port.out.LocationDatabasePort;
import com.hospital.signage.application.port.out.MapDatabasePort;
import com.hospital.signage.domain.model.Location;
import com.hospital.signage.domain.model.MapFloor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LocationServiceTest {

    @Mock private LocationDatabasePort locationDatabasePort;
    @Mock private AssetDatabasePort assetDatabasePort;
    @Mock private MapDatabasePort mapDatabasePort;

    @InjectMocks private LocationService locationService;

    private static final Long LOCATION_ID = 15L;
    private static final Long HOSPITAL_ID = 1L;

    @BeforeEach
    void setUp() {
        Location location = Location.builder()
                .id(LOCATION_ID).locationCode("TANG_1").name("Tầng 1")
                .hospitalId(HOSPITAL_ID).path("TOA_A.TANG_1")
                .build();
        lenient().when(locationDatabasePort.findById(LOCATION_ID)).thenReturn(Optional.of(location));
        lenient().when(locationDatabasePort.countByParentId(LOCATION_ID)).thenReturn(0L);
        lenient().when(assetDatabasePort.countByLocationId(LOCATION_ID)).thenReturn(0L);
        lenient().when(mapDatabasePort.findFloorByLocationId(LOCATION_ID)).thenReturn(Optional.empty());
    }

    @Test
    void viTriTrong_xoaDuoc() {
        locationService.deleteLocation(LOCATION_ID, HOSPITAL_ID);

        verify(locationDatabasePort).deleteById(LOCATION_ID);
    }

    // Sơ đồ tầng cũng chặn xoá (map_floors.location_id là NOT NULL, không có ON DELETE) nhưng
    // trước đây không được kiểm tra, nên khoá ngoại ném ra câu chung chung về "liên kết dữ
    // liệu" và người dùng không đoán được là vướng sơ đồ.
    @Test
    void viTriConSoDoTang_baoRoLaVuongSoDo() {
        when(mapDatabasePort.findFloorByLocationId(LOCATION_ID))
                .thenReturn(Optional.of(MapFloor.builder().id(3L).locationId(LOCATION_ID).build()));

        assertThatThrownBy(() -> locationService.deleteLocation(LOCATION_ID, HOSPITAL_ID))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("sơ đồ tầng");

        verify(locationDatabasePort, never()).deleteById(any());
    }

    // Liệt kê hết trong một lần thay vì báo từng cái: dọn xong vị trí con rồi mới biết còn
    // biển báo là kiểu bắt người dùng thử đi thử lại.
    @Test
    void nhieuThuDangVuong_lietKeTatCaTrongMotLan() {
        when(locationDatabasePort.countByParentId(LOCATION_ID)).thenReturn(2L);
        when(assetDatabasePort.countByLocationId(LOCATION_ID)).thenReturn(5L);
        when(mapDatabasePort.findFloorByLocationId(LOCATION_ID))
                .thenReturn(Optional.of(MapFloor.builder().id(3L).locationId(LOCATION_ID).build()));

        assertThatThrownBy(() -> locationService.deleteLocation(LOCATION_ID, HOSPITAL_ID))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("2 vị trí con")
                .hasMessageContaining("5 biển báo")
                .hasMessageContaining("sơ đồ tầng");
    }

    @Test
    void viTriCuaVienKhac_khongXoaDuoc() {
        assertThatThrownBy(() -> locationService.deleteLocation(LOCATION_ID, 99L))
                .isInstanceOf(com.hospital.signage.domain.exception.HospitalScopeException.class);

        verify(locationDatabasePort, never()).deleteById(any());
    }

    // ── Xoá cả cây (khoa cùng các phòng) ───────────────────────────────────

    private static Location node(long id, Long parentId, com.hospital.signage.domain.enums.LocationType type, String name) {
        return Location.builder().id(id).parentId(parentId).type(type).name(name).hospitalId(HOSPITAL_ID).build();
    }

    /** Khoa 30 → Phòng 31, 32; Phòng 32 → (vị trí con lạ) 33. Ngoài cây: Khoa 40. */
    private Location seedTree() {
        var D = com.hospital.signage.domain.enums.LocationType.DEPARTMENT;
        var R = com.hospital.signage.domain.enums.LocationType.ROOM;
        Location khoa = node(30, 2L, D, "Khoa Nội");
        java.util.List<Location> all = java.util.List.of(khoa, node(31, 30L, R, "P101"), node(32, 30L, R, "P102"),
                node(33, 32L, R, "Góc P102"), node(40, 2L, D, "Khoa Ngoại"));
        when(locationDatabasePort.findById(30L)).thenReturn(Optional.of(khoa));
        lenient().when(locationDatabasePort.findAllByHospital(HOSPITAL_ID)).thenReturn(all);
        lenient().when(mapDatabasePort.findFloorByLocationId(any())).thenReturn(Optional.empty());
        return khoa;
    }

    @Test
    void xoaCaCay_xoaTuCapSauNhatLen_khongDungViTriNgoaiCay() {
        seedTree();

        locationService.deleteLocationTree(30L, HOSPITAL_ID);

        var order = org.mockito.Mockito.inOrder(locationDatabasePort);
        order.verify(locationDatabasePort).deleteById(33L);
        order.verify(locationDatabasePort).deleteById(30L);
        verify(locationDatabasePort).deleteById(31L);
        verify(locationDatabasePort).deleteById(32L);
        verify(locationDatabasePort, never()).deleteById(40L);
    }

    @Test
    void xemTruocXoa_demDungViTriCon() {
        seedTree();

        var impact = locationService.getDeleteImpact(30L, HOSPITAL_ID);

        assertThat(impact.descendantCount()).isEqualTo(3);
        assertThat(impact.descendantsByType()).containsEntry("Phòng", 3);
        assertThat(impact.blockers()).isEmpty();
        verify(locationDatabasePort, never()).deleteById(any());
    }

    @Test
    void xoaCaCay_conBienBaoTrongPhong_biChan_khongXoaGi() {
        seedTree();
        lenient().when(assetDatabasePort.countByLocationId(any())).thenReturn(0L);
        when(assetDatabasePort.countByLocationId(33L)).thenReturn(2L);

        assertThatThrownBy(() -> locationService.deleteLocationTree(30L, HOSPITAL_ID))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("2 biển báo");
        verify(locationDatabasePort, never()).deleteById(any());
    }

    @Test
    void xoaCaCay_conSoDoTang_biChan() {
        seedTree();
        when(mapDatabasePort.findFloorByLocationId(31L)).thenReturn(Optional.of(new MapFloor()));

        assertThat(locationService.getDeleteImpact(30L, HOSPITAL_ID).blockers()).containsExactly("1 sơ đồ tầng");
        assertThatThrownBy(() -> locationService.deleteLocationTree(30L, HOSPITAL_ID))
                .isInstanceOf(IllegalArgumentException.class);
        verify(locationDatabasePort, never()).deleteById(any());
    }

    @Test
    void xoaCaCay_vienKhac_biChan() {
        seedTree();

        assertThatThrownBy(() -> locationService.deleteLocationTree(30L, 99L))
                .isInstanceOf(com.hospital.signage.domain.exception.HospitalScopeException.class);
        verify(locationDatabasePort, never()).deleteById(any());
    }
}
