package com.hospital.signage.application.service;

import com.hospital.signage.application.port.in.RoleUseCase;
import com.hospital.signage.application.port.out.RoleDatabasePort;
import com.hospital.signage.domain.enums.Permission;
import com.hospital.signage.domain.enums.UiMode;
import com.hospital.signage.domain.model.Role;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RoleService implements RoleUseCase {

    private final RoleDatabasePort roleDatabasePort;

    @Override
    public List<Role> getAllRoles() {
        return roleDatabasePort.findAll();
    }

    @Override
    public Role getRoleById(Long id) {
        return roleDatabasePort.findById(id).orElseThrow(() -> new IllegalArgumentException("Nhóm quyền không tồn tại"));
    }

    @Override
    @Transactional
    public Role createRole(CreateRoleCommand command) {
        if (roleDatabasePort.findByCode(command.code()).isPresent()) {
            throw new IllegalArgumentException("Mã nhóm quyền đã tồn tại");
        }
        validatePermissions(command.permissions());
        Role role = Role.builder()
                .code(command.code())
                .name(command.name())
                .description(command.description())
                .uiMode(command.uiMode() != null ? command.uiMode() : UiMode.ADMIN)
                .permissions(command.permissions() != null ? command.permissions() : List.of())
                .build();
        return roleDatabasePort.save(role);
    }

    @Override
    @Transactional
    public Role updateRole(UpdateRoleCommand command) {
        Role role = getRoleById(command.id());
        
        if ((role.getCode().equals("SUPER_ADMIN") || role.getPermissions().contains("HOSPITAL_MANAGE")) 
                && !com.hospital.signage.infrastructure.security.SecurityUtils.isSuperAdmin()) {
            throw new org.springframework.security.access.AccessDeniedException("Chỉ Quản trị hệ thống mới được phép sửa nhóm quyền Quản trị hệ thống.");
        }
        
        if ((role.getCode().equals("SUPER_ADMIN") || role.getCode().equals("ADMIN") || role.getCode().equals("TECHNICAL")) 
                && !role.getCode().equals(command.code())) {
            throw new IllegalStateException("Không thể thay đổi mã của các nhóm quyền mặc định.");
        }

        roleDatabasePort.findByCode(command.code()).ifPresent(existing -> {
            if (!existing.getId().equals(role.getId())) {
                throw new IllegalArgumentException("Mã nhóm quyền đã tồn tại");
            }
        });
        role.setCode(command.code());
        role.setName(command.name());
        role.setDescription(command.description());
        role.setUiMode(command.uiMode() != null ? command.uiMode() : UiMode.ADMIN);
        validatePermissions(command.permissions());
        role.setPermissions(command.permissions() != null ? command.permissions() : List.of());
        return roleDatabasePort.save(role);
    }

    private void validatePermissions(List<String> permissions) {
        if (permissions == null) return;
        for (String permission : permissions) {
            if (!Permission.VALID.contains(permission)) {
                throw new IllegalArgumentException("Quyền không hợp lệ: " + permission);
            }
            if ((permission.equals("HOSPITAL_MANAGE") || permission.equals("HOSPITAL_VIEW")) 
                    && !com.hospital.signage.infrastructure.security.SecurityUtils.isSuperAdmin()) {
                throw new org.springframework.security.access.AccessDeniedException("Chỉ Quản trị hệ thống mới có thể cấp quyền liên quan đến Quản lý Bệnh viện.");
            }
        }
    }

    @Override
    @Transactional
    public void deleteRole(Long id) {
        Role role = getRoleById(id);
        if (role.getCode().equals("SUPER_ADMIN") || role.getCode().equals("ADMIN") || role.getCode().equals("TECHNICAL")) {
            throw new IllegalStateException("Không thể xóa nhóm quyền mặc định của hệ thống");
        }
        if (role.getPermissions().contains("HOSPITAL_MANAGE") && !com.hospital.signage.infrastructure.security.SecurityUtils.isSuperAdmin()) {
            throw new org.springframework.security.access.AccessDeniedException("Chỉ Quản trị hệ thống mới được phép xóa nhóm quyền Quản trị hệ thống.");
        }
        roleDatabasePort.deleteById(id);
    }
}
