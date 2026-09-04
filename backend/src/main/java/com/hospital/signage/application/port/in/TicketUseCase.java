package com.hospital.signage.application.port.in;

import com.hospital.signage.domain.enums.Priority;
import com.hospital.signage.domain.enums.TicketSource;
import com.hospital.signage.domain.enums.TicketStatus;
import com.hospital.signage.domain.model.MaintenanceTicket;
import com.hospital.signage.domain.model.User;
import org.springframework.data.domain.Page;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

public interface TicketUseCase {
    MaintenanceTicket createTicket(CreateTicketCommand command);
    MaintenanceTicket assignTicket(Long ticketId, Long assigneeId, Long callerHospitalId);
    MaintenanceTicket takeTicket(Long ticketId, Long technicianId, Long callerHospitalId);
    MaintenanceTicket updateTicketStatus(Long ticketId, TicketStatus status, String imageBefore, String imageAfter, String rejectionNote, Long technicianId, Long callerHospitalId);
    Optional<MaintenanceTicket> getTicketById(Long id, Long callerHospitalId);
    List<MaintenanceTicket> getAllTickets(Long hospitalId);
    Page<MaintenanceTicket> getTicketsPage(int page, int size, Long assigneeId, UUID assetId, TicketStatus status, Priority priority, Long hospitalId);
    Map<String, Long> getTicketsSummary(Long hospitalId);
    List<MaintenanceTicket> getTicketsByAsset(UUID assetId, Long hospitalId);
    List<MaintenanceTicket> getTicketsByAssignee(Long assigneeId, Long hospitalId);

    record CreateTicketCommand(UUID assetId, String description, Priority priority, User reporter, TicketSource source) {
        public CreateTicketCommand {
            source = source != null ? source : TicketSource.MANUAL;
        }
        public CreateTicketCommand(UUID assetId, String description, Priority priority, User reporter) {
            this(assetId, description, priority, reporter, null);
        }
    }
}
