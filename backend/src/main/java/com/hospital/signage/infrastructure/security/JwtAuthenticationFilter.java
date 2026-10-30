package com.hospital.signage.infrastructure.security;

import com.hospital.signage.application.service.UserAuthorityService;
import com.hospital.signage.application.service.UserCacheService;
import com.hospital.signage.domain.model.User;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;
    private final UserCacheService userCacheService;
    private final UserAuthorityService userAuthorityService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String jwt = authHeader.substring(7);
        try {
            // Refresh token không được phép dùng như access token. Token cũ (phát hành trước
            // khi có claim "typ") không ghi loại nên vẫn được chấp nhận ở đây — bỏ nhánh nới
            // lỏng này sau khi toàn bộ refresh token cũ đã hết hạn (tối đa JWT_REFRESH_EXPIRATION
            // kể từ lần deploy có thay đổi này).
            if (jwtTokenProvider.isRefreshToken(jwt)) {
                log.warn("Refresh token bị dùng như access token, từ chối — {}", request.getRemoteAddr());
                filterChain.doFilter(request, response);
                return;
            }

            String username = jwtTokenProvider.extractUsername(jwt);

            if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                User user = userCacheService.findByUsername(username).orElse(null);

                if (user == null) {
                    log.warn("JWT references unknown user '{}'", username);
                } else if (!user.getIsActive()) {
                    log.warn("JWT rejected — account '{}' is inactive", username);
                } else {
                    // Quyền lấy từ database (qua cache 5 phút), KHÔNG lấy từ claim trong token:
                    // token sống 1-8 tiếng, nếu tin claim thì hạ quyền một tài khoản phải đợi
                    // hết chừng đó thời gian mới có tác dụng. Claim trong token chỉ để frontend
                    // dựng giao diện.
                    java.util.List<String> permissions = userAuthorityService.resolvePermissions(user);

                    java.util.List<SimpleGrantedAuthority> authorities = permissions.stream()
                            .map(SimpleGrantedAuthority::new)
                            .collect(java.util.stream.Collectors.toList());

                    UserDetails userDetails = org.springframework.security.core.userdetails.User.builder()
                            .username(user.getUsername())
                            .password(user.getPassword())
                            .authorities(authorities)
                            .build();

                    if (jwtTokenProvider.validateToken(jwt, userDetails)) {
                        UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                                user, null, userDetails.getAuthorities());
                        authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        SecurityContextHolder.getContext().setAuthentication(authToken);
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Invalid JWT from {}: {}", request.getRemoteAddr(), e.getMessage());
        }

        filterChain.doFilter(request, response);
    }
}
