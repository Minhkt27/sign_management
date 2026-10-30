package com.hospital.signage.infrastructure.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class JwtTokenProviderTest {

    // Khóa HS256 phải dài tối thiểu 256 bit, nếu không Keys.hmacShaKeyFor() ném lỗi.
    private static final String SECRET = "test-secret-key-must-be-at-least-32-bytes-long-for-hs256";

    private JwtTokenProvider provider;

    @BeforeEach
    void setUp() {
        provider = new JwtTokenProvider(SECRET, 3_600_000L, 604_800_000L);
    }

    @Test
    void accessToken_isMarkedAsAccess() {
        String token = provider.generateToken("admin", List.of("ASSET_MANAGE"), "ADMIN", 1L);

        assertThat(provider.isAccessToken(token)).isTrue();
        assertThat(provider.isRefreshToken(token)).isFalse();
        assertThat(provider.extractTokenType(token)).isEqualTo(JwtTokenProvider.TOKEN_TYPE_ACCESS);
    }

    @Test
    void refreshToken_isMarkedAsRefresh() {
        String token = provider.generateRefreshToken("admin");

        assertThat(provider.isRefreshToken(token)).isTrue();
        assertThat(provider.isAccessToken(token)).isFalse();
        assertThat(provider.extractTokenType(token)).isEqualTo(JwtTokenProvider.TOKEN_TYPE_REFRESH);
    }

    @Test
    void accessToken_keepsItsOtherClaims() {
        String token = provider.generateToken("admin", List.of("ASSET_MANAGE", "TICKET_VIEW"), "TECHNICIAN", 7L);

        assertThat(provider.extractUsername(token)).isEqualTo("admin");
        assertThat(provider.extractPermissions(token)).containsExactly("ASSET_MANAGE", "TICKET_VIEW");
        assertThat(provider.extractUiMode(token)).isEqualTo("TECHNICIAN");
        assertThat(provider.extractHospitalId(token)).isEqualTo(7L);
    }

    @Test
    void refreshToken_carriesNoPermissions() {
        String token = provider.generateRefreshToken("admin");

        assertThat(provider.extractUsername(token)).isEqualTo("admin");
        assertThat(provider.extractPermissions(token)).isNull();
    }
}
