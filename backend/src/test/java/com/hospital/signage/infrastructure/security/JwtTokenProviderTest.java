package com.hospital.signage.infrastructure.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

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

    // Token đúng định dạng bản cũ (jjwt 0.11: header {"alg":"HS256"}, hospitalId là số) phải
    // còn đọc được sau khi nâng thư viện — nếu không, mọi người dùng bị đăng xuất khi deploy.
    @Test
    void tokenPhatHanhTuBanCu_vanDocDuoc() throws Exception {
        String token = signHs256("{\"alg\":\"HS256\"}",
                "{\"permissions\":[\"ASSET_MANAGE\"],\"uiMode\":\"ADMIN\",\"hospitalId\":4,\"typ\":\"access\","
                        + "\"sub\":\"admin\",\"iat\":1763500000,\"exp\":4102444800}", SECRET);

        assertThat(provider.isAccessToken(token)).isTrue();
        assertThat(provider.extractUsername(token)).isEqualTo("admin");
        assertThat(provider.extractHospitalId(token)).isEqualTo(4L);
        assertThat(provider.extractPermissions(token)).containsExactly("ASSET_MANAGE");
    }

    @Test
    void tokenKyBangKhoaKhac_biTuChoi() throws Exception {
        String token = signHs256("{\"alg\":\"HS256\"}",
                "{\"sub\":\"admin\",\"typ\":\"access\",\"exp\":4102444800}",
                "another-secret-key-that-is-also-at-least-32-bytes");

        assertThatThrownBy(() -> provider.extractUsername(token))
                .isInstanceOf(io.jsonwebtoken.security.SignatureException.class);
    }

    @Test
    void tokenMoi_vanKyBangHs256() {
        String token = provider.generateToken("admin", List.of(), "ADMIN", 1L);
        String header = new String(Base64.getUrlDecoder().decode(token.substring(0, token.indexOf('.'))),
                StandardCharsets.UTF_8);

        assertThat(header).contains("\"alg\":\"HS256\"");
    }

    private static String signHs256(String headerJson, String payloadJson, String secret) throws Exception {
        Base64.Encoder enc = Base64.getUrlEncoder().withoutPadding();
        String unsigned = enc.encodeToString(headerJson.getBytes(StandardCharsets.UTF_8)) + "."
                + enc.encodeToString(payloadJson.getBytes(StandardCharsets.UTF_8));
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return unsigned + "." + enc.encodeToString(mac.doFinal(unsigned.getBytes(StandardCharsets.UTF_8)));
    }
}
