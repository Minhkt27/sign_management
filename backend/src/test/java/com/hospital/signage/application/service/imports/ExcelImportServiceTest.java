package com.hospital.signage.application.service.imports;

import com.hospital.signage.application.port.in.AssetUseCase;
import com.hospital.signage.application.port.in.LocationUseCase;
import com.hospital.signage.application.port.out.AssetDatabasePort;
import com.hospital.signage.application.port.out.LocationDatabasePort;
import com.hospital.signage.application.port.out.SignTypeDatabasePort;
import com.hospital.signage.domain.enums.AssetStatus;
import com.hospital.signage.domain.enums.LocationType;
import com.hospital.signage.domain.enums.Material;
import com.hospital.signage.domain.model.Asset;
import com.hospital.signage.domain.model.Location;
import com.hospital.signage.domain.model.SignType;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ExcelImportServiceTest {

    private static final Long HOSPITAL = 2L;

    private final LocationDatabasePort locationDb = mock(LocationDatabasePort.class);
    private final LocationUseCase locationUseCase = mock(LocationUseCase.class);
    private final AssetDatabasePort assetDb = mock(AssetDatabasePort.class);
    private final AssetUseCase assetUseCase = mock(AssetUseCase.class);
    private final SignTypeDatabasePort signTypeDb = mock(SignTypeDatabasePort.class);
    private final PlatformTransactionManager tx = mock(PlatformTransactionManager.class);

    private final List<Location> existing = new ArrayList<>();
    private final List<Location> created = new ArrayList<>();
    private ExcelImportService service;

    @BeforeEach
    void setUp() {
        when(tx.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
        when(locationDb.findAllByHospital(HOSPITAL)).thenReturn(existing);
        when(assetDb.findAllByHospital(HOSPITAL)).thenReturn(new ArrayList<>());
        when(signTypeDb.findAllByHospital(HOSPITAL)).thenReturn(List.of(
                SignType.builder().id(7L).code("BIEN_PHONG").name("Biển phòng").hospitalId(HOSPITAL).build()));
        AtomicLong ids = new AtomicLong(100);
        when(locationUseCase.createLocation(any())).thenAnswer(inv -> {
            Location l = inv.getArgument(0);
            l.setId(ids.incrementAndGet());
            created.add(l);
            return l;
        });
        service = new ExcelImportService(List.of(
                new LocationImportHandler(locationDb, locationUseCase),
                new AssetImportHandler(assetDb, assetUseCase, locationDb, locationUseCase, signTypeDb)), tx);
        caller("MAP_MANAGE", "ASSET_MANAGE");
    }

    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
    }

    // ── Vị trí ─────────────────────────────────────────────────────────────

    @Test
    void xemTruoc_khongGhiGi() throws IOException {
        byte[] file = xlsx(List.of("Tòa", "Tầng", "Khoa", "Phòng"),
                List.of("Tòa A", "Tầng 1", "Khoa Cấp Cứu", "Phòng 101"));

        ImportResult r = service.preview("locations", file, HOSPITAL);

        assertThat(r.committed()).isFalse();
        assertThat(r.errorCount()).isZero();
        assertThat(r.summary()).containsEntry("Phòng tạo mới", 1).containsEntry("Tòa tạo mới", 1);
        verify(locationUseCase, never()).createLocation(any());
    }

    @Test
    void nhap_taoCapChaTruocVaGanDungCha() throws IOException {
        byte[] file = xlsx(List.of("Tòa", "Tầng", "Khoa", "Phòng"),
                List.of("Tòa A", "Tầng 1", "Khoa Cấp Cứu", "Phòng 101"),
                List.of("Tòa A", "Tầng 1", "Khoa Cấp Cứu", "Phòng 102"));

        ImportResult r = service.importFile("locations", file, HOSPITAL);

        assertThat(r.committed()).isTrue();
        assertThat(created).extracting(Location::getName)
                .containsExactly("Tòa A", "Tầng 1", "Khoa Cấp Cứu", "Phòng 101", "Phòng 102");
        assertThat(created.get(1).getParentId()).isEqualTo(created.get(0).getId());
        assertThat(created.get(4).getParentId()).isEqualTo(created.get(2).getId());
        assertThat(created.get(3).getType()).isEqualTo(LocationType.ROOM);
        assertThat(created).allMatch(l -> HOSPITAL.equals(l.getHospitalId()));
    }

    @Test
    void viTriDaCo_boQua_khongPhanBietHoaThuongVaKhoangTrang() throws IOException {
        Location toa = loc(1L, "Tòa A", null, LocationType.BUILDING);
        Location tang = loc(2L, "Tầng 1", 1L, LocationType.FLOOR);
        existing.addAll(List.of(toa, tang));
        byte[] file = xlsx(List.of("Tòa", "Tầng"),
                List.of("  tòa  a ", "TẦNG 1"),
                List.of("Tòa A", "Tầng 2"));

        ImportResult r = service.importFile("locations", file, HOSPITAL);

        assertThat(r.rows()).extracting(ImportResult.RowOutcome::status)
                .containsExactly(ImportResult.Status.SKIP, ImportResult.Status.CREATE);
        assertThat(created).singleElement().satisfies(l -> {
            assertThat(l.getName()).isEqualTo("Tầng 2");
            assertThat(l.getParentId()).isEqualTo(1L);
        });
    }

    @Test
    void trungDongTrongFile_boQuaDongSau() throws IOException {
        byte[] file = xlsx(List.of("Tòa", "Tầng"), List.of("Tòa A", "Tầng 1"), List.of("Tòa A", "Tầng 1"));

        ImportResult r = service.preview("locations", file, HOSPITAL);

        assertThat(r.rows().get(1).status()).isEqualTo(ImportResult.Status.SKIP);
        assertThat(r.rows().get(1).message()).contains("dòng 2");
    }

    @Test
    void conDongLoi_khongGhiDongNao() throws IOException {
        byte[] file = xlsx(List.of("Tòa", "Tầng", "Khoa", "Phòng"),
                List.of("Tòa A", "Tầng 1", "Khoa Cấp Cứu", "Phòng 101"),
                List.of("Tòa A", "", "Khoa Nội", ""));

        ImportResult r = service.importFile("locations", file, HOSPITAL);

        assertThat(r.committed()).isFalse();
        assertThat(r.errorCount()).isEqualTo(1);
        assertThat(r.rows().get(1).row()).as("số dòng đúng như trong Excel").isEqualTo(3);
        assertThat(r.rows().get(1).message()).contains("Tầng");
        verify(locationUseCase, never()).createLocation(any());
    }

    @Test
    void thieuCotBatBuoc_baoLoiCaFile() throws IOException {
        byte[] file = xlsx(List.of("Tầng", "Phòng"), List.of("Tầng 1", "Phòng 101"));

        ImportResult r = service.importFile("locations", file, HOSPITAL);

        assertThat(r.committed()).isFalse();
        assertThat(r.rows()).singleElement().satisfies(o -> assertThat(o.message()).contains("Tòa"));
    }

    @Test
    void fileKhongPhaiExcel_baoLoiDeHieu() {
        ImportResult r = service.preview("locations", "không phải excel".getBytes(), HOSPITAL);

        assertThat(r.errorCount()).isEqualTo(1);
        assertThat(r.rows().get(0).message()).contains("Không đọc được file");
    }

    // ── Biển báo ───────────────────────────────────────────────────────────

    private static final List<String> ASSET_HEADERS = List.of(
            "Tên biển *", "Tòa", "Tầng", "Khoa", "Phòng", "Loại biển", "Chất liệu *", "Trạng thái", "Ngày lắp");

    @Test
    void bienBao_hopLe_taoBienVaViTriConThieu() throws IOException {
        byte[] file = xlsx(ASSET_HEADERS,
                List.of("Biển P101", "Tòa A", "Tầng 1", "", "", "Biển phòng", "mica", "Báo hỏng", "01/10/2026"));

        ImportResult r = service.importFile("assets", file, HOSPITAL);

        assertThat(r.committed()).isTrue();
        assertThat(r.summary()).containsEntry("Biển báo tạo mới", 1).containsEntry("Tầng tạo mới", 1);
        ArgumentCaptor<Asset> asset = ArgumentCaptor.forClass(Asset.class);
        verify(assetUseCase).createAsset(asset.capture());
        Asset a = asset.getValue();
        assertThat(a.getHospitalId()).isEqualTo(HOSPITAL);
        assertThat(a.getMaterial()).isEqualTo(Material.MICA);
        assertThat(a.getStatus()).isEqualTo(AssetStatus.DAMAGED);
        assertThat(a.getSignTypeId()).isEqualTo(7L);
        assertThat(a.getInstalledAt()).isEqualTo(Instant.parse("2026-10-01T00:00:00Z"));
        assertThat(a.getLocation().getName()).isEqualTo("Tầng 1");
        assertThat(a.getAssetCode()).as("mã biển do hệ thống sinh").isNull();
    }

    @Test
    void bienBao_loiGopDuLyDoTrongMotDong() throws IOException {
        byte[] file = xlsx(ASSET_HEADERS,
                List.of("Biển P101", "Tòa A", "", "", "", "Biển lạ", "Gỗ", "Mất", "31/02/2026"));

        ImportResult r = service.importFile("assets", file, HOSPITAL);

        assertThat(r.committed()).isFalse();
        assertThat(r.rows().get(0).message())
                .contains("Biển lạ").contains("Gỗ").contains("Mất").contains("31/02/2026");
        verify(assetUseCase, never()).createAsset(any());
    }

    @Test
    void bienBao_trungTenVaViTriVoiBienDaCo_boQua() throws IOException {
        Location toa = loc(1L, "Tòa A", null, LocationType.BUILDING);
        existing.add(toa);
        Asset old = new Asset();
        old.setName("Biển sảnh");
        old.setLocation(toa);
        when(assetDb.findAllByHospital(HOSPITAL)).thenReturn(List.of(old));
        byte[] file = xlsx(ASSET_HEADERS, List.of("biển sảnh", "Tòa A", "", "", "", "", "INOX", "", ""));

        ImportResult r = service.importFile("assets", file, HOSPITAL);

        assertThat(r.rows()).singleElement().satisfies(o -> assertThat(o.status()).isEqualTo(ImportResult.Status.SKIP));
        verify(assetUseCase, never()).createAsset(any());
    }

    @Test
    void bienBao_khongCoQuyenTaoViTri_baoLoi() throws IOException {
        caller("ASSET_MANAGE");
        byte[] file = xlsx(ASSET_HEADERS, List.of("Biển P101", "Tòa Mới", "", "", "", "", "LED", "", ""));

        ImportResult r = service.importFile("assets", file, HOSPITAL);

        assertThat(r.committed()).isFalse();
        assertThat(r.rows().get(0).message()).contains("không có quyền tạo vị trí");
    }

    // ── File mẫu ───────────────────────────────────────────────────────────

    @Test
    void fileMau_coDuCotVaDocNguocLaiDuoc() throws IOException {
        byte[] template = service.template("assets", HOSPITAL);

        try (XSSFWorkbook wb = new XSSFWorkbook(new ByteArrayInputStream(template))) {
            Row header = wb.getSheetAt(0).getRow(0);
            assertThat(header.getCell(0).getStringCellValue()).isEqualTo("Tên biển *");
            assertThat(wb.getSheetAt(0).getDataValidations()).isNotEmpty();
            assertThat(wb.getSheet("Hướng dẫn")).isNotNull();
        }
        ImportResult r = service.preview("assets", template, HOSPITAL);
        assertThat(r.rows()).singleElement()
                .satisfies(o -> assertThat(o.message()).as("file mẫu trống không có dòng ví dụ").contains("không có dòng"));
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    private static Location loc(Long id, String name, Long parentId, LocationType type) {
        return Location.builder().id(id).name(name).parentId(parentId).type(type).hospitalId(HOSPITAL).build();
    }

    private static void caller(String... authorities) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                "caller", null, Arrays.stream(authorities).map(SimpleGrantedAuthority::new).toList()));
    }

    @SafeVarargs
    private static byte[] xlsx(List<String> headers, List<String>... rows) throws IOException {
        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet s = wb.createSheet("Dữ liệu");
            Row h = s.createRow(0);
            for (int i = 0; i < headers.size(); i++) h.createCell(i).setCellValue(headers.get(i));
            for (int r = 0; r < rows.length; r++) {
                Row row = s.createRow(r + 1);
                for (int i = 0; i < rows[r].size(); i++) row.createCell(i).setCellValue(rows[r].get(i));
            }
            wb.write(out);
            return out.toByteArray();
        }
    }
}
