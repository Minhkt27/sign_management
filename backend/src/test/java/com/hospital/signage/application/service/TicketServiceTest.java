package com.hospital.signage.application.service;

import com.hospital.signage.application.port.in.NotificationUseCase;
import com.hospital.signage.application.port.out.AssetDatabasePort;
import com.hospital.signage.application.port.out.RoleDatabasePort;
import com.hospital.signage.application.port.out.TicketDatabasePort;
import com.hospital.signage.application.port.out.UserDatabasePort;
import com.hospital.signage.domain.enums.AssetStatus;
import com.hospital.signage.domain.enums.TicketStatus;
import com.hospital.signage.domain.exception.TicketRejectionLimitExceededException;
import com.hospital.signage.domain.exception.UnauthorizedTicketUpdateException;
import com.hospital.signage.domain.model.Asset;
import com.hospital.signage.domain.model.MaintenanceTicket;
import com.hospital.signage.domain.model.User;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class TicketServiceTest {

    @Mock private TicketDatabasePort ticketDatabasePort;
    @Mock private AssetDatabasePort assetDatabasePort;
    @Mock private UserDatabasePort userDatabasePort;
    @Mock private RoleDatabasePort roleDatabasePort;
    @Mock private NotificationUseCase notificationUseCase;

    @InjectMocks private TicketService ticketService;

    private static final Long TICKET_ID = 100L;
    private static final Long HOSPITAL_ID = 1L;

    private Asset asset;
    private User technician;
    private MaintenanceTicket ticket;

    @BeforeEach
    void setUp() {
        asset = new Asset();
        asset.setId(UUID.randomUUID());
        asset.setName("Biển chỉ dẫn Khoa Nội");
        asset.setHospitalId(HOSPITAL_ID);
        asset.setStatus(AssetStatus.DAMAGED);

        technician = new User();
        technician.setId(5L);
        technician.setUsername("tech1");
        technician.setHospitalId(HOSPITAL_ID);

        ticket = MaintenanceTicket.builder()
                .id(TICKET_ID)
                .hospitalId(HOSPITAL_ID)
                .asset(asset)
                .assignee(technician)
                .ticketStatus(TicketStatus.OPEN)
                .rejectionCount(0)
                .build();

        lenient().when(ticketDatabasePort.findById(TICKET_ID)).thenReturn(Optional.of(ticket));
        lenient().when(ticketDatabasePort.save(any())).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(assetDatabasePort.save(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    private void updateStatus(TicketStatus target, String imageAfter, String rejectionNote, Long technicianId) {
        ticketService.updateTicketStatus(TICKET_ID, target, null, imageAfter, rejectionNote, technicianId, HOSPITAL_ID);
    }

    // ── Tạo phiếu ──────────────────────────────────────────────────────────

    @Test
    void bienDaCoPhieuDangXuLy_khongTaoThemPhieuMoi() {
        lenient().when(assetDatabasePort.findById(asset.getId())).thenReturn(Optional.of(asset));
        lenient().when(ticketDatabasePort.findOpenTicketIdsForAsset(asset.getId()))
                .thenReturn(java.util.List.of(77L));

        assertThatThrownBy(() -> ticketService.createTicket(new com.hospital.signage.application.port.in.TicketUseCase
                .CreateTicketCommand(asset.getId(), "Biển bị mờ chữ",
                        com.hospital.signage.domain.enums.Priority.MEDIUM, technician, null)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("#77");

        verify(ticketDatabasePort, never()).save(any());
    }

    @Test
    void bienChuaCoPhieuNao_taoPhieuBinhThuong() {
        lenient().when(assetDatabasePort.findById(asset.getId())).thenReturn(Optional.of(asset));
        lenient().when(ticketDatabasePort.findOpenTicketIdsForAsset(asset.getId()))
                .thenReturn(java.util.List.of());
        asset.setStatus(AssetStatus.ACTIVE);

        ticketService.createTicket(new com.hospital.signage.application.port.in.TicketUseCase
                .CreateTicketCommand(asset.getId(), "Biển bị mờ chữ",
                        com.hospital.signage.domain.enums.Priority.MEDIUM, technician, null));

        assertThat(asset.getStatus()).isEqualTo(AssetStatus.DAMAGED);
        verify(ticketDatabasePort).save(any());
    }

    // ── Phân công ──────────────────────────────────────────────────────────

    // Giao diện đã lọc danh sách kỹ thuật viên theo viện, nhưng API thì không — chỉ cần biết
    // id là giao được phiếu viện A cho người viện B. Bảng users lại là bảng DUY NHẤT không bật
    // Row Level Security nên không có lớp nào đỡ phía dưới.
    @Test
    void khongGiaoPhieuChoKyThuatVienVienKhac() {
        User techVienKhac = new User();
        techVienKhac.setId(99L);
        techVienKhac.setUsername("tech-vien-B");
        techVienKhac.setHospitalId(2L);
        techVienKhac.setRoleId(3L);

        lenient().when(userDatabasePort.findById(99L)).thenReturn(Optional.of(techVienKhac));
        lenient().when(roleDatabasePort.findById(3L)).thenReturn(Optional.of(
                com.hospital.signage.domain.model.Role.builder().id(3L).code("TECHNICAL").build()));

        assertThatThrownBy(() -> ticketService.assignTicket(TICKET_ID, 99L, HOSPITAL_ID))
                .isInstanceOf(com.hospital.signage.domain.exception.HospitalScopeException.class)
                .hasMessageContaining("bệnh viện khác");

        assertThat(ticket.getAssignee().getId())
                .as("người được giao cũ phải giữ nguyên")
                .isEqualTo(technician.getId());
    }

    @Test
    void giaoPhieuChoKyThuatVienCungVien_thanhCong() {
        User techCungVien = new User();
        techCungVien.setId(7L);
        techCungVien.setUsername("tech2");
        techCungVien.setHospitalId(HOSPITAL_ID);
        techCungVien.setRoleId(3L);

        lenient().when(userDatabasePort.findById(7L)).thenReturn(Optional.of(techCungVien));
        lenient().when(roleDatabasePort.findById(3L)).thenReturn(Optional.of(
                com.hospital.signage.domain.model.Role.builder().id(3L).code("TECHNICAL").build()));

        ticketService.assignTicket(TICKET_ID, 7L, HOSPITAL_ID);

        assertThat(ticket.getAssignee().getId()).isEqualTo(7L);
    }

    // ── Đồng bộ trạng thái biển báo ────────────────────────────────────────

    @Test
    void batDauXuLy_bienBaoChuyenSangDangSua() {
        updateStatus(TicketStatus.IN_PROGRESS, null, null, technician.getId());

        assertThat(ticket.getTicketStatus()).isEqualTo(TicketStatus.IN_PROGRESS);
        assertThat(asset.getStatus()).isEqualTo(AssetStatus.REPAIRING);
    }

    @Test
    void hoanThanh_bienBaoHoatDongLai() {
        ticket.setTicketStatus(TicketStatus.IN_PROGRESS);

        updateStatus(TicketStatus.RESOLVED, "http://minio/sau-khi-sua.jpg", null, technician.getId());

        assertThat(ticket.getTicketStatus()).isEqualTo(TicketStatus.RESOLVED);
        assertThat(asset.getStatus()).isEqualTo(AssetStatus.ACTIVE);
        assertThat(ticket.getCompletedAt()).isNotNull();
    }

    @Test
    void dongPhieuDaHoanThanh_bienBaoHoatDongLai() {
        ticket.setTicketStatus(TicketStatus.RESOLVED);
        asset.setStatus(AssetStatus.ACTIVE);

        updateStatus(TicketStatus.CLOSED, null, null, null);

        assertThat(ticket.getTicketStatus()).isEqualTo(TicketStatus.CLOSED);
        assertThat(asset.getStatus()).isEqualTo(AssetStatus.ACTIVE);
    }

    // Đóng phiếu KHÔNG đồng nghĩa với đã sửa. Trước khi sửa lỗi, mọi nhánh CLOSED đều đưa
    // biển về ACTIVE, khiến biển hỏng biến mất khỏi danh sách cần xử lý.
    @Test
    void dongPhieuChuaSuaXong_bienBaoVanBaoHong() {
        ticket.setTicketStatus(TicketStatus.OPEN);
        asset.setStatus(AssetStatus.DAMAGED);

        updateStatus(TicketStatus.CLOSED, null, null, null);

        assertThat(ticket.getTicketStatus()).isEqualTo(TicketStatus.CLOSED);
        assertThat(asset.getStatus())
                .as("đóng phiếu khi chưa sửa xong thì biển vẫn phải ở trạng thái hỏng")
                .isEqualTo(AssetStatus.DAMAGED);
    }

    @Test
    void dongPhieuDangSuaDoDang_bienBaoQuayVeBaoHong() {
        ticket.setTicketStatus(TicketStatus.IN_PROGRESS);
        asset.setStatus(AssetStatus.REPAIRING);

        updateStatus(TicketStatus.CLOSED, null, null, null);

        assertThat(asset.getStatus())
                .as("không còn ai xử lý nữa thì biển phải hiện là hỏng, không phải đang sửa")
                .isEqualTo(AssetStatus.DAMAGED);
    }

    // ── Từ chối và tự động đóng ────────────────────────────────────────────

    @Test
    void tuChoi_tangSoLanVaXoaMocHoanThanh() {
        ticket.setTicketStatus(TicketStatus.RESOLVED);
        ticket.setCompletedAt(java.time.Instant.now());

        updateStatus(TicketStatus.IN_PROGRESS, null, "Dán lệch, chữ vẫn mờ", null);

        assertThat(ticket.getRejectionCount()).isEqualTo(1);
        assertThat(ticket.getRejectionNote()).isEqualTo("Dán lệch, chữ vẫn mờ");
        assertThat(ticket.getCompletedAt()).isNull();
        assertThat(ticket.getTicketStatus()).isEqualTo(TicketStatus.IN_PROGRESS);
    }

    @Test
    void tuChoiKhongCoLyDo_biTuChoi() {
        ticket.setTicketStatus(TicketStatus.RESOLVED);

        assertThatThrownBy(() -> updateStatus(TicketStatus.IN_PROGRESS, null, "  ", null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("lý do");
    }

    // Đây là tình huống lỗi gốc: sửa ba lần không đạt, phiếu tự đóng — và biển từng bị đánh
    // dấu ACTIVE, tức "đang hoạt động tốt", đúng lúc nó hỏng nặng nhất.
    @Test
    void tuChoiLanThuBa_phieuTuDongDongNhungBienVanBaoHong() {
        ticket.setTicketStatus(TicketStatus.RESOLVED);
        ticket.setRejectionCount(2);
        asset.setStatus(AssetStatus.DAMAGED);

        updateStatus(TicketStatus.IN_PROGRESS, null, "Vẫn chưa đạt", null);

        assertThat(ticket.getTicketStatus()).isEqualTo(TicketStatus.CLOSED);
        assertThat(ticket.getRejectionCount()).isEqualTo(3);
        assertThat(asset.getStatus())
                .as("sửa ba lần không xong thì biển vẫn hỏng, không được coi là hoạt động tốt")
                .isEqualTo(AssetStatus.DAMAGED);
        assertThat(ticket.getCompletedAt())
                .as("phiếu đóng vì thất bại không phải là phiếu hoàn thành")
                .isNull();
    }

    @Test
    void quaGioiHanTuChoi_khongTuChoiThem() {
        ticket.setTicketStatus(TicketStatus.RESOLVED);
        ticket.setRejectionCount(3);

        assertThatThrownBy(() -> updateStatus(TicketStatus.IN_PROGRESS, null, "Lần thứ tư", null))
                .isInstanceOf(TicketRejectionLimitExceededException.class);
    }

    // ── Bằng chứng sửa chữa ────────────────────────────────────────────────

    // Trước đây yêu cầu ảnh chỉ áp dụng cho tài khoản có quyền tải ảnh, nên tài khoản THIẾU
    // quyền lại đóng được phiếu mà không cần bằng chứng nào — càng ít quyền càng dễ lách.
    @Test
    void khongCoAnhSauKhiSua_khongDuocDanhDauHoanThanh() {
        ticket.setTicketStatus(TicketStatus.IN_PROGRESS);
        setCaller("FILE_UPLOAD");

        assertThatThrownBy(() -> updateStatus(TicketStatus.RESOLVED, null, null, technician.getId()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("ảnh sau khi sửa");
    }

    @Test
    void taiKhoanKhongCoQuyenTaiAnh_cungKhongDuocBoQuaBangChung() {
        ticket.setTicketStatus(TicketStatus.IN_PROGRESS);
        setCaller("TICKET_MANAGE"); // không có FILE_UPLOAD lẫn ASSET_MANAGE

        assertThatThrownBy(() -> updateStatus(TicketStatus.RESOLVED, null, null, technician.getId()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("chưa được cấp quyền tải ảnh");
    }

    @Test
    void daCoAnhTuLanTruoc_khongBatDinhKemLai() {
        ticket.setTicketStatus(TicketStatus.IN_PROGRESS);
        ticket.setImageAfter("http://minio/anh-cu.jpg");
        setCaller("FILE_UPLOAD");

        updateStatus(TicketStatus.RESOLVED, null, null, technician.getId());

        assertThat(ticket.getTicketStatus()).isEqualTo(TicketStatus.RESOLVED);
    }

    private void setCaller(String... authorities) {
        var granted = java.util.Arrays.stream(authorities)
                .map(org.springframework.security.core.authority.SimpleGrantedAuthority::new)
                .toList();
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                        "caller", null, granted));
    }

    @org.junit.jupiter.api.AfterEach
    void clearSecurityContext() {
        org.springframework.security.core.context.SecurityContextHolder.clearContext();
    }

    // ── Máy trạng thái ─────────────────────────────────────────────────────

    @Test
    void khongTheNhayThangTuChoSangHoanThanh() {
        ticket.setTicketStatus(TicketStatus.OPEN);

        assertThatThrownBy(() -> updateStatus(TicketStatus.RESOLVED, "http://minio/anh.jpg", null, null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Không thể chuyển trạng thái");
    }

    @Test
    void phieuDaDong_khongMoLai() {
        ticket.setTicketStatus(TicketStatus.CLOSED);

        assertThatThrownBy(() -> updateStatus(TicketStatus.IN_PROGRESS, null, null, null))
                .isInstanceOf(IllegalStateException.class);
    }

    // ── Phân quyền và dữ liệu ──────────────────────────────────────────────

    @Test
    void ktvKhacKhongCapNhatDuocPhieuNguoiKhac() {
        ticket.setTicketStatus(TicketStatus.IN_PROGRESS);

        assertThatThrownBy(() -> updateStatus(TicketStatus.RESOLVED, "http://minio/anh.jpg", null, 99L))
                .isInstanceOf(UnauthorizedTicketUpdateException.class);
    }

    @Test
    void bienDaThanhLy_khongBiDoiTrangThai() {
        ticket.setTicketStatus(TicketStatus.IN_PROGRESS);
        asset.setStatus(AssetStatus.SCRAPPED);

        updateStatus(TicketStatus.RESOLVED, "http://minio/anh.jpg", null, technician.getId());

        assertThat(asset.getStatus()).isEqualTo(AssetStatus.SCRAPPED);
        verify(assetDatabasePort, never()).save(any());
    }

    @Test
    void hoanThanhSeBaoChoQuanTriVien() {
        ticket.setTicketStatus(TicketStatus.IN_PROGRESS);

        updateStatus(TicketStatus.RESOLVED, "http://minio/anh.jpg", null, technician.getId());

        verify(notificationUseCase).notifyAdmins(
                org.mockito.ArgumentMatchers.eq(HOSPITAL_ID),
                any(), any(),
                org.mockito.ArgumentMatchers.eq("TICKET_RESOLVED"),
                org.mockito.ArgumentMatchers.eq(TICKET_ID));
    }
}
