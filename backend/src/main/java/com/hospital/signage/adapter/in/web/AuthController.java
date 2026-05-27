package com.hospital.signage.adapter.in.web;

import com.hospital.signage.application.port.in.AuthUseCase;
import com.hospital.signage.domain.enums.Role;
import com.hospital.signage.domain.model.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Xác thực")
@RestController
@RequiredArgsConstructor
public class AuthController {

    private final AuthUseCase authUseCase;

    @Operation(summary = "Đăng nhập")
    @PostMapping("/api/auth/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthUseCase.LoginCommand command = new AuthUseCase.LoginCommand(request.username(), request.password());
        AuthUseCase.LoginResult result = authUseCase.login(command);
        return ResponseEntity.ok(new LoginResponse(
                result.token(),
                result.refreshToken(),
                UserResponse.from(result.user())
        ));
    }

    @Operation(summary = "Làm mới access token")
    @PostMapping("/api/auth/refresh")
    public ResponseEntity<AuthUseCase.RefreshResult> refresh(@Valid @RequestBody RefreshRequest request) {
        return ResponseEntity.ok(authUseCase.refreshToken(request.refreshToken()));
    }

    @Operation(summary = "Đăng xuất")
    @PostMapping("/api/auth/logout")
    public ResponseEntity<Void> logout() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof User user) {
            authUseCase.logout(user.getUsername());
        }
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "Lấy thông tin tài khoản hiện tại")
    @GetMapping("/api/auth/me")
    public ResponseEntity<UserResponse> getMe() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof User user) {
            return ResponseEntity.ok(UserResponse.from(user));
        }
        return ResponseEntity.badRequest().build();
    }

    public record LoginRequest(
            @NotBlank @Size(max = 100) String username,
            @NotBlank @Size(max = 200) String password
    ) {}

    public record RefreshRequest(@NotBlank String refreshToken) {}

    public record LoginResponse(String token, String refreshToken, UserResponse user) {}

    public record UserResponse(Long id, String username, String fullName, Role role) {
        static UserResponse from(User u) {
            return new UserResponse(u.getId(), u.getUsername(), u.getFullName(), u.getRole());
        }
    }
}
