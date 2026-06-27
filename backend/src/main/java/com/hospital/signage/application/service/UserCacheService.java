package com.hospital.signage.application.service;

import com.hospital.signage.application.port.out.UserDatabasePort;
import com.hospital.signage.domain.model.User;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserCacheService {

    private final UserDatabasePort userDatabasePort;

    @Cacheable(value = "users", key = "#username", unless = "#result == null")
    public Optional<User> findByUsername(String username) {
        return userDatabasePort.findByUsername(username);
    }

    @CacheEvict(value = "users", key = "#username")
    public void evict(String username) {
    }
}
