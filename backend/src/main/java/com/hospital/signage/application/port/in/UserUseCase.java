package com.hospital.signage.application.port.in;

import com.hospital.signage.domain.model.User;

import java.util.List;

public interface UserUseCase {

    List<User> getAllUsers();

    List<User> getTechnicians();

    User createTechnician(CreateTechnicianCommand command);

    User setUserActive(Long id, boolean active);

    void changePassword(ChangePasswordCommand command);

    record CreateTechnicianCommand(String username, String fullName, String password) {}

    record ChangePasswordCommand(Long userId, String currentPassword, String newPassword) {}
}
