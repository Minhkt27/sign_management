package com.hospital.signage.domain.exception;

public class TicketRejectionLimitExceededException extends RuntimeException {
    public TicketRejectionLimitExceededException(String message) {
        super(message);
    }
}
