package com.hospital.signage.infrastructure.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

@Configuration
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager manager = new CaffeineCacheManager();
        manager.registerCustomCache("users",
                Caffeine.newBuilder()
                        .expireAfterWrite(5, TimeUnit.MINUTES)
                        .maximumSize(500)
                        .build());
        // Vai trò được đọc ở MỌI request đã đăng nhập (để tính quyền hiệu lực), nên bắt buộc
        // phải cache. TTL 5 phút giống cache users: đó cũng là độ trễ tối đa của việc hạ quyền
        // khi cache không kịp bị evict (VD sửa vai trò trực tiếp dưới database).
        manager.registerCustomCache("roles",
                Caffeine.newBuilder()
                        .expireAfterWrite(5, TimeUnit.MINUTES)
                        .maximumSize(200)
                        .build());
        manager.registerCustomCache("mapGraph",
                Caffeine.newBuilder()
                        .maximumSize(200)
                        .build());
        manager.registerCustomCache("mapFloorGraph",
                Caffeine.newBuilder()
                        .maximumSize(500)
                        .build());
        manager.registerCustomCache("mapCampusGraph",
                Caffeine.newBuilder()
                        .maximumSize(200)
                        .build());
        manager.registerCustomCache("mapIndoorFullGraph",
                Caffeine.newBuilder()
                        .maximumSize(200)
                        .build());
        manager.registerCustomCache("mapFloorLocationMap",
                Caffeine.newBuilder()
                        .maximumSize(200)
                        .build());
        return manager;
    }
}
