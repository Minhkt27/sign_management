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

        TicketStatus finalStatus = (isRejection && ticket.getRejectionCount() >= MAX_REJECTION_LIMIT)
                ? TicketStatus.CLOSED
                : status;
        if (finalStatus == TicketStatus.CLOSED) {
            ticket.setCompletedAt(Instant.now());
            log.warn("Ticket {} auto-closed after reaching max rejection limit ({})", ticket.getId(), MAX_REJECTION_LIMIT);
        }
        ticket.setTicketStatus(finalStatus);
        updateRelatedAssetState(ticket, finalStatus);

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

    private void validateResolutionEvidence(MaintenanceTicket ticket, TicketStatus status, String imageAfter) {
        boolean hasNewImage = imageAfter != null && !imageAfter.isBlank();
        boolean hasExistingImage = ticket.getImageAfter() != null && !ticket.getImageAfter().isBlank();
        
        var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        boolean canUpload = auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> "FILE_UPLOAD".equals(a.getAuthority()) || "ASSET_MANAGE".equals(a.getAuthority()));

        if (canUpload && status == TicketStatus.RESOLVED && !hasNewImage && !hasExistingImage) {
            throw new IllegalArgumentException("Phải đính kèm ảnh sau khi sửa (imageAfter) trước khi đánh dấu hoàn thành.");
        }
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

    private void updateRelatedAssetState(MaintenanceTicket ticket, TicketStatus status) {
        Asset asset = ticket.getAsset();
        if (asset == null || asset.getStatus() == com.hospital.signage.domain.enums.AssetStatus.SCRAPPED) {
            return;
        }

        if (status == TicketStatus.IN_PROGRESS) {
            asset.setStatus(com.hospital.signage.domain.enums.AssetStatus.REPAIRING);
            assetDatabasePort.save(asset);
        } else if (status == TicketStatus.RESOLVED || status == TicketStatus.CLOSED) {
            asset.setStatus(com.hospital.signage.domain.enums.AssetStatus.ACTIVE);
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
    public List<MaintenanceTicket> getAllTickets() {
        return ticketDatabasePort.findAll();
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
    public List<MaintenanceTicket> getTicketsByAsset(UUID assetId) {
        return ticketDatabasePort.findByAssetId(assetId);
    }

    @Override
    public List<MaintenanceTicket> getTicketsByAssignee(Long assigneeId) {
        return ticketDatabasePort.findByFilters(assigneeId, null, null, null, null, PageRequest.of(0, 200))
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
