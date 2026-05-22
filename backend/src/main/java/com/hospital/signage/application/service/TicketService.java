package com.hospital.signage.application.service;

import com.hospital.signage.application.port.in.TicketUseCase;
import com.hospital.signage.application.port.out.AssetDatabasePort;
import com.hospital.signage.application.port.out.TicketDatabasePort;
import com.hospital.signage.application.port.out.UserDatabasePort;
import com.hospital.signage.domain.enums.TicketStatus;
import com.hospital.signage.domain.model.Asset;
import com.hospital.signage.domain.model.MaintenanceTicket;
import com.hospital.signage.domain.model.User;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TicketService implements TicketUseCase {

    private final TicketDatabasePort ticketDatabasePort;
    private final AssetDatabasePort assetDatabasePort;
    private final UserDatabasePort userDatabasePort;

    @Override
    public MaintenanceTicket createTicket(CreateTicketCommand command) {
        Asset asset = assetDatabasePort.findById(command.assetId())
                .orElseThrow(() -> new IllegalArgumentException("Asset not found"));

        MaintenanceTicket ticket = MaintenanceTicket.builder()
                .asset(asset)
                .reporter(command.reporter())
                .description(command.description())
                .priority(command.priority())
                .ticketStatus(TicketStatus.OPEN)
                .source(command.source())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        asset.setStatus(com.hospital.signage.domain.enums.AssetStatus.DAMAGED);
        assetDatabasePort.save(asset);

        return ticketDatabasePort.save(ticket);
    }

    @Override
    public MaintenanceTicket assignTicket(Long ticketId, Long assigneeId) {
        MaintenanceTicket ticket = ticketDatabasePort.findById(ticketId)
                .orElseThrow(() -> new IllegalArgumentException("Ticket not found"));

        User assignee = userDatabasePort.findById(assigneeId)
                .orElseThrow(() -> new IllegalArgumentException("Assignee user not found"));

        ticket.setAssignee(assignee);
        ticket.setUpdatedAt(LocalDateTime.now());
        return ticketDatabasePort.save(ticket);
    }

    @Override
    public MaintenanceTicket updateTicketStatus(Long ticketId, TicketStatus status, String imageBefore,
            String imageAfter, String rejectionNote) {
        MaintenanceTicket ticket = ticketDatabasePort.findById(ticketId)
                .orElseThrow(() -> new IllegalArgumentException("Ticket not found"));

        ticket.setTicketStatus(status);
        if (imageBefore != null && !imageBefore.isBlank()) {
            ticket.setImageBefore(imageBefore);
        }
        if (imageAfter != null && !imageAfter.isBlank()) {
            ticket.setImageAfter(imageAfter);
        }
        if (status == TicketStatus.RESOLVED && ticket.getCompletedAt() == null) {
            ticket.setCompletedAt(LocalDateTime.now());
        }
        if (status == TicketStatus.IN_PROGRESS && rejectionNote != null && !rejectionNote.isBlank()) {
            ticket.setRejectionNote(rejectionNote);
            ticket.setCompletedAt(null);
        }
        ticket.setUpdatedAt(LocalDateTime.now());

        Asset asset = ticket.getAsset();
        if (asset != null) {
            if (status == TicketStatus.IN_PROGRESS) {
                asset.setStatus(com.hospital.signage.domain.enums.AssetStatus.REPAIRING);
                assetDatabasePort.save(asset);
            } else if (status == TicketStatus.RESOLVED || status == TicketStatus.CLOSED) {
                asset.setStatus(com.hospital.signage.domain.enums.AssetStatus.ACTIVE);
                assetDatabasePort.save(asset);
            }
        }

        return ticketDatabasePort.save(ticket);
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
    public Page<MaintenanceTicket> getTicketsPage(int page, int size, Long assigneeId, UUID assetId) {
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by("createdAt").descending());
        if (assigneeId != null) return ticketDatabasePort.findByAssigneeId(assigneeId, pageRequest);
        if (assetId != null) return ticketDatabasePort.findByAssetId(assetId, pageRequest);
        return ticketDatabasePort.findAll(pageRequest);
    }

    @Override
    public List<MaintenanceTicket> getTicketsByAsset(UUID assetId) {
        return ticketDatabasePort.findByAssetId(assetId);
    }

    @Override
    public List<MaintenanceTicket> getTicketsByAssignee(Long assigneeId) {
        return ticketDatabasePort.findByAssigneeId(assigneeId);
    }
}
