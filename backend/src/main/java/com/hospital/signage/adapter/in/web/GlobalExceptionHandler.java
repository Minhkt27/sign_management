package com.hospital.signage.adapter.in.web;

import com.hospital.signage.domain.exception.AccountInactiveException;
import com.hospital.signage.domain.exception.InvalidCredentialsException;
import com.hospital.signage.domain.exception.TicketNotFoundException;
import com.hospital.signage.domain.exception.TicketRejectionLimitExceededException;
import com.hospital.signage.domain.exception.UnauthorizedTicketUpdateException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.util.HashMap;
import java.util.Map;
import java.util.NoSuchElementException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleIllegalArgument(IllegalArgumentException ex) {
        return error(HttpStatus.BAD_REQUEST, "Bad Request", ex.getMessage());
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, String>> handleIllegalState(IllegalStateException ex) {
        return error(HttpStatus.CONFLICT, "Conflict", ex.getMessage());
    }

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<Map<String, String>> handleNotFound(NoSuchElementException ex) {
        return error(HttpStatus.NOT_FOUND, "Not Found", ex.getMessage());
    }

    @ExceptionHandler(InvalidCredentialsException.class)
    public ResponseEntity<Map<String, String>> handleInvalidCredentials(InvalidCredentialsException ex) {
        return error(HttpStatus.UNAUTHORIZED, "Unauthorized", ex.getMessage());
    }

    @ExceptionHandler(AccountInactiveException.class)
    public ResponseEntity<Map<String, String>> handleAccountInactive(AccountInactiveException ex) {
        return error(HttpStatus.FORBIDDEN, "Forbidden", ex.getMessage());
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, String>> handleAccessDenied(AccessDeniedException ex) {
        return error(HttpStatus.FORBIDDEN, "Forbidden", "Bạn không có quyền thực hiện thao tác này.");
    }

    @ExceptionHandler(TicketNotFoundException.class)
    public ResponseEntity<Map<String, String>> handleTicketNotFound(TicketNotFoundException ex) {
        return error(HttpStatus.NOT_FOUND, "Not Found", ex.getMessage());
    }

    @ExceptionHandler(TicketRejectionLimitExceededException.class)
    public ResponseEntity<Map<String, String>> handleTicketRejectionLimitExceeded(TicketRejectionLimitExceededException ex) {
        return error(HttpStatus.BAD_REQUEST, "Bad Request", ex.getMessage());
    }

    @ExceptionHandler(UnauthorizedTicketUpdateException.class)
    public ResponseEntity<Map<String, String>> handleUnauthorizedTicketUpdate(UnauthorizedTicketUpdateException ex) {
        return error(HttpStatus.FORBIDDEN, "Forbidden", ex.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> fieldErrors = new HashMap<>();
        for (FieldError fe : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.put(fe.getField(), fe.getDefaultMessage());
        }
        Map<String, Object> body = new HashMap<>();
        body.put("error", "Validation Failed");
        body.put("message", "Dữ liệu đầu vào không hợp lệ.");
        body.put("fieldErrors", fieldErrors);
        return ResponseEntity.badRequest().body(body);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, String>> handleDataIntegrity(DataIntegrityViolationException ex) {
        String cause = ex.getMostSpecificCause() != null ? ex.getMostSpecificCause().getMessage() : "";
        String message;
        if (cause.contains("check_no_self_loop")) {
            message = "Không thể nối một điểm với chính nó.";
        } else if (cause.contains("uq_map_edges")) {
            message = "Kết nối này đã tồn tại.";
        } else if (cause.contains("uq_map_floors")) {
            message = "Vị trí này đã có sơ đồ tầng.";
        } else if (cause.toLowerCase().contains("unique") || cause.toLowerCase().contains("duplicate")) {
            message = "Dữ liệu đã tồn tại, vui lòng kiểm tra lại (mã/tên bị trùng).";
        } else {
            message = "Không thể xóa hoặc thay đổi dữ liệu này do có các liên kết dữ liệu khác đang tham chiếu tới nó.";
        }
        return error(HttpStatus.CONFLICT, "Conflict", message);
    }

    @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
    public ResponseEntity<Map<String, String>> handleOptimisticLocking(ObjectOptimisticLockingFailureException ex) {
        return error(HttpStatus.CONFLICT, "Conflict",
                "Dữ liệu vừa được người khác cập nhật. Vui lòng tải lại và thử lại.");
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, String>> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        return error(HttpStatus.BAD_REQUEST, "Bad Request",
                "Tham số '" + ex.getName() + "' không đúng định dạng.");
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, String>> handleNotReadable(HttpMessageNotReadableException ex) {
        log.debug("Unreadable HTTP message", ex);
        return error(HttpStatus.BAD_REQUEST, "Bad Request", "Dữ liệu gửi lên không đúng định dạng hoặc thiếu trường bắt buộc.");
    }

    @ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, String>> handleMaxUploadSize(
            org.springframework.web.multipart.MaxUploadSizeExceededException ex) {
        return error(HttpStatus.PAYLOAD_TOO_LARGE, "Payload Too Large",
                "Kích thước tệp tải lên vượt quá giới hạn cho phép (Tối đa 10MB).");
    }

    @ExceptionHandler(org.springframework.web.multipart.support.MissingServletRequestPartException.class)
    public ResponseEntity<Map<String, String>> handleMissingPart(
            org.springframework.web.multipart.support.MissingServletRequestPartException ex) {
        return error(HttpStatus.BAD_REQUEST, "Bad Request",
                "Thiếu trường bắt buộc '" + ex.getRequestPartName() + "' trong request.");
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleGeneric(Exception ex) {
        log.error("Unhandled exception", ex);
        return error(HttpStatus.INTERNAL_SERVER_ERROR, "Internal Server Error",
                "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.");
    }

    private ResponseEntity<Map<String, String>> error(HttpStatus status, String error, String message) {
        Map<String, String> body = new HashMap<>();
        body.put("error", error);
        body.put("message", message);
        return ResponseEntity.status(status.value()).body(body);
    }
}
