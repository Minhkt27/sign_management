package com.hospital.signage.application.port.out;

import com.hospital.signage.domain.model.MaintenanceTicket;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TicketDatabasePort {
    MaintenanceTicket save(MaintenanceTicket ticket);
    Optional<MaintenanceTicket> findById(Long id);
    List<MaintenanceTicket> findAll();
    Page<MaintenanceTicket> findAll(Pageable pageable);
    List<MaintenanceTicket> findByAssetId(UUID assetId);
    Page<MaintenanceTicket> findByAssetId(UUID assetId, Pageable pageable);
    List<MaintenanceTicket> findByAssigneeId(Long assigneeId);
    Page<MaintenanceTicket> findByAssigneeId(Long assigneeId, Pageable pageable);
}
