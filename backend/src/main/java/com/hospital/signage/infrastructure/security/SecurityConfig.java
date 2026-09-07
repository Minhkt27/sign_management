package com.hospital.signage.infrastructure.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;
    private final String allowedOriginsRaw;

    public SecurityConfig(
            JwtAuthenticationFilter jwtAuthFilter,
            @Value("${cors.allowed-origins}") String allowedOriginsRaw) {
        this.jwtAuthFilter = jwtAuthFilter;
        this.allowedOriginsRaw = allowedOriginsRaw;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/login", "/api/auth/refresh").permitAll()
                .requestMatchers("/uploads/**").permitAll()
                .requestMatchers("/actuator/health").permitAll()
                .requestMatchers("/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**").permitAll()
                .requestMatchers("/api/map/floors", "/api/map/floors/**").permitAll()
                .requestMatchers("/api/map/nodes/by-location/**").permitAll()
                .requestMatchers("/api/map/nodes/by-asset/**").permitAll()
                .requestMatchers("/api/map/wayfinding", "/api/map/wayfinding/v2").permitAll()
                .requestMatchers("/api/map/wayfinding/**").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/map/campus").permitAll()
                .requestMatchers("/api/assets/code/**").permitAll()
                .requestMatchers("/api/locations", "/api/locations/**").permitAll()
                .requestMatchers("/api/sign-types", "/api/sign-types/**").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/hospitals", "/api/hospitals/**").permitAll()
                .requestMatchers("/api/**").authenticated()
                .anyRequest().denyAll()
            )
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        // setAllowedOrigins (khớp chính xác) chứ không phải setAllowedOriginPatterns (cho phép
        // wildcard). Kèm allowCredentials(true), một pattern lỡ tay kiểu "https://*.vn" sẽ mở
        // cửa cho mọi subdomain — gồm cả subdomain do người khác kiểm soát.
        configuration.setAllowedOrigins(parseAllowedOrigins(allowedOriginsRaw));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "Cache-Control", "Accept", "X-Requested-With", "ngrok-skip-browser-warning"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    /**
     * Tách danh sách origin, bỏ khoảng trắng thừa và mục rỗng (dấu phẩy cuối chuỗi).
     *
     * <p>Từ chối ngay lúc khởi động nếu cấu hình có "*": kết hợp với allowCredentials(true)
     * thì Spring cũng sẽ ném lỗi, nhưng chỉ vào lúc request đầu tiên chạm CORS — nghĩa là
     * ứng dụng vẫn "khởi động thành công" rồi mới hỏng, khó lần ra nguyên nhân hơn nhiều.
     */
    private static java.util.List<String> parseAllowedOrigins(String raw) {
        java.util.List<String> origins = Arrays.stream(raw.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();

        if (origins.isEmpty()) {
            throw new IllegalStateException("CORS_ALLOWED_ORIGINS không được để trống.");
        }
        if (origins.contains("*")) {
            throw new IllegalStateException(
                    "CORS_ALLOWED_ORIGINS không được chứa '*' vì API dùng allowCredentials. "
                    + "Hãy liệt kê đúng các origin thật, ví dụ: https://signage.benhvien.vn");
        }
        return origins;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}
