package com.hospital.signage.adapter.in.web;

import com.hospital.signage.application.port.in.TicketUseCase;
import com.hospital.signage.domain.enums.Priority;
import com.hospital.signage.domain.enums.TicketSource;
import com.hospital.signage.domain.enums.TicketStatus;
import com.hospital.signage.domain.model.MaintenanceTicket;
import com.hospital.signage.domain.model.User;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/tickets")
@RequiredArgsConstructor
public class TicketController {

    private final TicketUseCase ticketUseCase;

    @GetMapping
    public ResponseEntity<PagedResponse<MaintenanceTicket>> getTickets(
            @RequestParam(required = false) Long assigneeId,
            @RequestParam(required = false) UUID assetId,
            @RequestParam(required = false) TicketStatus status,
            @RequestParam(required = false) Priority priority,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(PagedResponse.from(ticketUseCase.getTicketsPage(
                Math.max(0, page), Math.min(Math.max(1, size), 100), assigneeId, assetId, status, priority)));
    }

    @GetMapping("/summary")
    public ResponseEntity<Map<String, Long>> getTicketsSummary() {
        return ResponseEntity.ok(ticketUseCase.getTicketsSummary());
    }

    @GetMapping("/{id}")
    public ResponseEntity<MaintenanceTicket> getTicketById(@PathVariable Long id) {
        return ticketUseCase.getTicketById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<MaintenanceTicket> createTicket(@Valid @RequestBody CreateTicketRequest request) {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (!(principal instanceof User reporter)) {
            return ResponseEntity.status(401).build();
        }

        TicketUseCase.CreateTicketCommand command = new TicketUseCase.CreateTicketCommand(
                request.assetId(),
                request.description(),
                request.priority(),
                reporter,
                request.source()
        );

        return ResponseEntity.ok(ticketUseCase.createTicket(command));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}/assign")
    public ResponseEntity<MaintenanceTicket> assignTicket(
            @PathVariable Long id,
            @RequestBody AssignTicketRequest request) {
        try {
            return ResponseEntity.ok(ticketUseCase.assignTicket(id, request.assigneeId()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PreAuthorize("hasRole('TECHNICAL')")
    @PutMapping("/{id}/take")
    public ResponseEntity<MaintenanceTicket> takeTicket(@PathVariable Long id) {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (!(principal instanceof User technician)) {
            return ResponseEntity.status(401).build();
        }
        try {
            return ResponseEntity.ok(ticketUseCase.takeTicket(id, technician.getId()));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PreAuthorize("hasRole('ADMIN') or hasRole('TECHNICAL')")
    @PutMapping("/{id}/status")
    public ResponseEntity<MaintenanceTicket> updateTicketStatus(
            @PathVariable Long id,
            @RequestBody UpdateStatusRequest request) {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Long technicianId = null;
        if (principal instanceof User caller && "TECHNICAL".equals(caller.getRole().name())) {
            technicianId = caller.getId();
        }
        try {
            return ResponseEntity.ok(ticketUseCase.updateTicketStatus(
                    id,
                    request.status(),
                    request.imageBefore(),
                    request.imageAfter(),
                    request.rejectionNote(),
                    technicianId
            ));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(403).build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    public record CreateTicketRequest(
            @NotNull(message = "Asset không được để trống") UUID assetId,
            @NotBlank(message = "Mô tả không được để trống") String description,
            @NotNull(message = "Mức độ ưu tiên không được để trống") Priority priority,
            TicketSource source
    ) {}

    public record AssignTicketRequest(@NotNull(message = "Người được giao không được để trống") Long assigneeId) {}

    public record UpdateStatusRequest(
            @NotNull(message = "Trạng thái không được để trống") TicketStatus status,
            String imageBefore,
            String imageAfter,
            String rejectionNote
    ) {}
}
