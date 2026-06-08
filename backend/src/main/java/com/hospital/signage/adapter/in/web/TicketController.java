package com.hospital.signage.adapter.in.web;

import com.hospital.signage.application.port.in.TicketUseCase;
import com.hospital.signage.domain.enums.Priority;
import com.hospital.signage.domain.enums.TicketSource;
import com.hospital.signage.domain.enums.TicketStatus;
import com.hospital.signage.domain.model.MaintenanceTicket;
import com.hospital.signage.domain.model.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
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

@Tag(name = "Phiếu bảo trì")
@RestController
@RequestMapping("/api/tickets")
@RequiredArgsConstructor
public class TicketController {

    private final TicketUseCase ticketUseCase;

    @Operation(summary = "Danh sách phiếu bảo trì (phân trang, có lọc)")
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

    @Operation(summary = "Thống kê số lượng phiếu theo trạng thái")
    @GetMapping("/summary")
    public ResponseEntity<Map<String, Long>> getTicketsSummary() {
        return ResponseEntity.ok(ticketUseCase.getTicketsSummary());
    }

    @Operation(summary = "Chi tiết phiếu bảo trì theo ID")
    @GetMapping("/{id}")
    public ResponseEntity<MaintenanceTicket> getTicketById(@PathVariable Long id) {
        return ticketUseCase.getTicketById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @Operation(summary = "Tạo phiếu bảo trì mới (báo hỏng)")
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

    @Operation(summary = "Phân công kỹ thuật viên xử lý phiếu")
    @PreAuthorize("hasAuthority('TICKET_MANAGE')")
    @PutMapping("/{id}/assign")
    public ResponseEntity<MaintenanceTicket> assignTicket(
            @PathVariable Long id,
            @RequestBody AssignTicketRequest request) {
        return ResponseEntity.ok(ticketUseCase.assignTicket(id, request.assigneeId()));
    }

    @Operation(summary = "Kỹ thuật viên tự nhận phiếu")
    @PreAuthorize("hasAuthority('TICKET_MANAGE')")
    @PutMapping("/{id}/take")
    public ResponseEntity<MaintenanceTicket> takeTicket(@PathVariable Long id) {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (!(principal instanceof User technician)) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(ticketUseCase.takeTicket(id, technician.getId()));
    }

    @Operation(summary = "Cập nhật trạng thái phiếu (xử lý, hoàn thành, đóng, từ chối)")
    @PreAuthorize("hasAuthority('TICKET_MANAGE')")
    @PutMapping("/{id}/status")
    public ResponseEntity<MaintenanceTicket> updateTicketStatus(
            @PathVariable Long id,
            @RequestBody UpdateStatusRequest request) {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Long technicianId = null;
        if (principal instanceof User caller && Long.valueOf(2).equals(caller.getRoleId())) {
            technicianId = caller.getId();
        }
        return ResponseEntity.ok(ticketUseCase.updateTicketStatus(
                id,
                request.status(),
                request.imageBefore(),
                request.imageAfter(),
                request.rejectionNote(),
                technicianId
        ));
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
