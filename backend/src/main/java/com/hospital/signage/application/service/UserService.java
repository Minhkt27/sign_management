package com.hospital.signage.application.service;

import com.hospital.signage.application.port.in.UserUseCase;
import com.hospital.signage.application.port.out.UserDatabasePort;
import com.hospital.signage.domain.enums.Role;
import com.hospital.signage.domain.model.User;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

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
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return userDatabasePort.findPage(search, pageRequest);
    }

    @Override
    public List<User> getTechnicians() {
        return userDatabasePort.findByRole(Role.TECHNICAL);
    }

    @Override
    @Transactional
    public User createTechnician(CreateTechnicianCommand command) {
        if (userDatabasePort.findByUsername(command.username()).isPresent()) {
            throw new IllegalArgumentException("Tên đăng nhập đã tồn tại");
        }
        User user = User.builder()
                .username(command.username())
                .fullName(command.fullName())
                .password(passwordEncoder.encode(command.password()))
                .role(Role.TECHNICAL)
                .isActive(true)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        return userDatabasePort.save(user);
    }

    @Override
    @Transactional
    public User setUserActive(Long id, boolean active) {
        User user = userDatabasePort.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Người dùng không tồn tại"));
        user.setIsActive(active);
        user.setUpdatedAt(LocalDateTime.now());
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
        if (user.getRole() == Role.ADMIN) {
            throw new IllegalStateException("Không thể reset mật khẩu tài khoản quản trị.");
        }
        user.setPassword(passwordEncoder.encode("12345678"));
        user.setRefreshToken(null);
        user.setUpdatedAt(LocalDateTime.now());
        userDatabasePort.save(user);
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
        user.setUpdatedAt(LocalDateTime.now());
        userDatabasePort.save(user);
    }
}
