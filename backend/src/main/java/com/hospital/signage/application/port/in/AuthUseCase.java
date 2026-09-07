package com.hospital.signage.application.port.in;

import com.hospital.signage.domain.model.User;

public interface AuthUseCase {

    LoginResult login(LoginCommand command);

    RefreshResult refreshToken(String refreshToken);

    void logout(String username);

    /** clientIp dùng để đếm số lần thất bại theo IP (chống password spraying); có thể null. */
    record LoginCommand(String username, String password, String clientIp) {}

    record LoginResult(String token, String refreshToken, User user) {}

    record RefreshResult(String token, String refreshToken) {}
}
