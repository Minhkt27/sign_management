package com.hospital.signage.adapter.in.web;

import org.springframework.data.domain.Page;

import java.util.List;

public record PagedResponse<T>(
        List<T> content,
        long totalElements,
        int totalPages,
        int page,
        int size
) {
    public static <T> PagedResponse<T> from(Page<T> p) {
        return new PagedResponse<>(p.getContent(), p.getTotalElements(), p.getTotalPages(), p.getNumber(), p.getSize());
    }
}
