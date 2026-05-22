package com.hospital.signage.application.port.in;

import com.hospital.signage.domain.model.User;

public interface UserUseCase {

    User createTechnician(CreateTechnicianCommand command);

    User setUserActive(Long id, boolean active);

    void changePassword(ChangePasswordCommand command);

    record CreateTechnicianCommand(String username, String fullName, String password) {}

    record ChangePasswordCommand(Long userId, String currentPassword, String newPassword) {}
}
