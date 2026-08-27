package com.hospital.signage.application.port.in;

import com.hospital.signage.domain.model.User;
import org.springframework.data.domain.Page;

import java.util.List;

public interface UserUseCase {

    List<User> getAllUsers();

    Page<User> getUsersPage(int page, int size, String search, Long hospitalId);

    List<User> getTechnicians(Long hospitalId);

    User createUser(CreateUserCommand command);

    User updateUserRoleAndPermissions(Long userId, Long roleId, List<String> customPermissions);

    User setUserActive(Long id, boolean active);

    void changePassword(ChangePasswordCommand command);

    String resetPassword(Long userId);

    User updateUser(UpdateUserCommand command);

    void deleteUser(Long id);

    record CreateUserCommand(String username, String fullName, String password, Long roleId, String phone, List<String> customPermissions, Long hospitalId) {}

    record UpdateUserCommand(Long id, String fullName, String phone) {}

    record ChangePasswordCommand(Long userId, String currentPassword, String newPassword) {}
}
