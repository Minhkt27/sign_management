package com.hospital.signage.application.service;

import com.hospital.signage.application.port.in.TicketUseCase;
import com.hospital.signage.application.port.out.AssetDatabasePort;
import com.hospital.signage.application.port.out.RoleDatabasePort;
import com.hospital.signage.application.port.out.TicketDatabasePort;
import com.hospital.signage.application.port.out.UserDatabasePort;
import com.hospital.signage.domain.enums.Priority;
import com.hospital.signage.domain.enums.TicketStatus;
import com.hospital.signage.domain.exception.TicketNotFoundException;
import com.hospital.signage.domain.exception.TicketRejectionLimitExceededException;
import com.hospital.signage.domain.exception.UnauthorizedTicketUpdateException;
import com.hospital.signage.domain.model.Asset;
import com.hospital.signage.domain.model.MaintenanceTicket;
import com.hospital.signage.domain.model.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TicketService implements TicketUseCase {

    private static final int MAX_REJECTION_LIMIT = 3;

    private static final java.util.Map<TicketStatus, Set<TicketStatus>> ALLOWED_TRANSITIONS = Map.of(
        TicketStatus.OPEN,       EnumSet.of(TicketStatus.IN_PROGRESS, TicketStatus.CLOSED),
        TicketStatus.IN_PROGRESS, EnumSet.of(TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED, TicketStatus.CLOSED),
        TicketStatus.RESOLVED,   EnumSet.of(TicketStatus.IN_PROGRESS, TicketStatus.CLOSED),
        TicketStatus.CLOSED,     EnumSet.noneOf(TicketStatus.class)
    );

    private final TicketDatabasePort ticketDatabasePort;
    private final AssetDatabasePort assetDatabasePort;
    private final UserDatabasePort userDatabasePort;
    private final RoleDatabasePort roleDatabasePort;
    private final com.hospital.signage.application.port.in.NotificationUseCase notificationUseCase;

    private static final String TECHNICAL_ROLE_CODE = "TECHNICAL";

    @Override
    @Transactional
    public MaintenanceTicket createTicket(CreateTicketCommand command) {
        Asset asset = assetDatabasePort.findById(command.assetId())
                .orElseThrow(() -> new IllegalArgumentException("Asset not found"));

        if (asset.getStatus() == com.hospital.signage.domain.enums.AssetStatus.SCRAPPED) {
            throw new IllegalStateException("Biển báo này đã thanh lý, không thể tạo phiếu bảo trì.");
        }

        Long callerHospitalId = command.reporter() != null ? command.reporter().getHospitalId() : null;
        if (callerHospitalId != null && !callerHospitalId.equals(asset.getHospitalId())) {
            throw new com.hospital.signage.domain.exception.HospitalScopeException(
                    "Không có quyền tạo phiếu cho biển báo thuộc bệnh viện khác.");
        }

        // Một biển hỏng chỉ cần một phiếu. Không chặn thì mỗi người đi ngang báo một lần là
        // sinh thêm một phiếu cho cùng cái biển, kèm một loạt thông báo cho quản trị viên,
        // và kỹ thuật viên không biết phiếu nào mới là phiếu cần xử lý.
        List<MaintenanceTicket> openTickets = ticketDatabasePort.findOpenTicketsForAsset(command.assetId());
        if (!openTickets.isEmpty()) {
            throw new IllegalStateException(
                    "Biển báo này đã có phiếu bảo trì đang xử lý (phiếu #" + openTickets.get(0).getId()
                    + "). Vui lòng bổ sung thông tin vào phiếu đó thay vì tạo phiếu mới.");
        }

        MaintenanceTicket ticket = MaintenanceTicket.builder()
                .asset(asset)
                .hospitalId(asset.getHospitalId())
                .reporter(command.reporter())
                .description(command.description())
                .priority(command.priority())
                .ticketStatus(TicketStatus.OPEN)
                .source(command.source())
                .build();

        asset.setStatus(com.hospital.signage.domain.enums.AssetStatus.DAMAGED);
        assetDatabasePort.save(asset);

        MaintenanceTicket saved = ticketDatabasePort.save(ticket);
        
        notificationUseCase.notifyAdmins(
            asset.getHospitalId(),
            "Phiếu bảo trì mới",
            "Phiếu #" + saved.getId() + " vừa được tạo cho " + asset.getName(),
            "NEW_TICKET",
            saved.getId()
        );

        log.info("Ticket {} created for asset {} by user {}", saved.getId(), command.assetId(), command.reporter().getId());
        return saved;
    }

    @Override
    @Transactional
    public MaintenanceTicket assignTicket(Long ticketId, Long assigneeId, Long callerHospitalId) {
        MaintenanceTicket ticket = ticketDatabasePort.findById(ticketId)
                .orElseThrow(() -> new TicketNotFoundException(ticketId));
        assertSameHospital(ticket, callerHospitalId);

        if (ticket.getTicketStatus() == TicketStatus.RESOLVED || ticket.getTicketStatus() == TicketStatus.CLOSED) {
            throw new IllegalStateException("Không thể giao lại phiếu đã hoàn thành hoặc đã đóng.");
        }

        User assignee = userDatabasePort.findById(assigneeId)
                .orElseThrow(() -> new IllegalArgumentException("Assignee user not found"));
        validateAssigneeIsTechnician(assignee);

        ticket.setAssignee(assignee);
        MaintenanceTicket saved = ticketDatabasePort.save(ticket);
        
        notificationUseCase.notifyUser(
            assigneeId,
            ticket.getHospitalId(),
            "Nhiệm vụ mới",
            "Bạn vừa được giao xử lý phiếu bảo trì #" + ticketId,
            "NEW_TICKET",
            ticketId
        );
        
        log.info("Ticket {} assigned to user {}", ticketId, assigneeId);
        return saved;
    }

    @Override
    @Transactional
    public MaintenanceTicket updateTicketStatus(Long ticketId, TicketStatus status, String imageBefore,
            String imageAfter, String rejectionNote, Long technicianId, Long callerHospitalId) {
        MaintenanceTicket ticket = ticketDatabasePort.findById(ticketId)
                .orElseThrow(() -> new TicketNotFoundException(ticketId));
        assertSameHospital(ticket, callerHospitalId);

        TicketStatus current = ticket.getTicketStatus();
        Set<TicketStatus> allowed = ALLOWED_TRANSITIONS.getOrDefault(current, EnumSet.noneOf(TicketStatus.class));
        if (!allowed.contains(status)) {
            throw new IllegalStateException(
                "Không thể chuyển trạng thái từ " + current + " sang " + status);
        }

        boolean isRejection = status == TicketStatus.IN_PROGRESS && current == TicketStatus.RESOLVED;
        if (isRejection && (rejectionNote == null || rejectionNote.isBlank())) {
            throw new IllegalArgumentException("Phải nhập lý do khi yêu cầu sửa lại (rejectionNote).");
        }

        validateRejectionLimit(ticket, isRejection);
        validateTechnicianPermission(ticket, status, isRejection, technicianId);
        validateResolutionEvidence(ticket, status, imageAfter);

        updateTicketImages(ticket, imageBefore, imageAfter);
        handleCompletionAndRejection(ticket, status, isRejection, rejectionNote);

        boolean autoClosed = isRejection && ticket.getRejectionCount() >= MAX_REJECTION_LIMIT;
        TicketStatus finalStatus = autoClosed ? TicketStatus.CLOSED : status;
        if (autoClosed) {
            // Cố tình KHÔNG gán completedAt: phiếu này đóng vì sửa mãi không đạt, không phải
            // vì đã hoàn thành. Gán vào sẽ làm sai mọi thống kê dựa trên mốc hoàn thành.
            log.warn("Ticket {} auto-closed after reaching max rejection limit ({})", ticket.getId(), MAX_REJECTION_LIMIT);
        }
        // Chỉ coi là đã sửa xong khi admin chủ động đóng một phiếu đang ở RESOLVED. Lần từ
        // chối cuối cũng đi từ RESOLVED nhưng mang ý nghĩa ngược lại, nên phải loại trừ.
        boolean fixConfirmed = current == TicketStatus.RESOLVED && !isRejection;
        ticket.setTicketStatus(finalStatus);
        updateRelatedAssetState(ticket, finalStatus, fixConfirmed);

        MaintenanceTicket saved = ticketDatabasePort.save(ticket);
        
        if (finalStatus == TicketStatus.RESOLVED) {
            notificationUseCase.notifyAdmins(
                ticket.getHospitalId(),
                "Phiếu bảo trì hoàn thành",
                "KTV vừa cập nhật hoàn thành phiếu #" + ticket.getId(),
                "TICKET_RESOLVED",
                ticket.getId()
            );
        }

        return saved;
    }

    /**
     * Ảnh "sau khi sửa" là bằng chứng duy nhất cho thấy công việc thực sự đã làm, nên nó bắt
     * buộc với MỌI tài khoản.
     *
     * <p>Trước đây yêu cầu này chỉ áp dụng cho người có quyền tải ảnh, với ý tốt là không ép
     * người ta làm điều họ không có quyền làm. Nhưng hệ quả ngược lại: một tài khoản kỹ thuật
     * viên thiếu quyền {@code FILE_UPLOAD} lại đóng được phiếu mà không cần bằng chứng nào —
     * tức là càng ít quyền càng dễ bỏ qua kiểm soát. Nay thiếu quyền là một lỗi cấu hình, và
     * thông báo nói thẳng ra điều đó thay vì lặng lẽ miễn trừ.
     */
    private void validateResolutionEvidence(MaintenanceTicket ticket, TicketStatus status, String imageAfter) {
        if (status != TicketStatus.RESOLVED) {
            return;
        }

        boolean hasNewImage = imageAfter != null && !imageAfter.isBlank();
        boolean hasExistingImage = ticket.getImageAfter() != null && !ticket.getImageAfter().isBlank();
        if (hasNewImage || hasExistingImage) {
            return;
        }

        var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        boolean canUpload = auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> "FILE_UPLOAD".equals(a.getAuthority()) || "ASSET_MANAGE".equals(a.getAuthority()));

        if (!canUpload) {
            log.warn("Ticket {}: tài khoản không có quyền tải ảnh nên không thể hoàn thành phiếu", ticket.getId());
            throw new IllegalArgumentException(
                    "Phải đính kèm ảnh sau khi sửa trước khi đánh dấu hoàn thành, nhưng tài khoản của bạn "
                    + "chưa được cấp quyền tải ảnh lên. Vui lòng liên hệ quản trị viên.");
        }
        throw new IllegalArgumentException("Phải đính kèm ảnh sau khi sửa (imageAfter) trước khi đánh dấu hoàn thành.");
    }

    private void validateRejectionLimit(MaintenanceTicket ticket, boolean isRejection) {
        if (isRejection && ticket.getRejectionCount() >= MAX_REJECTION_LIMIT) {
            throw new TicketRejectionLimitExceededException("Phiếu này đã bị từ chối tối đa " + MAX_REJECTION_LIMIT + " lần.");
        }
    }

    private void validateAssigneeIsTechnician(User assignee) {
        if (assignee.getRoleId() == null) {
            throw new IllegalArgumentException("Người được giao việc phải là kỹ thuật viên.");
        }
        boolean isTechnician = roleDatabasePort.findById(assignee.getRoleId())
                .map(role -> TECHNICAL_ROLE_CODE.equals(role.getCode()))
                .orElse(false);
        if (!isTechnician) {
            throw new IllegalArgumentException("Người được giao việc phải là kỹ thuật viên.");
        }
    }

    private void validateTechnicianPermission(MaintenanceTicket ticket, TicketStatus status, boolean isRejection, Long technicianId) {
        if (technicianId == null) return;

        if (ticket.getAssignee() == null) {
            if (status == TicketStatus.IN_PROGRESS && !isRejection) {
                User technician = userDatabasePort.findById(technicianId)
                        .orElseThrow(() -> new IllegalArgumentException("Technician not found"));
                ticket.setAssignee(technician);
            }
        } else if (!ticket.getAssignee().getId().equals(technicianId)) {
            throw new UnauthorizedTicketUpdateException("Bạn không được phép cập nhật phiếu này.");
        }
    }

    private void updateTicketImages(MaintenanceTicket ticket, String imageBefore, String imageAfter) {
        if (imageBefore != null && !imageBefore.isBlank()) {
            ticket.setImageBefore(imageBefore);
        }
        if (imageAfter != null && !imageAfter.isBlank()) {
            ticket.setImageAfter(imageAfter);
        }
    }

    private void handleCompletionAndRejection(MaintenanceTicket ticket, TicketStatus status, boolean isRejection, String rejectionNote) {
        if (status == TicketStatus.RESOLVED) {
            ticket.setCompletedAt(Instant.now());
        }
        if (isRejection) {
            ticket.setRejectionNote(rejectionNote);
            ticket.setRejectionCount(ticket.getRejectionCount() + 1);
            ticket.setCompletedAt(null);
            log.warn("Ticket {} rejected (count={}/{}): {}", ticket.getId(), ticket.getRejectionCount(), MAX_REJECTION_LIMIT, rejectionNote);
        }
    }

    /**
     * Đồng bộ trạng thái biển báo theo trạng thái phiếu.
     *
     * <p>Điểm cần phân biệt: <b>đóng phiếu không đồng nghĩa với đã sửa xong</b>. Một phiếu
     * có thể bị đóng vì trùng lặp, vì hoãn lại, hoặc vì tự động đóng sau khi bị từ chối quá
     * số lần cho phép — tức là đúng những tình huống biển vẫn đang hỏng.
     *
     * <p>Lưu ý cái bẫy: không thể chỉ nhìn "trạng thái trước đó có phải RESOLVED không" để
     * kết luận, vì lần từ chối thứ ba cũng xuất phát từ RESOLVED mà ý nghĩa thì ngược hẳn —
     * đó là phủ nhận việc đã sửa xong. Vì vậy nơi gọi phải nói rõ qua {@code fixConfirmed}.
     *
     * <p>Trước đây mọi nhánh CLOSED đều đưa biển về ACTIVE, khiến biển hỏng biến mất khỏi
     * danh sách cần xử lý mà không ai biết.
     */
    private void updateRelatedAssetState(MaintenanceTicket ticket, TicketStatus newStatus, boolean fixConfirmed) {
        Asset asset = ticket.getAsset();
        if (asset == null || asset.getStatus() == com.hospital.signage.domain.enums.AssetStatus.SCRAPPED) {
            return;
        }

        com.hospital.signage.domain.enums.AssetStatus target;
        if (newStatus == TicketStatus.IN_PROGRESS) {
            target = com.hospital.signage.domain.enums.AssetStatus.REPAIRING;
        } else if (newStatus == TicketStatus.RESOLVED) {
            target = com.hospital.signage.domain.enums.AssetStatus.ACTIVE;
        } else if (newStatus == TicketStatus.CLOSED) {
            // Đóng một phiếu đã được xác nhận sửa xong = biển hoạt động lại. Mọi kiểu đóng
            // khác = ngừng theo đuổi phiếu này, biển vẫn hỏng và phải hiện ra như vậy.
            // Nếu phiếu vốn được tạo nhầm, admin sửa lại trạng thái biển ở màn quản lý biển
            // báo — thà báo hỏng dư còn hơn giấu mất một biển hỏng thật.
            target = fixConfirmed
                    ? com.hospital.signage.domain.enums.AssetStatus.ACTIVE
                    : com.hospital.signage.domain.enums.AssetStatus.DAMAGED;
        } else {
            return;
        }

        if (asset.getStatus() != target) {
            asset.setStatus(target);
            assetDatabasePort.save(asset);
        }
    }

    @Override
    @Transactional
    public MaintenanceTicket takeTicket(Long ticketId, Long technicianId, Long callerHospitalId) {
        MaintenanceTicket ticket = ticketDatabasePort.findById(ticketId)
                .orElseThrow(() -> new TicketNotFoundException(ticketId));
        assertSameHospital(ticket, callerHospitalId);
        if (ticket.getTicketStatus() != TicketStatus.OPEN || ticket.getAssignee() != null) {
            throw new IllegalStateException("Phiếu này đã được giao hoặc không còn ở trạng thái chờ.");
        }
        User technician = userDatabasePort.findById(technicianId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        ticket.setAssignee(technician);
        MaintenanceTicket saved = ticketDatabasePort.save(ticket);
        log.info("Ticket {} self-taken by technician {}", ticketId, technicianId);
        return saved;
    }

    @Override
    public Optional<MaintenanceTicket> getTicketById(Long id, Long callerHospitalId) {
        return ticketDatabasePort.findById(id)
                .filter(ticket -> callerHospitalId == null || callerHospitalId.equals(ticket.getHospitalId()));
    }

    @Override
    public List<MaintenanceTicket> getAllTickets(Long hospitalId) {
        return hospitalId == null 
                ? ticketDatabasePort.findAll() 
                : ticketDatabasePort.findByFilters(null, null, null, null, hospitalId, PageRequest.of(0, 1000)).getContent();
    }

    @Override
    public Page<MaintenanceTicket> getTicketsPage(int page, int size, Long assigneeId, UUID assetId, TicketStatus status, Priority priority, Long hospitalId) {
        return ticketDatabasePort.findByFilters(assigneeId, assetId, status, priority, hospitalId, PageRequest.of(page, size));
    }

    @Override
    public Map<String, Long> getTicketsSummary(Long hospitalId) {
        return ticketDatabasePort.countByStatus(hospitalId);
    }

    @Override
    public List<MaintenanceTicket> getTicketsByAsset(UUID assetId, Long hospitalId) {
        return ticketDatabasePort.findByFilters(null, assetId, null, null, hospitalId, PageRequest.of(0, 200)).getContent();
    }

    @Override
    public List<MaintenanceTicket> getTicketsByAssignee(Long assigneeId, Long hospitalId) {
        return ticketDatabasePort.findByFilters(assigneeId, null, null, null, hospitalId, PageRequest.of(0, 200))
                .getContent();
    }

    // callerHospitalId == null nghĩa là SUPER_ADMIN, không giới hạn viện nào.
    private void assertSameHospital(MaintenanceTicket ticket, Long callerHospitalId) {
        if (callerHospitalId != null && !callerHospitalId.equals(ticket.getHospitalId())) {
            throw new com.hospital.signage.domain.exception.HospitalScopeException(
                    "Không có quyền truy cập phiếu bảo trì thuộc bệnh viện khác.");
        }
    }
}
