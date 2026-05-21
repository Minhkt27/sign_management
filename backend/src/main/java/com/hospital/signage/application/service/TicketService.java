package com.hospital.signage.application.service;

import com.hospital.signage.application.port.in.TicketUseCase;
import com.hospital.signage.application.port.out.AssetDatabasePort;
import com.hospital.signage.application.port.out.TicketDatabasePort;
import com.hospital.signage.application.port.out.UserDatabasePort;
import com.hospital.signage.domain.model.Asset;
import com.hospital.signage.domain.model.MaintenanceTicket;
import com.hospital.signage.domain.enums.TicketStatus;
import com.hospital.signage.domain.model.User;
import lombok.RequiredArgsConstructor;
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
            String imageAfter) {
        MaintenanceTicket ticket = ticketDatabasePort.findById(ticketId)
                .orElseThrow(() -> new IllegalArgumentException("Ticket not found"));

        ticket.setTicketStatus(status);
        if (imageBefore != null && !imageBefore.isBlank()) {
            ticket.setImageBefore(imageBefore);
        }
        if (imageAfter != null && !imageAfter.isBlank()) {
            ticket.setImageAfter(imageAfter);
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
    public List<MaintenanceTicket> getTicketsByAsset(UUID assetId) {
        return ticketDatabasePort.findByAssetId(assetId);
    }

    @Override
    public List<MaintenanceTicket> getTicketsByAssignee(Long assigneeId) {
        return ticketDatabasePort.findByAssigneeId(assigneeId);
    }
}
