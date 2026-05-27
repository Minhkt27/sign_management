package com.hospital.signage.integration;

import com.hospital.signage.adapter.out.persistence.entity.AssetEntity;
import com.hospital.signage.adapter.out.persistence.entity.LocationEntity;
import com.hospital.signage.adapter.out.persistence.entity.MaintenanceTicketEntity;
import com.hospital.signage.adapter.out.persistence.entity.UserEntity;
import com.hospital.signage.adapter.out.persistence.repository.AssetRepository;
import com.hospital.signage.adapter.out.persistence.repository.LocationRepository;
import com.hospital.signage.adapter.out.persistence.repository.TicketRepository;
import com.hospital.signage.adapter.out.persistence.repository.UserRepository;
import com.hospital.signage.domain.enums.*;
import jakarta.persistence.OptimisticLockException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
public class TicketPersistenceIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private TicketRepository ticketRepository;
    @Autowired
    private AssetRepository assetRepository;
    @Autowired
    private LocationRepository locationRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private TransactionTemplate txTemplate;

    private UserEntity admin;
    private AssetEntity asset;

    @BeforeEach
    void setup() {
        ticketRepository.deleteAll();
        assetRepository.deleteAll();
        locationRepository.deleteAll();
        userRepository.deleteAll();

        admin = userRepository.save(UserEntity.builder()
                .username("test_admin_" + UUID.randomUUID())
                .password("hashed")
                .fullName("Test Admin")
                .role(Role.ADMIN)
                .isActive(true)
                .build());

        LocationEntity loc = locationRepository.save(LocationEntity.builder()
                .locationCode("LOC-" + UUID.randomUUID())
                .name("Test Location")
                .type(LocationType.ROOM)
                .build());

        asset = assetRepository.save(AssetEntity.builder()
                .id(UUID.randomUUID())
                .assetCode("ASSET-" + UUID.randomUUID())
                .material(Material.LED)
                .status(AssetStatus.ACTIVE)
                .location(loc)
                .build());
    }

    @Test
    void flyway_migration_created_schema_correctly() {
        // If we got here, the PostgreSQL container started and all tables were created by V1 migration.
        // Verify the tables are usable by performing basic operations.
        long userCount = userRepository.count();
        assertThat(userCount).isGreaterThanOrEqualTo(1);
    }

    @Test
    void findByAssetId_returns_tickets_with_reporter_and_assignee_loaded() {
        UserEntity tech = userRepository.save(UserEntity.builder()
                .username("tech_" + UUID.randomUUID())
                .password("hashed")
                .fullName("Test Tech")
                .role(Role.TECHNICAL)
                .isActive(true)
                .build());

        ticketRepository.save(MaintenanceTicketEntity.builder()
                .asset(asset)
                .reporter(admin)
                .assignee(tech)
                .priority(Priority.HIGH)
                .ticketStatus(TicketStatus.IN_PROGRESS)
                .source(TicketSource.MANUAL)
                .description("Test ticket")
                .rejectionCount(0)
                .build());

        List<MaintenanceTicketEntity> results = ticketRepository.findByAssetId(asset.getId());

        assertThat(results).hasSize(1);
        MaintenanceTicketEntity ticket = results.get(0);
        // Verify JOIN FETCH loaded the associations without extra queries
        assertThat(ticket.getReporter().getUsername()).isEqualTo(admin.getUsername());
        assertThat(ticket.getAssignee().getUsername()).isEqualTo(tech.getUsername());
    }

    @Test
    void version_field_prevents_concurrent_updates() {
        MaintenanceTicketEntity saved = ticketRepository.save(MaintenanceTicketEntity.builder()
                .asset(asset)
                .reporter(admin)
                .priority(Priority.MEDIUM)
                .ticketStatus(TicketStatus.OPEN)
                .source(TicketSource.MANUAL)
                .rejectionCount(0)
                .build());

        assertThat(saved.getVersion()).isEqualTo(0);

        // Simulate two concurrent reads of the same ticket
        MaintenanceTicketEntity staleRead = ticketRepository.findById(saved.getId()).orElseThrow();
        assertThat(staleRead.getVersion()).isEqualTo(0);

        // First update succeeds and increments version to 1
        txTemplate.executeWithoutResult(status -> {
            MaintenanceTicketEntity t = ticketRepository.findById(saved.getId()).orElseThrow();
            t.setTicketStatus(TicketStatus.IN_PROGRESS);
            ticketRepository.save(t);
        });

        assertThat(ticketRepository.findById(saved.getId()).orElseThrow().getVersion()).isEqualTo(1);

        // Second update with stale version (0) must fail with optimistic lock exception
        assertThatThrownBy(() -> txTemplate.executeWithoutResult(status -> {
            staleRead.setTicketStatus(TicketStatus.RESOLVED);
            ticketRepository.saveAndFlush(staleRead);
        })).isInstanceOfAny(
                ObjectOptimisticLockingFailureException.class,
                OptimisticLockException.class
        );
    }

    @Test
    void findByFilters_paginates_results_correctly() {
        for (int i = 0; i < 5; i++) {
            ticketRepository.save(MaintenanceTicketEntity.builder()
                    .asset(asset)
                    .reporter(admin)
                    .priority(Priority.LOW)
                    .ticketStatus(TicketStatus.OPEN)
                    .source(TicketSource.MANUAL)
                    .rejectionCount(0)
                    .build());
        }

        Page<MaintenanceTicketEntity> page0 = ticketRepository.findByFilters(null, null, TicketStatus.OPEN, null, PageRequest.of(0, 3));
        Page<MaintenanceTicketEntity> page1 = ticketRepository.findByFilters(null, null, TicketStatus.OPEN, null, PageRequest.of(1, 3));

        assertThat(page0.getTotalElements()).isEqualTo(5);
        assertThat(page0.getContent()).hasSize(3);
        assertThat(page1.getContent()).hasSize(2);
    }
}
