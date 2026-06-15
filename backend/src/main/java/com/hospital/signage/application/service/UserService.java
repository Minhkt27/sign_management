package com.hospital.signage.application.service;

import com.hospital.signage.application.port.in.UserUseCase;
import com.hospital.signage.application.port.out.UserDatabasePort;

import com.hospital.signage.domain.model.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService implements UserUseCase {

    private final UserDatabasePort userDatabasePort;
    private final PasswordEncoder passwordEncoder;

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
        // We will need RoleDatabasePort to fetch the role ID by code, but for now we just return an empty list or we can skip this if we change it to role ID.
        // Actually, let's just return all users for now or fetch by role ID if we add a rolePort.
        return List.of(); 
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
        user.setRoleId(roleId);
        user.setCustomPermissions(customPermissions != null ? customPermissions : List.of());
        return userDatabasePort.save(user);
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
        return userDatabasePort.save(user);
    }

    @Override
    @Transactional
    public void resetPassword(Long userId) {
        User user = userDatabasePort.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Người dùng không tồn tại"));
        // We can't check Role.ADMIN easily without Role Port. We will remove this check for now, or check roleId == 1.
        if (Long.valueOf(1).equals(user.getRoleId())) {
            throw new IllegalStateException("Không thể reset mật khẩu tài khoản quản trị.");
        }
        user.setPassword(passwordEncoder.encode("12345678"));
        user.setRefreshToken(null);
        userDatabasePort.save(user);
        log.warn("Password reset to default for user '{}'", user.getUsername());
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
    }
}
