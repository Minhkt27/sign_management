package com.hospital.signage.application.port.in;

import com.hospital.signage.domain.model.User;

public interface AuthUseCase {

    LoginResult login(LoginCommand command);

    RefreshResult refreshToken(String refreshToken);

    void logout(String username);

    record LoginCommand(String username, String password) {}

    record LoginResult(String token, String refreshToken, User user) {}

    record RefreshResult(String token, String refreshToken) {}
}
