package com.hospital.signage.adapter.in.web;

import com.hospital.signage.application.port.in.AuthUseCase;

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
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request,
            jakarta.servlet.http.HttpServletRequest httpRequest) {
        AuthUseCase.LoginCommand command = new AuthUseCase.LoginCommand(
                request.username(), request.password(), resolveClientIp(httpRequest));
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

    /**
     * IP thật của client để đếm số lần đăng nhập thất bại theo IP.
     *
     * <p>Backend luôn đứng sau reverse proxy (Caddy → nginx → backend) nên
     * {@code getRemoteAddr()} chỉ ra IP của proxy — mọi người dùng sẽ dùng chung một bộ đếm.
     * Vì vậy phải đọc X-Forwarded-For / X-Real-IP, lấy IP ngoài cùng bên trái (client gốc).
     *
     * <p><b>Giới hạn:</b> hai header này do client gửi lên nên về nguyên tắc giả mạo được —
     * kẻ tấn công đổi IP giả mỗi lần thử là né được bộ đếm theo IP (bộ đếm theo username vẫn
     * chặn). Chấp nhận được vì cổng 8080 chỉ mở trên loopback ở production, mọi request đều
     * phải đi qua proxy và proxy tự ghi đè các header này. Nếu sau này backend được expose
     * trực tiếp thì phải chuyển sang danh sách proxy tin cậy (ForwardedHeaderFilter).
     */
    private static String resolveClientIp(jakarta.servlet.http.HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return request.getRemoteAddr();
    }

    public record LoginRequest(
            @NotBlank @Size(max = 100) String username,
            @NotBlank @Size(max = 200) String password
    ) {}

    public record RefreshRequest(@NotBlank String refreshToken) {}

    public record LoginResponse(String token, String refreshToken, UserResponse user) {}

    public record UserResponse(Long id, String username, String fullName, Long roleId, java.util.List<String> permissions) {
        static UserResponse from(User u) {
            return new UserResponse(u.getId(), u.getUsername(), u.getFullName(), u.getRoleId(), u.getCustomPermissions());
        }
    }
}
