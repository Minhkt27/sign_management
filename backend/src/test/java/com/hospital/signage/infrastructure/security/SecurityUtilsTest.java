package com.hospital.signage.infrastructure.security;

import com.hospital.signage.domain.model.User;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SecurityUtilsTest {

    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
    }

    private static void login(Long hospitalId, String... authorities) {
        User user = new User();
        user.setId(1L);
        user.setUsername("u");
        user.setHospitalId(hospitalId);
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                user, null, Arrays.stream(authorities).map(SimpleGrantedAuthority::new).toList()));
    }

    // Lỗi gốc: SUPER_ADMIN đang chọn viện 2 tạo tòa nhà thì ra ở viện 1.
    @Test
    void superAdmin_taoDuLieu_dungVienDangChon() {
        login(null, "HOSPITAL_MANAGE");
        assertThat(SecurityUtils.requireTargetHospitalId(2L)).isEqualTo(2L);
    }

    @Test
    void superAdmin_chuaChonVien_biChan_khongRoiVeVienMacDinh() {
        login(null, "HOSPITAL_MANAGE");
        assertThatThrownBy(() -> SecurityUtils.requireTargetHospitalId(null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("chọn bệnh viện");
    }

    @Test
    void adminVien_luonDungVienCuaMinh_boQuaGiaTriGuiLen() {
        login(3L, "ASSET_MANAGE");
        assertThat(SecurityUtils.requireTargetHospitalId(2L)).isEqualTo(3L);
        assertThat(SecurityUtils.requireTargetHospitalId(null)).isEqualTo(3L);
    }
}
