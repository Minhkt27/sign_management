package com.hospital.signage.domain.exception;

public class UnauthorizedTicketUpdateException extends RuntimeException {
    public UnauthorizedTicketUpdateException(String message) {
        super(message);
    }
}
