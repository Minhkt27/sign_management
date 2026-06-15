package com.hospital.signage.application.service;

import com.hospital.signage.application.port.in.RoleUseCase;
import com.hospital.signage.application.port.out.RoleDatabasePort;
import com.hospital.signage.domain.model.Role;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
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
        Role role = Role.builder()
                .code(command.code())
                .name(command.name())
                .description(command.description())
                .permissions(command.permissions() != null ? command.permissions() : List.of())
                .build();
        return roleDatabasePort.save(role);
    }

    @Override
    @Transactional
    public Role updateRole(UpdateRoleCommand command) {
        Role role = getRoleById(command.id());
        roleDatabasePort.findByCode(command.code()).ifPresent(existing -> {
            if (!existing.getId().equals(role.getId())) {
                throw new IllegalArgumentException("Mã nhóm quyền đã tồn tại");
            }
        });
        role.setCode(command.code());
        role.setName(command.name());
        role.setDescription(command.description());
        role.setPermissions(command.permissions() != null ? command.permissions() : List.of());
        return roleDatabasePort.save(role);
    }

    @Override
    @Transactional
    public void deleteRole(Long id) {
        if (id == 1L || id == 2L) {
            throw new IllegalStateException("Không thể xóa nhóm quyền mặc định của hệ thống");
        }
        roleDatabasePort.deleteById(id);
    }
}
