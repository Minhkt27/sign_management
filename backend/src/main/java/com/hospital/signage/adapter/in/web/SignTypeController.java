package com.hospital.signage.adapter.in.web;

import com.hospital.signage.application.port.in.SignTypeUseCase;
import com.hospital.signage.domain.model.SignType;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/sign-types")
@RequiredArgsConstructor
public class SignTypeController {

    private final SignTypeUseCase signTypeUseCase;

    @GetMapping
    public ResponseEntity<List<SignType>> getAllSignTypes() {
        return ResponseEntity.ok(signTypeUseCase.getAllSignTypes());
    }

    @GetMapping("/page")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PagedResponse<SignType>> getSignTypesPage(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "") String search) {
        var result = signTypeUseCase.getSignTypesPage(Math.max(0, page), Math.min(Math.max(1, size), 100), search);
        return ResponseEntity.ok(PagedResponse.from(result));
    }

    @GetMapping("/{id}")
    public ResponseEntity<SignType> getSignTypeById(@PathVariable Long id) {
        return signTypeUseCase.getSignTypeById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ResponseEntity<SignType> createSignType(@RequestBody SignType signType) {
        return ResponseEntity.ok(signTypeUseCase.createSignType(signType));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<SignType> updateSignType(@PathVariable Long id, @RequestBody SignType signType) {
        return ResponseEntity.ok(signTypeUseCase.updateSignType(id, signType));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSignType(@PathVariable Long id) {
        signTypeUseCase.deleteSignType(id);
        return ResponseEntity.ok().build();
    }
}
