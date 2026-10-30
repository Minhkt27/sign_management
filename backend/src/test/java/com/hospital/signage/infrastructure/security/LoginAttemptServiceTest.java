package com.hospital.signage.infrastructure.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class LoginAttemptServiceTest {

    private static final String IP = "203.0.113.10";
    private static final String OTHER_IP = "198.51.100.7";

    private LoginAttemptService service;

    @BeforeEach
    void setUp() {
        service = new LoginAttemptService();
    }

    @Test
    void blocksUsernameAfterFiveFailures() {
        for (int i = 0; i < 4; i++) {
            service.recordFailure("admin", IP);
        }
        assertThat(service.isBlocked("admin", IP)).isFalse();

        service.recordFailure("admin", IP);
        assertThat(service.isBlocked("admin", IP)).isTrue();
    }

    @Test
    void usernameLockFollowsTheAccountAcrossIps() {
        for (int i = 0; i < 5; i++) {
            service.recordFailure("admin", IP);
        }

        // Đổi IP không gỡ được khoá theo username — nếu không thì bộ đếm vô dụng với
        // kẻ tấn công có nhiều IP.
        assertThat(service.isBlocked("admin", OTHER_IP)).isTrue();
    }

    @Test
    void successResetsUsernameCounter() {
        for (int i = 0; i < 4; i++) {
            service.recordFailure("admin", IP);
        }
        service.recordSuccess("admin", IP);

        service.recordFailure("admin", IP);
        assertThat(service.isBlocked("admin", IP)).isFalse();
    }

    // Password spraying: mỗi tài khoản chỉ hỏng 1-2 lần nên bộ đếm username không bao giờ
    // chạm ngưỡng — chỉ bộ đếm theo IP nhìn thấy kiểu tấn công này.
    @Test
    void blocksIpAfterManyFailuresAcrossDifferentUsernames() {
        for (int i = 0; i < 20; i++) {
            service.recordFailure("user" + i, IP);
        }

        assertThat(service.isBlocked("hoan-toan-moi", IP)).isTrue();
        assertThat(service.isBlocked("hoan-toan-moi", OTHER_IP)).isFalse();
    }

    @Test
    void successDoesNotClearIpCounter() {
        for (int i = 0; i < 20; i++) {
            service.recordFailure("user" + i, IP);
        }
        service.recordSuccess("user5", IP);

        // Dò trúng một tài khoản không được phép xoá dấu vết spraying từ IP đó.
        assertThat(service.isBlocked("user99", IP)).isTrue();
    }

    @Test
    void usernameComparisonIsCaseInsensitive() {
        for (int i = 0; i < 5; i++) {
            service.recordFailure("Admin", IP);
        }

        assertThat(service.isBlocked("admin", IP)).isTrue();
        assertThat(service.isBlocked("ADMIN", IP)).isTrue();
    }

    @Test
    void nullClientIpIsTolerated() {
        for (int i = 0; i < 5; i++) {
            service.recordFailure("admin", null);
        }

        assertThat(service.isBlocked("admin", null)).isTrue();
        assertThat(service.isBlocked("nguoi-khac", null)).isFalse();
    }
}
