package com.hospital.signage.adapter.in.web;

import com.hospital.signage.application.port.in.TicketUseCase;
import com.hospital.signage.domain.enums.Priority;
import com.hospital.signage.domain.enums.TicketStatus;
import com.hospital.signage.domain.model.MaintenanceTicket;
import com.hospital.signage.domain.model.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/tickets")
@RequiredArgsConstructor
public class TicketController {

    private final TicketUseCase ticketUseCase;

    @GetMapping
    public ResponseEntity<List<MaintenanceTicket>> getTickets(
            @RequestParam(required = false) Long assigneeId,
            @RequestParam(required = false) UUID assetId) {
        
        if (assigneeId != null) {
            return ResponseEntity.ok(ticketUseCase.getTicketsByAssignee(assigneeId));
        }
        if (assetId != null) {
            return ResponseEntity.ok(ticketUseCase.getTicketsByAsset(assetId));
        }
        return ResponseEntity.ok(ticketUseCase.getAllTickets());
    }

    @GetMapping("/{id}")
    public ResponseEntity<MaintenanceTicket> getTicketById(@PathVariable Long id) {
        return ticketUseCase.getTicketById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<MaintenanceTicket> createTicket(@RequestBody CreateTicketRequest request) {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (!(principal instanceof User reporter)) {
            return ResponseEntity.status(401).build();
        }

        TicketUseCase.CreateTicketCommand command = new TicketUseCase.CreateTicketCommand(
                request.assetId(),
                request.description(),
                request.priority(),
                reporter
        );

        return ResponseEntity.ok(ticketUseCase.createTicket(command));
    }

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

    @PutMapping("/{id}/status")
    public ResponseEntity<MaintenanceTicket> updateTicketStatus(
            @PathVariable Long id,
            @RequestBody UpdateStatusRequest request) {
        try {
            return ResponseEntity.ok(ticketUseCase.updateTicketStatus(
                    id,
                    request.status(),
                    request.imageBefore(),
                    request.imageAfter()
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    public record CreateTicketRequest(UUID assetId, String description, Priority priority) {}
    public record AssignTicketRequest(Long assigneeId) {}
    public record UpdateStatusRequest(TicketStatus status, String imageBefore, String imageAfter) {}
}
