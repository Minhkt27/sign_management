package com.hospital.signage.application.service;

import com.hospital.signage.application.port.in.UserUseCase;
import com.hospital.signage.application.port.out.RoleDatabasePort;
import com.hospital.signage.application.port.out.TicketDatabasePort;
import com.hospital.signage.application.port.out.UserDatabasePort;

import com.hospital.signage.domain.enums.Permission;
import com.hospital.signage.domain.model.Role;
import com.hospital.signage.domain.model.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserService implements UserUseCase {

    private static final String TEMP_PASSWORD_CHARS =
            "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
    private static final int TEMP_PASSWORD_LENGTH = 16;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UserDatabasePort userDatabasePort;
    private final RoleDatabasePort roleDatabasePort;
    private final TicketDatabasePort ticketDatabasePort;
    private final PasswordEncoder passwordEncoder;
    private final UserCacheService userCacheService;

    @Override
    public List<User> getAllUsers() {
        return userDatabasePort.findAll();
    }

    @Override
    public Page<User> getUsersPage(int page, int size, String search) {
        return userDatabasePort.findPage(search, PageRequest.of(page, size));
    }

    @Override
    public List<User> getTechnicians() {
        return roleDatabasePort.findByCode("TECHNICAL")
                .map(role -> userDatabasePort.findByRoleId(role.getId()))
                .orElse(List.of());
    }

    @Override
    @Transactional
    public User createUser(CreateUserCommand command) {
        if (userDatabasePort.findByUsername(command.username()).isPresent()) {
            throw new IllegalArgumentException("Tên đăng nhập đã tồn tại");
        }
        validatePermissions(command.customPermissions());
        validateRoleAssignmentAllowed(command.roleId());
        User user = User.builder()
                .username(command.username())
                .fullName(command.fullName())
                .password(passwordEncoder.encode(command.password()))
                .roleId(command.roleId())
                .phone(command.phone())
                .customPermissions(command.customPermissions() != null ? command.customPermissions() : List.of())
                .isActive(true)
                .build();
        User saved = userDatabasePort.save(user);
        log.info("User account '{}' created with id {}", saved.getUsername(), saved.getId());
        return saved;
    }

    @Override
    @Transactional
    public User updateUserRoleAndPermissions(Long userId, Long roleId, List<String> customPermissions) {
        User user = userDatabasePort.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Người dùng không tồn tại"));
        if (Long.valueOf(1).equals(userId)) {
            throw new IllegalStateException("Không thể thay đổi quyền tài khoản quản trị viên");
        }
        validatePermissions(customPermissions);
        validateRoleAssignmentAllowed(roleId);
        user.setRoleId(roleId);
        user.setCustomPermissions(customPermissions != null ? customPermissions : List.of());
        User saved = userDatabasePort.save(user);
        userCacheService.evict(user.getUsername());
        return saved;
    }

    private void validatePermissions(List<String> permissions) {
        if (permissions == null) return;
        for (String permission : permissions) {
            if (!Permission.VALID.contains(permission)) {
                throw new IllegalArgumentException("Quyền không hợp lệ: " + permission);
            }
        }
    }

    private void validateRoleAssignmentAllowed(Long roleId) {
        if (roleId == null) return;
        Role role = roleDatabasePort.findById(roleId).orElse(null);
        if (role == null || role.getPermissions() == null) return;
        boolean grantsPrivilegeManagement = role.getPermissions().contains("ROLE_MANAGE")
                || role.getPermissions().contains("USER_MANAGE");
        if (grantsPrivilegeManagement && !callerHasAuthority("ROLE_MANAGE")) {
            throw new AccessDeniedException("Chỉ người có quyền ROLE_MANAGE mới được gán vai trò có khả năng quản lý quyền/người dùng.");
        }
    }

    private boolean callerHasAuthority(String authority) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) return false;
        return authentication.getAuthorities().stream()
                .anyMatch(a -> authority.equals(a.getAuthority()));
    }

    private boolean isCurrentUser(Long userId) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) return false;
        Object principal = authentication.getPrincipal();
        return principal instanceof User caller && caller.getId() != null && caller.getId().equals(userId);
    }

    @Override
    @Transactional
    public User setUserActive(Long id, boolean active) {
        User user = userDatabasePort.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Người dùng không tồn tại"));
        if (!active && isCurrentUser(id)) {
            throw new IllegalStateException("Không thể tự khóa tài khoản đang đăng nhập của chính mình.");
        }
        user.setIsActive(active);
        if (!active) {
            user.setRefreshToken(null);
        }
        User saved = userDatabasePort.save(user);
        userCacheService.evict(user.getUsername());
        return saved;
    }

    @Override
    @Transactional
    public String resetPassword(Long userId) {
        User user = userDatabasePort.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Người dùng không tồn tại"));
        if (Long.valueOf(1).equals(userId)) {
            throw new IllegalStateException("Không thể reset mật khẩu tài khoản quản trị.");
        }
        String temporaryPassword = generateTemporaryPassword();
        user.setPassword(passwordEncoder.encode(temporaryPassword));
        user.setRefreshToken(null);
        userDatabasePort.save(user);
        userCacheService.evict(user.getUsername());
        log.warn("Temporary password generated for user '{}'", user.getUsername());
        return temporaryPassword;
    }

    private String generateTemporaryPassword() {
        StringBuilder password = new StringBuilder(TEMP_PASSWORD_LENGTH);
        for (int index = 0; index < TEMP_PASSWORD_LENGTH; index++) {
            int charIndex = SECURE_RANDOM.nextInt(TEMP_PASSWORD_CHARS.length());
            password.append(TEMP_PASSWORD_CHARS.charAt(charIndex));
        }
        return password.toString();
    }

    @Override
    @Transactional
    public User updateUser(UpdateUserCommand command) {
        User user = userDatabasePort.findById(command.id())
                .orElseThrow(() -> new IllegalArgumentException("Người dùng không tồn tại"));
        user.setFullName(command.fullName());
        user.setPhone(command.phone());
        User saved = userDatabasePort.save(user);
        userCacheService.evict(user.getUsername());
        return saved;
    }

    @Override
    @Transactional
    public void deleteUser(Long id) {
        User user = userDatabasePort.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Người dùng không tồn tại"));
        if (Long.valueOf(1).equals(id)) {
            throw new IllegalStateException("Không thể xóa tài khoản quản trị viên");
        }
        if (ticketDatabasePort.existsOpenTicketForUser(id)) {
            throw new IllegalStateException("Không thể xóa người dùng đang có phiếu bảo trì chưa đóng liên quan.");
        }
        userDatabasePort.deleteById(id);
        userCacheService.evict(user.getUsername());
        log.warn("User account '{}' (id={}) deleted", user.getUsername(), id);
    }

    @Override
    @Transactional
    public void changePassword(ChangePasswordCommand command) {
        User user = userDatabasePort.findById(command.userId())
                .orElseThrow(() -> new IllegalArgumentException("Người dùng không tồn tại"));
        if (!passwordEncoder.matches(command.currentPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Mật khẩu hiện tại không đúng");
        }
        user.setPassword(passwordEncoder.encode(command.newPassword()));
        userDatabasePort.save(user);
        userCacheService.evict(user.getUsername());
    }
}
