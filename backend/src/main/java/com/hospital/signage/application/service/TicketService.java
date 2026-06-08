package com.hospital.signage.application.service;

import com.hospital.signage.application.port.in.TicketUseCase;
import com.hospital.signage.application.port.out.AssetDatabasePort;
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
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class TicketService implements TicketUseCase {

    private static final int MAX_REJECTION_LIMIT = 3;

    private final TicketDatabasePort ticketDatabasePort;
    private final AssetDatabasePort assetDatabasePort;
    private final UserDatabasePort userDatabasePort;

    @Override
    @Transactional
    public MaintenanceTicket createTicket(CreateTicketCommand command) {
        Asset asset = assetDatabasePort.findById(command.assetId())
                .orElseThrow(() -> new IllegalArgumentException("Asset not found"));

        if (asset.getStatus() == com.hospital.signage.domain.enums.AssetStatus.SCRAPPED) {
            throw new IllegalStateException("Biển báo này đã thanh lý, không thể tạo phiếu bảo trì.");
        }

        MaintenanceTicket ticket = MaintenanceTicket.builder()
                .asset(asset)
                .reporter(command.reporter())
                .description(command.description())
                .priority(command.priority())
                .ticketStatus(TicketStatus.OPEN)
                .source(command.source())
                .build();

        asset.setStatus(com.hospital.signage.domain.enums.AssetStatus.DAMAGED);
        assetDatabasePort.save(asset);

        MaintenanceTicket saved = ticketDatabasePort.save(ticket);
        log.info("Ticket {} created for asset {} by user {}", saved.getId(), command.assetId(), command.reporter().getId());
        return saved;
    }

    @Override
    @Transactional
    public MaintenanceTicket assignTicket(Long ticketId, Long assigneeId) {
        MaintenanceTicket ticket = ticketDatabasePort.findById(ticketId)
                .orElseThrow(() -> new TicketNotFoundException(ticketId));

        User assignee = userDatabasePort.findById(assigneeId)
                .orElseThrow(() -> new IllegalArgumentException("Assignee user not found"));

        ticket.setAssignee(assignee);
        MaintenanceTicket saved = ticketDatabasePort.save(ticket);
        log.info("Ticket {} assigned to user {}", ticketId, assigneeId);
        return saved;
    }

    @Override
    @Transactional
    public MaintenanceTicket updateTicketStatus(Long ticketId, TicketStatus status, String imageBefore,
            String imageAfter, String rejectionNote, Long technicianId) {
        MaintenanceTicket ticket = ticketDatabasePort.findById(ticketId)
                .orElseThrow(() -> new TicketNotFoundException(ticketId));

        boolean isRejection = status == TicketStatus.IN_PROGRESS && rejectionNote != null && !rejectionNote.isBlank();

        validateRejectionLimit(ticket, isRejection);
        validateTechnicianPermission(ticket, status, isRejection, technicianId);

        ticket.setTicketStatus(status);
        updateTicketImages(ticket, imageBefore, imageAfter);
        handleCompletionAndRejection(ticket, status, isRejection, rejectionNote);
        updateRelatedAssetState(ticket, status);

        return ticketDatabasePort.save(ticket);
    }

    private void validateRejectionLimit(MaintenanceTicket ticket, boolean isRejection) {
        if (isRejection && ticket.getRejectionCount() >= MAX_REJECTION_LIMIT) {
            throw new TicketRejectionLimitExceededException("Phiếu này đã bị từ chối tối đa " + MAX_REJECTION_LIMIT + " lần.");
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
    public MaintenanceTicket takeTicket(Long ticketId, Long technicianId) {
        MaintenanceTicket ticket = ticketDatabasePort.findById(ticketId)
                .orElseThrow(() -> new TicketNotFoundException(ticketId));
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
    public Optional<MaintenanceTicket> getTicketById(Long id) {
        return ticketDatabasePort.findById(id);
    }

    @Override
    public List<MaintenanceTicket> getAllTickets() {
        return ticketDatabasePort.findAll();
    }

    @Override
    public Page<MaintenanceTicket> getTicketsPage(int page, int size, Long assigneeId, UUID assetId, TicketStatus status, Priority priority) {
        return ticketDatabasePort.findByFilters(assigneeId, assetId, status, priority, PageRequest.of(page, size));
    }

    @Override
    public Map<String, Long> getTicketsSummary() {
        return ticketDatabasePort.countByStatus();
    }

    @Override
    public List<MaintenanceTicket> getTicketsByAsset(UUID assetId) {
        return ticketDatabasePort.findByAssetId(assetId);
    }

    @Override
    public List<MaintenanceTicket> getTicketsByAssignee(Long assigneeId) {
        return ticketDatabasePort.findByFilters(assigneeId, null, null, null, PageRequest.of(0, 200))
                .getContent();
    }

}
