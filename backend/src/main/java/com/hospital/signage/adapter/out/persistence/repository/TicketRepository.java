package com.hospital.signage.adapter.out.persistence.repository;

import com.hospital.signage.adapter.out.persistence.entity.MaintenanceTicketEntity;
import com.hospital.signage.domain.enums.Priority;
import com.hospital.signage.domain.enums.TicketStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TicketRepository extends JpaRepository<MaintenanceTicketEntity, Long> {

    @Override
    @EntityGraph(attributePaths = {"asset", "reporter", "assignee"})
    Optional<MaintenanceTicketEntity> findById(Long id);

    @Override
    @EntityGraph(attributePaths = {"asset", "reporter", "assignee"})
    List<MaintenanceTicketEntity> findAll();

    @Query("SELECT t FROM MaintenanceTicketEntity t LEFT JOIN FETCH t.asset LEFT JOIN FETCH t.reporter LEFT JOIN FETCH t.assignee WHERE t.asset.id = :assetId ORDER BY t.createdAt DESC")
    List<MaintenanceTicketEntity> findByAssetId(@Param("assetId") UUID assetId);
    boolean existsByAssetId(UUID assetId);

    @Query(value = "SELECT t FROM MaintenanceTicketEntity t " +
                   "LEFT JOIN FETCH t.asset " +
                   "LEFT JOIN FETCH t.reporter " +
                   "LEFT JOIN FETCH t.assignee " +
                   "WHERE (:assigneeId IS NULL OR t.assignee.id = :assigneeId) " +
                   "AND (:assetId IS NULL OR t.asset.id = :assetId) " +
                   "AND (:status IS NULL OR t.ticketStatus = :status) " +
                   "AND (:priority IS NULL OR t.priority = :priority) " +
                   "ORDER BY t.createdAt DESC",
           countQuery = "SELECT COUNT(t) FROM MaintenanceTicketEntity t " +
                        "WHERE (:assigneeId IS NULL OR t.assignee.id = :assigneeId) " +
                        "AND (:assetId IS NULL OR t.asset.id = :assetId) " +
                        "AND (:status IS NULL OR t.ticketStatus = :status) " +
                        "AND (:priority IS NULL OR t.priority = :priority)")
    Page<MaintenanceTicketEntity> findByFilters(
            @Param("assigneeId") Long assigneeId,
            @Param("assetId") UUID assetId,
            @Param("status") TicketStatus status,
            @Param("priority") Priority priority,
            Pageable pageable);

    @Query("SELECT t.ticketStatus, COUNT(t) FROM MaintenanceTicketEntity t GROUP BY t.ticketStatus")
    List<Object[]> countByStatus();
}
