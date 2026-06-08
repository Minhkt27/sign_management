package com.hospital.signage.adapter.in.web;

import com.hospital.signage.application.port.in.RoleUseCase;
import com.hospital.signage.domain.model.Role;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Nhóm quyền")
@RestController
@RequestMapping("/api/roles")
@RequiredArgsConstructor
public class RoleController {

    private final RoleUseCase roleUseCase;

    @Operation(summary = "Lấy danh sách tất cả các nhóm quyền")
    @GetMapping
    @PreAuthorize("hasAuthority('ROLE_VIEW') or hasAuthority('ROLE_MANAGE') or hasAuthority('USER_MANAGE')")
    public ResponseEntity<List<Role>> getAllRoles() {
        return ResponseEntity.ok(roleUseCase.getAllRoles());
    }

    @Operation(summary = "Lấy chi tiết một nhóm quyền")
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_VIEW') or hasAuthority('ROLE_MANAGE')")
    public ResponseEntity<Role> getRoleById(@PathVariable Long id) {
        return ResponseEntity.ok(roleUseCase.getRoleById(id));
    }

    @Operation(summary = "Tạo mới một nhóm quyền")
    @PostMapping
    @PreAuthorize("hasAuthority('ROLE_MANAGE')")
    public ResponseEntity<Role> createRole(@Valid @RequestBody CreateRoleRequest request) {
        Role role = roleUseCase.createRole(new RoleUseCase.CreateRoleCommand(
                request.code(), request.name(), request.description(), request.permissions()));
        return ResponseEntity.ok(role);
    }

    @Operation(summary = "Cập nhật nhóm quyền")
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_MANAGE')")
    public ResponseEntity<Role> updateRole(@PathVariable Long id, @Valid @RequestBody CreateRoleRequest request) {
        Role role = roleUseCase.updateRole(new RoleUseCase.UpdateRoleCommand(
                id, request.code(), request.name(), request.description(), request.permissions()));
        return ResponseEntity.ok(role);
    }

    @Operation(summary = "Xóa nhóm quyền")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_MANAGE')")
    public ResponseEntity<Void> deleteRole(@PathVariable Long id) {
        roleUseCase.deleteRole(id);
        return ResponseEntity.ok().build();
    }

    public record CreateRoleRequest(
            @NotBlank String code,
            @NotBlank String name,
            String description,
            List<String> permissions
    ) {}
}
