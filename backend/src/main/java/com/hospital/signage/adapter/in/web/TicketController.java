package com.hospital.signage.adapter.in.web;

import com.hospital.signage.application.port.in.TicketUseCase;
import com.hospital.signage.domain.enums.Priority;
import com.hospital.signage.domain.enums.TicketSource;
import com.hospital.signage.domain.enums.TicketStatus;
import com.hospital.signage.domain.model.MaintenanceTicket;
import com.hospital.signage.domain.model.User;
import com.hospital.signage.infrastructure.security.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@Tag(name = "Phiếu bảo trì")
@RestController
@RequestMapping("/api/tickets")
@RequiredArgsConstructor
public class TicketController {

    private final TicketUseCase ticketUseCase;

    @Operation(summary = "Danh sách phiếu bảo trì (phân trang, có lọc)")
    @GetMapping
    @PreAuthorize("hasAuthority('TICKET_VIEW') or hasAuthority('TICKET_MANAGE')")
    public ResponseEntity<PagedResponse<MaintenanceTicket>> getTickets(
            @RequestParam(required = false) Long assigneeId,
            @RequestParam(required = false) UUID assetId,
            @RequestParam(required = false) TicketStatus status,
            @RequestParam(required = false) Priority priority,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) Long hospitalId) {
        User caller = currentUser();
        if (!isAdminCaller()) {
            if (caller == null) {
                throw new AccessDeniedException("Authenticated user is required");
            }
            assigneeId = caller.getId();
        }
        Long resolvedHospitalId = SecurityUtils.resolveAdminHospitalId(hospitalId);
        return ResponseEntity.ok(PagedResponse.from(ticketUseCase.getTicketsPage(
                Math.max(0, page), Math.min(Math.max(1, size), 100), assigneeId, assetId, status, priority,
                resolvedHospitalId)));
    }

    @Operation(summary = "Thống kê số lượng phiếu theo trạng thái")
    @GetMapping("/summary")
    @PreAuthorize("hasAuthority('ASSET_MANAGE') or hasAuthority('USER_MANAGE')")
    public ResponseEntity<Map<String, Long>> getTicketsSummary(@RequestParam(required = false) Long hospitalId) {
        return ResponseEntity.ok(ticketUseCase.getTicketsSummary(SecurityUtils.resolveAdminHospitalId(hospitalId)));
    }

    @Operation(summary = "Chi tiết phiếu bảo trì theo ID")
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('TICKET_VIEW') or hasAuthority('TICKET_MANAGE')")
    public ResponseEntity<MaintenanceTicket> getTicketById(@PathVariable Long id) {
        return ticketUseCase.getTicketById(id, SecurityUtils.getCurrentHospitalId())
                .map(ticket -> {
                    assertCanViewTicket(ticket);
                    return ResponseEntity.ok(ticket);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @Operation(summary = "Tạo phiếu bảo trì mới (báo hỏng)")
    @PostMapping
    @PreAuthorize("hasAuthority('TICKET_CREATE') or hasAuthority('TICKET_MANAGE')")
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

    @Operation(summary = "Phân công kỹ thuật viên xử lý phiếu")
    @PreAuthorize("hasAuthority('ASSET_MANAGE')")
    @PutMapping("/{id}/assign")
    public ResponseEntity<MaintenanceTicket> assignTicket(
            @PathVariable Long id,
            @RequestBody AssignTicketRequest request) {
        return ResponseEntity.ok(ticketUseCase.assignTicket(id, request.assigneeId(), SecurityUtils.getCurrentHospitalId()));
    }

    @Operation(summary = "Kỹ thuật viên tự nhận phiếu")
    @PreAuthorize("hasAuthority('TICKET_MANAGE')")
    @PutMapping("/{id}/take")
    public ResponseEntity<MaintenanceTicket> takeTicket(@PathVariable Long id) {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (!(principal instanceof User technician)) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(ticketUseCase.takeTicket(id, technician.getId(), SecurityUtils.getCurrentHospitalId()));
    }

    @Operation(summary = "Cập nhật trạng thái phiếu (xử lý, hoàn thành, đóng, từ chối)")
    @PreAuthorize("hasAuthority('TICKET_MANAGE')")
    @PutMapping("/{id}/status")
    public ResponseEntity<MaintenanceTicket> updateTicketStatus(
            @PathVariable Long id,
            @RequestBody UpdateStatusRequest request) {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Long technicianId = null;
        if (principal instanceof User caller) {
            var authorities = SecurityContextHolder.getContext().getAuthentication().getAuthorities();
            boolean isAdmin = authorities.stream().anyMatch(a ->
                "ASSET_MANAGE".equals(a.getAuthority()) || "USER_MANAGE".equals(a.getAuthority()));
            if (!isAdmin) {
                technicianId = caller.getId();
            }
        }
        return ResponseEntity.ok(ticketUseCase.updateTicketStatus(
                id,
                request.status(),
                request.imageBefore(),
                request.imageAfter(),
                request.rejectionNote(),
                technicianId,
                SecurityUtils.getCurrentHospitalId()
        ));
    }

    private User currentUser() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return principal instanceof User user ? user : null;
    }

    private boolean isAdminCaller() {
        var authorities = SecurityContextHolder.getContext().getAuthentication().getAuthorities();
        return authorities.stream().anyMatch(a ->
                "ASSET_MANAGE".equals(a.getAuthority()) || 
                "USER_MANAGE".equals(a.getAuthority()) ||
                "TICKET_MANAGE".equals(a.getAuthority()) ||
                "TICKET_VIEW".equals(a.getAuthority()));
    }

    private void assertCanViewTicket(MaintenanceTicket ticket) {
        if (isAdminCaller()) {
            return;
        }
        User caller = currentUser();
        if (caller == null) {
            throw new AccessDeniedException("Authenticated user is required");
        }
        boolean isAssignee = ticket.getAssignee() != null && caller.getId().equals(ticket.getAssignee().getId());
        boolean isReporter = ticket.getReporter() != null && caller.getId().equals(ticket.getReporter().getId());
        if (!isAssignee && !isReporter) {
            throw new AccessDeniedException("Ticket is not visible to this user");
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
