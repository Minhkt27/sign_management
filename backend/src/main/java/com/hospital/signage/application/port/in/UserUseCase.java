package com.hospital.signage.application.port.in;

import com.hospital.signage.domain.model.User;
import org.springframework.data.domain.Page;

import java.util.List;

public interface UserUseCase {

    List<User> getAllUsers();

    Page<User> getUsersPage(int page, int size, String search);

    List<User> getTechnicians();

    User createUser(CreateUserCommand command);

    User updateUserRoleAndPermissions(Long userId, Long roleId, List<String> customPermissions);

    User setUserActive(Long id, boolean active);

    void changePassword(ChangePasswordCommand command);

    void resetPassword(Long userId);

    record CreateUserCommand(String username, String fullName, String password, Long roleId, List<String> customPermissions) {}

    record ChangePasswordCommand(Long userId, String currentPassword, String newPassword) {}
}
