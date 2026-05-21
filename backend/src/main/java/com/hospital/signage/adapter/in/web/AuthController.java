package com.hospital.signage.adapter.in.web;

import com.hospital.signage.application.port.in.AuthUseCase;
import com.hospital.signage.application.port.out.UserDatabasePort;
import com.hospital.signage.domain.enums.Role;
import com.hospital.signage.domain.model.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class AuthController {

    private final AuthUseCase authUseCase;
    private final UserDatabasePort userDatabasePort;

    @PostMapping("/api/auth/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest request) {
        AuthUseCase.LoginCommand command = new AuthUseCase.LoginCommand(request.username(), request.password());
        AuthUseCase.LoginResult result = authUseCase.login(command);
        return ResponseEntity.ok(new LoginResponse(
                result.token(),
                result.refreshToken(),
                UserResponse.from(result.user())
        ));
    }

    @PostMapping("/api/auth/refresh")
    public ResponseEntity<AuthUseCase.RefreshResult> refresh(@RequestBody RefreshRequest request) {
        return ResponseEntity.ok(authUseCase.refreshToken(request.refreshToken()));
    }

    @PostMapping("/api/auth/logout")
    public ResponseEntity<Void> logout() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof User user) {
            authUseCase.logout(user.getUsername());
        }
        return ResponseEntity.ok().build();
    }

    @GetMapping("/api/auth/me")
    public ResponseEntity<UserResponse> getMe() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof User user) {
            return ResponseEntity.ok(UserResponse.from(user));
        }
        return ResponseEntity.badRequest().build();
    }

    @GetMapping("/api/users/technicians")
    public ResponseEntity<List<UserResponse>> getTechnicians() {
        List<UserResponse> techs = userDatabasePort.findByRole(Role.TECHNICAL)
                .stream()
                .map(UserResponse::from)
                .toList();
        return ResponseEntity.ok(techs);
    }

    public record LoginRequest(String username, String password) {}

    public record RefreshRequest(String refreshToken) {}

    public record LoginResponse(String token, String refreshToken, UserResponse user) {}

    public record UserResponse(Long id, String username, String fullName, Role role) {
        static UserResponse from(User u) {
            return new UserResponse(u.getId(), u.getUsername(), u.getFullName(), u.getRole());
        }
    }
}
