package com.hospital.signage.application.port.in;

import com.hospital.signage.domain.enums.Priority;
import com.hospital.signage.domain.enums.TicketSource;
import com.hospital.signage.domain.enums.TicketStatus;
import com.hospital.signage.domain.model.MaintenanceTicket;
import com.hospital.signage.domain.model.User;
import org.springframework.data.domain.Page;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TicketUseCase {
    MaintenanceTicket createTicket(CreateTicketCommand command);
    MaintenanceTicket assignTicket(Long ticketId, Long assigneeId);
    MaintenanceTicket takeTicket(Long ticketId, Long technicianId);
    MaintenanceTicket updateTicketStatus(Long ticketId, TicketStatus status, String imageBefore, String imageAfter, String rejectionNote);
    Optional<MaintenanceTicket> getTicketById(Long id);
    List<MaintenanceTicket> getAllTickets();
    Page<MaintenanceTicket> getTicketsPage(int page, int size, Long assigneeId, UUID assetId);
    List<MaintenanceTicket> getTicketsByAsset(UUID assetId);
    List<MaintenanceTicket> getTicketsByAssignee(Long assigneeId);

    record CreateTicketCommand(UUID assetId, String description, Priority priority, User reporter, TicketSource source) {
        public CreateTicketCommand {
            source = source != null ? source : TicketSource.MANUAL;
        }
        public CreateTicketCommand(UUID assetId, String description, Priority priority, User reporter) {
            this(assetId, description, priority, reporter, null);
        }
    }
}
