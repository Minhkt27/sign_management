package com.hospital.signage.application.port.out;

import com.hospital.signage.domain.model.MaintenanceTicket;

import java.util.List;
import java.util.Optional;

public interface TicketDatabasePort {
    MaintenanceTicket save(MaintenanceTicket ticket);
    Optional<MaintenanceTicket> findById(Long id);
    List<MaintenanceTicket> findAll();
    List<MaintenanceTicket> findByAssetId(java.util.UUID assetId);
    List<MaintenanceTicket> findByAssigneeId(Long assigneeId);
}
