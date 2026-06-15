package com.hospital.signage.application.port.in;

import com.hospital.signage.domain.model.Role;

import java.util.List;

public interface RoleUseCase {
    List<Role> getAllRoles();
    Role getRoleById(Long id);
    Role createRole(CreateRoleCommand command);
    Role updateRole(UpdateRoleCommand command);
    void deleteRole(Long id);

    record CreateRoleCommand(String code, String name, String description, List<String> permissions) {}
    record UpdateRoleCommand(Long id, String code, String name, String description, List<String> permissions) {}
}
