package com.hospital.signage.infrastructure.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

@Component
public class JwtTokenProvider {

    private final long jwtExpirationInMs;
    private final long refreshExpirationInMs;
    private final Key key;

    public JwtTokenProvider(
            @Value("${jwt.secret}") String jwtSecret,
            @Value("${jwt.expiration}") long jwtExpirationInMs,
            @Value("${jwt.refresh-expiration}") long refreshExpirationInMs) {
        this.jwtExpirationInMs = jwtExpirationInMs;
        this.refreshExpirationInMs = refreshExpirationInMs;
        this.key = Keys.hmacShaKeyFor(jwtSecret.getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }

    // Phân loại token. Thiếu claim này, refresh token (sống 7-30 ngày) dùng thẳng được
    // như access token qua header Authorization: tuy danh sách quyền rỗng nhưng vẫn vượt
    // được mọi endpoint chỉ yêu cầu "đã đăng nhập".
    public static final String CLAIM_TOKEN_TYPE = "typ";
    public static final String TOKEN_TYPE_ACCESS = "access";
    public static final String TOKEN_TYPE_REFRESH = "refresh";

    public String generateToken(String username, java.util.List<String> permissions, String uiMode, Long hospitalId) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("permissions", permissions);
        claims.put("uiMode", uiMode);
        claims.put("hospitalId", hospitalId);
        claims.put(CLAIM_TOKEN_TYPE, TOKEN_TYPE_ACCESS);
        return createToken(claims, username, jwtExpirationInMs);
    }

    public String generateRefreshToken(String username) {
        Map<String, Object> claims = new HashMap<>();
        claims.put(CLAIM_TOKEN_TYPE, TOKEN_TYPE_REFRESH);
        return createToken(claims, username, refreshExpirationInMs);
    }

    /**
     * Loại token, hoặc null với token phát hành trước khi thêm claim này.
     *
     * <p>Trả null nghĩa là "không rõ" chứ không phải "hợp lệ" — nơi gọi tự quyết định.
     * Xem {@link #isRefreshToken}/{@link #isAccessToken}.
     */
    public String extractTokenType(String token) {
        return extractAllClaims(token).get(CLAIM_TOKEN_TYPE, String.class);
    }

    /** true khi token ghi rõ là refresh token. */
    public boolean isRefreshToken(String token) {
        return TOKEN_TYPE_REFRESH.equals(extractTokenType(token));
    }

    /** true khi token ghi rõ là access token. */
    public boolean isAccessToken(String token) {
        return TOKEN_TYPE_ACCESS.equals(extractTokenType(token));
    }

    private String createToken(Map<String, Object> claims, String subject, long expirationMs) {
        return Jwts.builder()
                .setClaims(claims)
                .setSubject(subject)
                .setIssuedAt(new Date(System.currentTimeMillis()))
                .setExpiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    public String extractUsername(String token) {
        return extractClaim(token, c -> c.getSubject());
    }

    @SuppressWarnings("unchecked")
    public java.util.List<String> extractPermissions(String token) {
        return extractAllClaims(token).get("permissions", java.util.List.class);
    }

    public String extractUiMode(String token) {
        return extractAllClaims(token).get("uiMode", String.class);
    }

    public Long extractHospitalId(String token) {
        return extractAllClaims(token).get("hospitalId", Long.class);
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    public boolean validateToken(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        return (username.equals(userDetails.getUsername()) && !isTokenExpired(token));
    }

    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    public Date extractExpiration(String token) {
        return extractClaim(token, c -> c.getExpiration());
    }
}
