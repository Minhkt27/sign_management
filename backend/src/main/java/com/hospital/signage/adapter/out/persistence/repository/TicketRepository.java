package com.hospital.signage.adapter.out.persistence.repository;

import com.hospital.signage.adapter.out.persistence.entity.MaintenanceTicketEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TicketRepository extends JpaRepository<MaintenanceTicketEntity, Long> {
    List<MaintenanceTicketEntity> findByAssetId(UUID assetId);
    Page<MaintenanceTicketEntity> findByAssetId(UUID assetId, Pageable pageable);
    List<MaintenanceTicketEntity> findByAssigneeId(Long assigneeId);
    Page<MaintenanceTicketEntity> findByAssigneeId(Long assigneeId, Pageable pageable);
}
