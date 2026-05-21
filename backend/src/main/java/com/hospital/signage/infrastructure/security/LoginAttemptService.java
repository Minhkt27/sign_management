package com.hospital.signage.infrastructure.security;

import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class LoginAttemptService {

    private static final int MAX_ATTEMPTS = 5;
    private static final long LOCK_DURATION_SECONDS = 900; // 15 minutes

    private record AttemptRecord(int count, Instant windowStart) {}

    private final ConcurrentHashMap<String, AttemptRecord> attempts = new ConcurrentHashMap<>();

    public void recordSuccess(String username) {
        attempts.remove(username);
    }

    public void recordFailure(String username) {
        attempts.merge(
            username,
            new AttemptRecord(1, Instant.now()),
            (existing, fresh) -> isExpired(existing)
                ? new AttemptRecord(1, Instant.now())
                : new AttemptRecord(existing.count() + 1, existing.windowStart())
        );
    }

    public boolean isBlocked(String username) {
        AttemptRecord record = attempts.get(username);
        if (record == null) return false;
        if (isExpired(record)) {
            attempts.remove(username);
            return false;
        }
        return record.count() >= MAX_ATTEMPTS;
    }

    private boolean isExpired(AttemptRecord record) {
        return record.windowStart().plusSeconds(LOCK_DURATION_SECONDS).isBefore(Instant.now());
    }
}
