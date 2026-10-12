package com.hospital.signage.application.service;

import com.hospital.signage.application.port.in.RoleUseCase;
import com.hospital.signage.application.port.out.RoleDatabasePort;
import com.hospital.signage.domain.enums.Permission;
import com.hospital.signage.domain.enums.UiMode;
import com.hospital.signage.domain.model.Role;
import com.hospital.signage.infrastructure.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RoleService implements RoleUseCase {

    private final RoleDatabasePort roleDatabasePort;
    private final com.hospital.signage.application.port.out.UserDatabasePort userDatabasePort;
    private final UserAuthorityService.RoleCacheService roleCacheService;

    @Override
    public List<Role> getAllRoles() {
        if (SecurityUtils.isAuthenticated() && !SecurityUtils.isSuperAdmin()) {
            return getAllRoles(SecurityUtils.getCurrentHospitalId());
        }
        return getAllRoles(null);
    }

    @Override
    public List<Role> getAllRoles(Long hospitalId) {
        if (SecurityUtils.isAuthenticated() && !SecurityUtils.isSuperAdmin()) {
            return roleDatabasePort.findAllAccessible(SecurityUtils.getCurrentHospitalId());
        }
        if (hospitalId == null) {
            return roleDatabasePort.findAll();
        }
        return roleDatabasePort.findAllAccessible(hospitalId);
    }

    @Override
    public Role getRoleById(Long id) {
        Role role = roleDatabasePort.findById(id).orElseThrow(() -> new IllegalArgumentException("Nhóm quyền không tồn tại"));
        validateRoleAccess(role);
        return role;
    }

    private void validateRoleAccess(Role role) {
        if (!SecurityUtils.isAuthenticated() || SecurityUtils.isSuperAdmin()) {
            return;
        }
        Long callerHospitalId = SecurityUtils.getCurrentHospitalId();
        if (role.getHospitalId() != null && !role.getHospitalId().equals(callerHospitalId)) {
            throw new AccessDeniedException("Bạn không có quyền truy cập nhóm quyền này.");
        }
    }

    @Override
    @Transactional
    public Role createRole(CreateRoleCommand command) {
        Long targetHospitalId;
        if (SecurityUtils.isAuthenticated() && !SecurityUtils.isSuperAdmin()) {
            targetHospitalId = SecurityUtils.getCurrentHospitalId();
            if (targetHospitalId == null) {
                targetHospitalId = SecurityUtils.DEFAULT_HOSPITAL_ID;
            }
        } else {
            targetHospitalId = command.hospitalId();
        }

        if (roleDatabasePort.findGlobalByCode(command.code()).isPresent()) {
            throw new IllegalArgumentException("Mã nhóm quyền trùng với nhóm quyền hệ thống");
        }
        if (targetHospitalId != null && roleDatabasePort.findByCodeAndHospitalId(command.code(), targetHospitalId).isPresent()) {
            throw new IllegalArgumentException("Mã nhóm quyền đã tồn tại trong bệnh viện");
        }

        validatePermissions(command.permissions());
        Role role = Role.builder()
                .code(command.code())
                .name(command.name())
                .description(command.description())
                .uiMode(command.uiMode() != null ? command.uiMode() : UiMode.ADMIN)
                .permissions(command.permissions() != null ? command.permissions() : List.of())
                .hospitalId(targetHospitalId)
                .build();
        return roleDatabasePort.save(role);
    }

    @Override
    @Transactional
    public Role updateRole(UpdateRoleCommand command) {
        Role role = getRoleById(command.id());
        
        if (role.getHospitalId() == null && SecurityUtils.isAuthenticated() && !SecurityUtils.isSuperAdmin()) {
            throw new AccessDeniedException("Chỉ Quản trị hệ thống mới được phép sửa nhóm quyền toàn hệ thống.");
        }
        if (role.getHospitalId() != null && SecurityUtils.isAuthenticated() && !SecurityUtils.isSuperAdmin()) {
            Long callerHospitalId = SecurityUtils.getCurrentHospitalId();
            if (!role.getHospitalId().equals(callerHospitalId)) {
                throw new AccessDeniedException("Bạn không có quyền chỉnh sửa nhóm quyền của bệnh viện khác.");
            }
        }

        if ((role.getCode().equals("SUPER_ADMIN") || role.getPermissions().contains("HOSPITAL_MANAGE")) 
                && !SecurityUtils.isSuperAdmin()) {
            throw new AccessDeniedException("Chỉ Quản trị hệ thống mới được phép sửa nhóm quyền Quản trị hệ thống.");
        }
        
        if ((role.getCode().equals("SUPER_ADMIN") || role.getCode().equals("ADMIN") || role.getCode().equals("TECHNICAL")) 
                && !role.getCode().equals(command.code())) {
            throw new IllegalStateException("Không thể thay đổi mã của các nhóm quyền mặc định.");
        }

        if (!role.getCode().equals(command.code())) {
            if (role.getHospitalId() == null) {
                roleDatabasePort.findGlobalByCode(command.code()).ifPresent(existing -> {
                    if (!existing.getId().equals(role.getId())) {
                        throw new IllegalArgumentException("Mã nhóm quyền đã tồn tại trong hệ thống");
                    }
                });
            } else {
                if (roleDatabasePort.findGlobalByCode(command.code()).isPresent()) {
                    throw new IllegalArgumentException("Mã nhóm quyền trùng với nhóm quyền hệ thống");
                }
                roleDatabasePort.findByCodeAndHospitalId(command.code(), role.getHospitalId()).ifPresent(existing -> {
                    if (!existing.getId().equals(role.getId())) {
                        throw new IllegalArgumentException("Mã nhóm quyền đã tồn tại trong bệnh viện");
                    }
                });
            }
        }

        role.setCode(command.code());
        role.setName(command.name());
        role.setDescription(command.description());
        role.setUiMode(command.uiMode() != null ? command.uiMode() : UiMode.ADMIN);
        validatePermissions(command.permissions());
        role.setPermissions(command.permissions() != null ? command.permissions() : List.of());
        Role saved = roleDatabasePort.save(role);
        // Quyền hiệu lực của mọi tài khoản mang vai trò này vừa đổi — xoá cache ngay thay vì
        // đợi TTL, để việc thu hồi quyền có tác dụng tức thì.
        roleCacheService.evict(role.getId());
        return saved;
    }

    private void validatePermissions(List<String> permissions) {
        if (permissions == null) return;
        for (String permission : permissions) {
            if (!Permission.VALID.contains(permission)) {
                throw new IllegalArgumentException("Quyền không hợp lệ: " + permission);
            }
            if ((permission.equals("HOSPITAL_MANAGE") || permission.equals("HOSPITAL_VIEW")) 
                    && !SecurityUtils.isSuperAdmin()) {
                throw new AccessDeniedException("Chỉ Quản trị hệ thống mới có thể cấp quyền liên quan đến Quản lý Bệnh viện.");
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
        if (role.getHospitalId() == null && SecurityUtils.isAuthenticated() && !SecurityUtils.isSuperAdmin()) {
            throw new AccessDeniedException("Chỉ Quản trị hệ thống mới được phép xóa nhóm quyền toàn hệ thống.");
        }
        if (role.getHospitalId() != null && SecurityUtils.isAuthenticated() && !SecurityUtils.isSuperAdmin()) {
            Long callerHospitalId = SecurityUtils.getCurrentHospitalId();
            if (!role.getHospitalId().equals(callerHospitalId)) {
                throw new AccessDeniedException("Bạn không có quyền xóa nhóm quyền của bệnh viện khác.");
            }
        }
        if (role.getPermissions().contains("HOSPITAL_MANAGE") && !SecurityUtils.isSuperAdmin()) {
            throw new AccessDeniedException("Chỉ Quản trị hệ thống mới được phép xóa nhóm quyền Quản trị hệ thống.");
        }

        // users.role_id tham chiếu roles(id) và không có ON DELETE, nên vai trò còn người dùng
        // sẽ bị khoá ngoại chặn — nhưng thông điệp khi đó chỉ là câu chung chung về "liên kết
        // dữ liệu". Kiểm tra trước để nói rõ còn bao nhiêu tài khoản và phải làm gì.
        long userCount = userDatabasePort.countByRoleId(id);
        if (userCount > 0) {
            throw new IllegalStateException(
                    "Không thể xóa nhóm quyền này vì đang có " + userCount + " tài khoản sử dụng. "
                    + "Vui lòng chuyển các tài khoản đó sang nhóm quyền khác trước.");
        }

        roleDatabasePort.deleteById(id);
        roleCacheService.evict(id);
    }
}
