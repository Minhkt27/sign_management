package com.hospital.signage.application.service;

import com.hospital.signage.application.port.out.AssetDatabasePort;
import com.hospital.signage.application.port.out.LocationDatabasePort;
import com.hospital.signage.application.port.out.MapDatabasePort;
import com.hospital.signage.domain.model.MapFloor;
import com.hospital.signage.domain.model.MapNode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Tập trung vào phần cách ly bệnh viện và vòng đời cache — những chỗ đã từng có lỗi.
 * Thuật toán tìm đường (Dijkstra, ghép đoạn liên tòa) chưa nằm trong phạm vi bộ test này.
 */
@ExtendWith(MockitoExtension.class)
class MapServiceTest {

    @Mock private MapDatabasePort mapDatabasePort;
    @Mock private LocationDatabasePort locationDatabasePort;
    @Mock private AssetDatabasePort assetDatabasePort;
    @Mock private MapGraphCache mapGraphCache;

    @InjectMocks private MapService mapService;

    private static final Long VIEN_A = 1L;
    private static final Long VIEN_B = 2L;

    private MapFloor floorVienA;
    private MapNode nodeVienA;

    @BeforeEach
    void setUp() {
        floorVienA = MapFloor.builder().id(10L).locationId(100L).hospitalId(VIEN_A)
                .imageUrl("a.png").imgWidth(800).imgHeight(600).build();
        nodeVienA = MapNode.builder().id(1000L).floorId(10L).x(0.5).y(0.5).build();

        lenient().when(mapDatabasePort.findFloorById(10L)).thenReturn(Optional.of(floorVienA));
    }

    // ── Cách ly bệnh viện ──────────────────────────────────────────────────

    @Test
    void soDoTangCuaVienKhac_khongDocDuoc() {
        assertThatThrownBy(() -> mapService.getFloorData(10L, VIEN_B))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void soDoTangCuaChinhVien_docDuoc() {
        when(mapDatabasePort.findNodesByFloorId(10L)).thenReturn(java.util.List.of(nodeVienA));
        when(mapDatabasePort.findEdgesByFloorId(10L)).thenReturn(java.util.List.of());

        var data = mapService.getFloorData(10L, VIEN_A);

        assertThat(data.floor().getId()).isEqualTo(10L);
    }

    // hospitalId null nghĩa là SUPER_ADMIN — không giới hạn viện nào.
    @Test
    void superAdmin_docDuocSoDoMoiVien() {
        when(mapDatabasePort.findNodesByFloorId(10L)).thenReturn(java.util.List.of());
        when(mapDatabasePort.findEdgesByFloorId(10L)).thenReturn(java.util.List.of());

        var data = mapService.getFloorData(10L, null);

        assertThat(data.floor().getHospitalId()).isEqualTo(VIEN_A);
    }

    @Test
    void timSoDoTheoViTri_locTheoVien() {
        when(mapDatabasePort.findFloorByLocationId(100L)).thenReturn(Optional.of(floorVienA));

        assertThat(mapService.getFloorByLocationId(100L, VIEN_A)).isPresent();
        assertThat(mapService.getFloorByLocationId(100L, VIEN_B))
                .as("viện khác không được thấy sơ đồ này")
                .isEmpty();
    }

    @Test
    void timNodeTheoViTri_locTheoVien() {
        when(mapDatabasePort.findNodeByLocationId(100L)).thenReturn(Optional.of(nodeVienA));

        assertThat(mapService.getNodeByLocationId(100L, VIEN_A)).isPresent();
        assertThat(mapService.getNodeByLocationId(100L, VIEN_B)).isEmpty();
    }

    @Test
    void timNodeTheoBienBao_locTheoVien() {
        UUID assetId = UUID.randomUUID();
        when(mapDatabasePort.findNodeByAssetId(assetId)).thenReturn(Optional.of(nodeVienA));

        assertThat(mapService.getNodeByAssetId(assetId, VIEN_A)).isPresent();
        assertThat(mapService.getNodeByAssetId(assetId, VIEN_B)).isEmpty();
    }

    @Test
    void suaSoDoCuaVienKhac_biTuChoi() {
        MapFloor thayDoi = MapFloor.builder().imageUrl("moi.png").imgWidth(1).imgHeight(1).build();

        assertThatThrownBy(() -> mapService.updateFloor(10L, thayDoi, VIEN_B))
                .isInstanceOf(IllegalArgumentException.class);
    }

    // ── Vòng đời cache đồ thị ──────────────────────────────────────────────

    // deleteFloor từng là hàm DUY NHẤT quên xoá cache: tầng bị xoá kéo theo node/edge trong
    // database, nhưng đồ thị trong bộ nhớ vẫn giữ, nên tìm đường tiếp tục dẫn qua tầng đã xoá.
    @Test
    void xoaSoDoTang_phaiXoaCacheDoThi() {
        mapService.deleteFloor(10L, VIEN_A);

        verify(mapDatabasePort).deleteFloorById(10L);
        verify(mapGraphCache).invalidateAll();
    }

    @Test
    void xoaNode_phaiXoaCacheDoThi() {
        when(mapDatabasePort.findNodeById(1000L)).thenReturn(Optional.of(nodeVienA));

        mapService.deleteNode(1000L, VIEN_A);

        verify(mapGraphCache).invalidateAll();
    }

    @Test
    void xoaSoDoCuaVienKhac_khongXoaVaKhongDungToiCache() {
        assertThatThrownBy(() -> mapService.deleteFloor(10L, VIEN_B))
                .isInstanceOf(IllegalArgumentException.class);

        verify(mapGraphCache, org.mockito.Mockito.never()).invalidateAll();
    }

    // ── Nối hai điểm ───────────────────────────────────────────────────────

    @Test
    void khongNoiHaiDiemThuocHaiBenhVienKhacNhau() {
        MapFloor floorVienB = MapFloor.builder().id(20L).hospitalId(VIEN_B)
                .imageUrl("b.png").imgWidth(800).imgHeight(600).build();
        MapNode nodeVienB = MapNode.builder().id(2000L).floorId(20L).x(0.1).y(0.1).build();

        when(mapDatabasePort.findNodeById(1000L)).thenReturn(Optional.of(nodeVienA));
        when(mapDatabasePort.findNodeById(2000L)).thenReturn(Optional.of(nodeVienB));
        when(mapDatabasePort.findFloorById(20L)).thenReturn(Optional.of(floorVienB));

        assertThatThrownBy(() -> mapService.createEdge(1000L, 2000L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("bệnh viện khác nhau");
    }
}
