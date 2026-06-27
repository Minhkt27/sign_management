package com.hospital.signage.application.service;

import com.hospital.signage.application.port.in.UserUseCase;
import com.hospital.signage.application.port.out.RoleDatabasePort;
import com.hospital.signage.application.port.out.UserDatabasePort;

import com.hospital.signage.domain.model.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
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
        user.setRoleId(roleId);
        user.setCustomPermissions(customPermissions != null ? customPermissions : List.of());
        User saved = userDatabasePort.save(user);
        userCacheService.evict(user.getUsername());
        return saved;
    }

    @Override
    @Transactional
    public User setUserActive(Long id, boolean active) {
        User user = userDatabasePort.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Người dùng không tồn tại"));
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
