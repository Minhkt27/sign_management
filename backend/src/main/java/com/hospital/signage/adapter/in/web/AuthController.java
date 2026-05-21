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
    public ResponseEntity<AuthUseCase.LoginResult> login(@RequestBody LoginRequest request) {
        AuthUseCase.LoginCommand command = new AuthUseCase.LoginCommand(request.username(), request.password());
        AuthUseCase.LoginResult result = authUseCase.login(command);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/api/auth/refresh")
    public ResponseEntity<AuthUseCase.RefreshResult> refresh(@RequestBody RefreshRequest request) {
        AuthUseCase.RefreshResult result = authUseCase.refreshToken(request.refreshToken());
        return ResponseEntity.ok(result);
    }

    @GetMapping("/api/auth/me")
    public ResponseEntity<User> getMe() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof User) {
            return ResponseEntity.ok((User) principal);
        }
        return ResponseEntity.badRequest().build();
    }

    @GetMapping("/api/users/technicians")
    public ResponseEntity<List<User>> getTechnicians() {
        List<User> techs = userDatabasePort.findByRole(Role.TECHNICAL);
        techs.forEach(u -> u.setPassword(null));
        return ResponseEntity.ok(techs);
    }

    public record LoginRequest(String username, String password) {}

    public record RefreshRequest(String refreshToken) {}
}
