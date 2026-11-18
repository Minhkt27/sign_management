package com.hospital.signage.application.service;

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class NaturalNameOrderTest {

    private static List<String> sort(String... names) {
        List<String> list = new ArrayList<>(Arrays.asList(names));
        list.sort(NaturalNameOrder.INSTANCE);
        return list;
    }

    @Test
    void soSoTheoGiaTri() {
        assertThat(sort("Tầng 10", "Tầng 2", "Tầng 1", "Tầng 4", "Tầng 3"))
                .containsExactly("Tầng 1", "Tầng 2", "Tầng 3", "Tầng 4", "Tầng 10");
    }

    @Test
    void chuTheoTiengViet_khongPhanBietHoaThuong() {
        assertThat(sort("Tòa Đ", "tòa b", "Tòa A", "Tòa C"))
                .containsExactly("Tòa A", "tòa b", "Tòa C", "Tòa Đ");
    }

    @Test
    void soO0DauVaSoDaiVanDung() {
        assertThat(sort("Phòng 010", "Phòng 9", "Phòng 12345678901234567890"))
                .containsExactly("Phòng 9", "Phòng 010", "Phòng 12345678901234567890");
    }

    @Test
    void tenTrongXepCuoi() {
        assertThat(sort("B", null, "A")).containsExactly("A", "B", null);
    }
}
