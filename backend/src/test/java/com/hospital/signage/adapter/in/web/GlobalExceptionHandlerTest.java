package com.hospital.signage.adapter.in.web;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {

    // Bot dò /.env, /wp-login.php... trước đây ra 500 kèm log ERROR.
    @Test
    void duongDanKhongTonTai_tra404ChuKhongPhai500() {
        var response = new GlobalExceptionHandler()
                .handleNoResource(new NoResourceFoundException(HttpMethod.GET, "/.env", ".env"));

        assertThat(response.getStatusCode().value()).isEqualTo(404);
        assertThat(response.getBody()).containsEntry("error", "Not Found");
    }
}
