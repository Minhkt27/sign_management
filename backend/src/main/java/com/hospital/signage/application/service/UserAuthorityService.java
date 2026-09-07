package com.hospital.signage.application.service;

import com.hospital.signage.application.port.out.RoleDatabasePort;
import com.hospital.signage.domain.enums.UiMode;
import com.hospital.signage.domain.model.Role;
import com.hospital.signage.domain.model.User;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * Nguồn sự thật duy nhất cho "user này có những quyền gì".
 *
 * <p>Dùng ở hai nơi và bắt buộc phải giống nhau:
 * <ul>
 *   <li>lúc phát JWT (để frontend biết mà dựng menu),</li>
 *   <li>lúc mỗi request đi qua filter (để backend quyết định cho phép hay không).</li>
 * </ul>
 *
 * <p>Backend cố tình KHÔNG tin danh sách quyền nằm trong token: quyền đọc lại từ database
 * mỗi request (qua cache 5 phút) nên việc hạ quyền một tài khoản có hiệu lực trong vòng
 * vài phút, thay vì phải đợi token hết hạn. Claim trong token chỉ còn phục vụ giao diện.
 */
@Service
@RequiredArgsConstructor
public class UserAuthorityService {

    private final RoleCacheService roleCacheService;

    /** Quyền hiệu lực = quyền của vai trò + quyền cấp riêng cho tài khoản. */
    public List<String> resolvePermissions(User user) {
        List<String> permissions = new ArrayList<>();
        Role role = findRole(user);
        if (role != null && role.getPermissions() != null) {
            permissions.addAll(role.getPermissions());
        }
        if (user.getCustomPermissions() != null) {
            permissions.addAll(user.getCustomPermissions());
        }
        return permissions;
    }

    public UiMode resolveUiMode(User user) {
        Role role = findRole(user);
        return role != null && role.getUiMode() != null ? role.getUiMode() : UiMode.ADMIN;
    }

    private Role findRole(User user) {
        if (user.getRoleId() == null) return null;
        return roleCacheService.findById(user.getRoleId()).orElse(null);
    }

    /**
     * Cache vai trò tách riêng thành bean khác vì {@code @Cacheable} chỉ có tác dụng khi
     * lời gọi đi qua proxy của Spring — gọi nội bộ trong cùng một class thì bị bỏ qua.
     */
    @Service
    @RequiredArgsConstructor
    public static class RoleCacheService {

        private final RoleDatabasePort roleDatabasePort;

        @Cacheable(value = "roles", key = "#roleId", unless = "#result == null")
        public java.util.Optional<Role> findById(Long roleId) {
            return roleDatabasePort.findById(roleId);
        }

        @CacheEvict(value = "roles", key = "#roleId")
        public void evict(Long roleId) {
        }

        @CacheEvict(value = "roles", allEntries = true)
        public void evictAll() {
        }
    }
}
