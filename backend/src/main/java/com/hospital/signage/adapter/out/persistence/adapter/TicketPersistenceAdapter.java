package com.hospital.signage.adapter.out.persistence.adapter;

import com.hospital.signage.adapter.out.persistence.entity.MaintenanceTicketEntity;
import com.hospital.signage.adapter.out.persistence.mapper.TicketMapper;
import com.hospital.signage.adapter.out.persistence.repository.TicketRepository;
import com.hospital.signage.application.port.out.TicketDatabasePort;
import com.hospital.signage.domain.enums.Priority;
import com.hospital.signage.domain.enums.TicketStatus;
import com.hospital.signage.domain.model.MaintenanceTicket;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class TicketPersistenceAdapter implements TicketDatabasePort {

    private final TicketRepository repository;
    private final TicketMapper mapper;

    @Override
    public MaintenanceTicket save(MaintenanceTicket ticket) {
        MaintenanceTicketEntity entity = mapper.toEntity(ticket);
        MaintenanceTicketEntity saved = repository.save(entity);
        return mapper.toDomain(saved);
    }

    @Override
    public Optional<MaintenanceTicket> findById(Long id) {
        return repository.findById(id).map(mapper::toDomain);
    }

    @Override
    public List<MaintenanceTicket> findAll() {
        return repository.findAll().stream()
                .map(mapper::toDomain)
                .collect(Collectors.toList());
    }

    @Override
    public Page<MaintenanceTicket> findAll(Pageable pageable) {
        return repository.findByFilters(null, null, null, null, pageable).map(mapper::toDomain);
    }

    @Override
    public List<MaintenanceTicket> findByAssetId(UUID assetId) {
        return repository.findByAssetId(assetId).stream()
                .map(mapper::toDomain)
                .collect(Collectors.toList());
    }

    @Override
    public Page<MaintenanceTicket> findByFilters(Long assigneeId, UUID assetId, TicketStatus status, Priority priority, Pageable pageable) {
        return repository.findByFilters(assigneeId, assetId, status, priority, pageable)
                .map(mapper::toDomain);
    }

    @Override
    public boolean existsByAssetId(UUID assetId) {
        return repository.existsByAssetId(assetId);
    }

    @Override
    public boolean existsOpenTicketForUser(Long userId) {
        return repository.existsOpenTicketForUser(userId);
    }

    @Override
    public Map<String, Long> countByStatus() {
        return repository.countByStatus().stream()
                .collect(Collectors.toMap(
                        row -> ((Enum<?>) row[0]).name(),
                        row -> (Long) row[1]
                ));
    }
}
