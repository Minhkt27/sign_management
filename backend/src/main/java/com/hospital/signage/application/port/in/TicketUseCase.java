package com.hospital.signage.application.port.in;

import com.hospital.signage.domain.enums.Priority;
import com.hospital.signage.domain.enums.TicketStatus;
import com.hospital.signage.domain.model.MaintenanceTicket;
import com.hospital.signage.domain.model.User;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TicketUseCase {
    MaintenanceTicket createTicket(CreateTicketCommand command);
    MaintenanceTicket assignTicket(Long ticketId, Long assigneeId);
    MaintenanceTicket updateTicketStatus(Long ticketId, TicketStatus status, String imageBefore, String imageAfter);
    Optional<MaintenanceTicket> getTicketById(Long id);
    List<MaintenanceTicket> getAllTickets();
    List<MaintenanceTicket> getTicketsByAsset(UUID assetId);
    List<MaintenanceTicket> getTicketsByAssignee(Long assigneeId);

    record CreateTicketCommand(UUID assetId, String description, Priority priority, User reporter) {}
}
