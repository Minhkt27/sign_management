package com.hospital.signage.adapter.in.web;

import com.hospital.signage.application.port.in.UserUseCase;
import com.hospital.signage.domain.enums.Role;
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
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PagedResponse<UserResponse>> getAllUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "") String search) {
        var result = userUseCase.getUsersPage(Math.max(0, page), Math.min(Math.max(1, size), 100), search).map(UserResponse::from);
        return ResponseEntity.ok(PagedResponse.from(result));
    }

    @Operation(summary = "Danh sách kỹ thuật viên")
    @GetMapping("/technicians")
    @PreAuthorize("hasAnyRole('ADMIN', 'TECHNICAL')")
    public ResponseEntity<List<UserResponse>> getTechnicians() {
        return ResponseEntity.ok(userUseCase.getTechnicians().stream().map(UserResponse::from).toList());
    }

    @Operation(summary = "Tạo tài khoản kỹ thuật viên")
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponse> createTechnician(@Valid @RequestBody CreateTechnicianRequest req) {
        User user = userUseCase.createTechnician(
                new UserUseCase.CreateTechnicianCommand(req.username(), req.fullName(), req.password())
        );
        return ResponseEntity.ok(UserResponse.from(user));
    }

    @Operation(summary = "Kích hoạt / vô hiệu hóa tài khoản")
    @PutMapping("/{id}/active")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponse> setActive(@PathVariable Long id, @RequestBody SetActiveRequest req) {
        User user = userUseCase.setUserActive(id, req.active());
        return ResponseEntity.ok(UserResponse.from(user));
    }

    @Operation(summary = "Đặt lại mật khẩu về mặc định")
    @PutMapping("/{id}/reset-password")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> resetPassword(@PathVariable Long id) {
        try {
            userUseCase.resetPassword(id);
            return ResponseEntity.ok().build();
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

    public record CreateTechnicianRequest(
            @NotBlank @Size(max = 100) String username,
            @NotBlank @Size(max = 200) String fullName,
            @NotBlank @Size(min = 6, max = 200) String password
    ) {}
    public record SetActiveRequest(boolean active) {}
    public record ChangePasswordRequest(
            @NotBlank String currentPassword,
            @NotBlank @Size(min = 6, max = 200) String newPassword
    ) {}

    public record UserResponse(Long id, String username, String fullName, Role role, boolean isActive) {
        static UserResponse from(User u) {
            return new UserResponse(u.getId(), u.getUsername(), u.getFullName(), u.getRole(),
                    Boolean.TRUE.equals(u.getIsActive()));
        }
    }
}
