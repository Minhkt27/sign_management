package com.hospital.signage.adapter.in.web;

import com.hospital.signage.application.port.in.UserUseCase;
import com.hospital.signage.domain.enums.Role;
import com.hospital.signage.domain.model.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserUseCase userUseCase;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PagedResponse<UserResponse>> getAllUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "") String search) {
        var result = userUseCase.getUsersPage(page, size, search).map(UserResponse::from);
        return ResponseEntity.ok(PagedResponse.from(result));
    }

    @GetMapping("/technicians")
    public ResponseEntity<List<UserResponse>> getTechnicians() {
        return ResponseEntity.ok(userUseCase.getTechnicians().stream().map(UserResponse::from).toList());
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponse> createTechnician(@RequestBody CreateTechnicianRequest req) {
        User user = userUseCase.createTechnician(
                new UserUseCase.CreateTechnicianCommand(req.username(), req.fullName(), req.password())
        );
        return ResponseEntity.ok(UserResponse.from(user));
    }

    @PutMapping("/{id}/active")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponse> setActive(@PathVariable Long id, @RequestBody SetActiveRequest req) {
        User user = userUseCase.setUserActive(id, req.active());
        return ResponseEntity.ok(UserResponse.from(user));
    }

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

    @PutMapping("/me/password")
    public ResponseEntity<Void> changePassword(@RequestBody ChangePasswordRequest req) {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (!(principal instanceof User user)) {
            return ResponseEntity.badRequest().build();
        }
        userUseCase.changePassword(
                new UserUseCase.ChangePasswordCommand(user.getId(), req.currentPassword(), req.newPassword())
        );
        return ResponseEntity.ok().build();
    }

    public record CreateTechnicianRequest(String username, String fullName, String password) {}
    public record SetActiveRequest(boolean active) {}
    public record ChangePasswordRequest(String currentPassword, String newPassword) {}

    public record UserResponse(Long id, String username, String fullName, Role role, boolean isActive) {
        static UserResponse from(User u) {
            return new UserResponse(u.getId(), u.getUsername(), u.getFullName(), u.getRole(),
                    Boolean.TRUE.equals(u.getIsActive()));
        }
    }
}
