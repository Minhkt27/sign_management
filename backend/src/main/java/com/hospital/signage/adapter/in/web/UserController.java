package com.hospital.signage.adapter.in.web;

import com.hospital.signage.application.port.in.UserUseCase;
import com.hospital.signage.infrastructure.security.SecurityUtils;

import com.hospital.signage.domain.model.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Người dùng")
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserUseCase userUseCase;

    @Operation(summary = "Danh sách người dùng (phân trang)")
    @GetMapping
    @PreAuthorize("hasAuthority('USER_VIEW')")
    public ResponseEntity<PagedResponse<UserResponse>> getAllUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "") String search,
            @RequestParam(required = false) Long hospitalId) {
        Long resolvedHospitalId = SecurityUtils.resolveAdminHospitalId(hospitalId);
        var result = userUseCase.getUsersPage(Math.max(0, page), Math.min(Math.max(1, size), 100), search, resolvedHospitalId).map(UserResponse::from);
        return ResponseEntity.ok(PagedResponse.from(result));
    }

    @Operation(summary = "Danh sách kỹ thuật viên")
    @GetMapping("/technicians")
    @PreAuthorize("hasAuthority('USER_VIEW') or hasAuthority('TICKET_MANAGE')")
    public ResponseEntity<List<UserResponse>> getTechnicians(@RequestParam(required = false) Long hospitalId) {
        Long resolvedHospitalId = SecurityUtils.resolveAdminHospitalId(hospitalId);
        return ResponseEntity.ok(userUseCase.getTechnicians(resolvedHospitalId).stream().map(UserResponse::from).toList());
    }

    @Operation(summary = "Tạo tài khoản")
    @PostMapping
    @PreAuthorize("hasAuthority('USER_MANAGE')")
    public ResponseEntity<UserResponse> createUser(@Valid @RequestBody CreateUserRequest req) {
        User user = userUseCase.createUser(
                new UserUseCase.CreateUserCommand(req.username(), req.fullName(), req.password(), req.roleId(), req.phone(), req.customPermissions(), req.hospitalId())
        );
        return ResponseEntity.ok(UserResponse.from(user));
    }

    @Operation(summary = "Sửa quyền và vai trò của tài khoản")
    @PutMapping("/{id}/role-permissions")
    @PreAuthorize("hasAuthority('USER_MANAGE')")
    public ResponseEntity<UserResponse> updateRoleAndPermissions(@PathVariable Long id, @RequestBody UpdateRolePermissionsRequest req) {
        User user = userUseCase.updateUserRoleAndPermissions(id, req.roleId(), req.customPermissions());
        return ResponseEntity.ok(UserResponse.from(user));
    }

    @Operation(summary = "Kích hoạt / vô hiệu hóa tài khoản")
    @PutMapping("/{id}/active")
    @PreAuthorize("hasAuthority('USER_MANAGE')")
    public ResponseEntity<UserResponse> setActive(@PathVariable Long id, @RequestBody SetActiveRequest req) {
        User user = userUseCase.setUserActive(id, req.active());
        return ResponseEntity.ok(UserResponse.from(user));
    }

    @Operation(summary = "Đặt lại mật khẩu tạm thời")
    @PutMapping("/{id}/reset-password")
    @PreAuthorize("hasAuthority('USER_MANAGE')")
    public ResponseEntity<ResetPasswordResponse> resetPassword(@PathVariable Long id) {
        try {
            String temporaryPassword = userUseCase.resetPassword(id);
            return ResponseEntity.ok(new ResetPasswordResponse(temporaryPassword));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @Operation(summary = "Cập nhật thông tin tài khoản")
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('USER_MANAGE')")
    public ResponseEntity<UserResponse> updateUser(@PathVariable Long id, @Valid @RequestBody UpdateUserRequest req) {
        User user = userUseCase.updateUser(new UserUseCase.UpdateUserCommand(id, req.fullName(), req.phone()));
        return ResponseEntity.ok(UserResponse.from(user));
    }

    @Operation(summary = "Xóa tài khoản")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('USER_MANAGE')")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        try {
            userUseCase.deleteUser(id);
            return ResponseEntity.noContent().build();
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @Operation(summary = "Đổi mật khẩu cá nhân")
    @PutMapping("/me/password")
    public ResponseEntity<Void> changePassword(@Valid @RequestBody ChangePasswordRequest req) {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (!(principal instanceof User user)) {
            return ResponseEntity.badRequest().build();
        }
        userUseCase.changePassword(
                new UserUseCase.ChangePasswordCommand(user.getId(), req.currentPassword(), req.newPassword())
        );
        return ResponseEntity.ok().build();
    }

    public record CreateUserRequest(
            @NotBlank @Size(max = 100) String username,
            @NotBlank @Size(max = 200) String fullName,
            @NotBlank @Size(min = 6, max = 200) String password,
            Long roleId,
            @jakarta.validation.constraints.Pattern(regexp = "^(0(3[2-9]|5[25689]|7[06-9]|8[1-9]|9[0-46-9])\\d{7})?$", message = "Số điện thoại không hợp lệ") String phone,
            java.util.List<String> customPermissions,
            Long hospitalId
    ) {}
    public record UpdateUserRequest(
            @NotBlank @Size(max = 200) String fullName,
            @jakarta.validation.constraints.Pattern(regexp = "^(0(3[2-9]|5[25689]|7[06-9]|8[1-9]|9[0-46-9])\\d{7})?$", message = "Số điện thoại không hợp lệ") String phone
    ) {}
    public record UpdateRolePermissionsRequest(Long roleId, java.util.List<String> customPermissions) {}
    public record SetActiveRequest(boolean active) {}
    public record ChangePasswordRequest(
            @NotBlank String currentPassword,
            @NotBlank @Size(min = 6, max = 200) String newPassword
    ) {}
    public record ResetPasswordResponse(String temporaryPassword) {}

    public record UserResponse(Long id, String username, String fullName, Long roleId, boolean isActive, String phone, java.util.List<String> customPermissions, Long hospitalId) {
        static UserResponse from(User u) {
            return new UserResponse(u.getId(), u.getUsername(), u.getFullName(), u.getRoleId(),
                    Boolean.TRUE.equals(u.getIsActive()),
                    u.getPhone(),
                    u.getCustomPermissions() != null ? u.getCustomPermissions() : java.util.List.of(),
                    u.getHospitalId());
        }
    }
}
