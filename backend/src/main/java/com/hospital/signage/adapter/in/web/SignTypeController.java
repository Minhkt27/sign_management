package com.hospital.signage.adapter.in.web;

import com.hospital.signage.application.port.in.SignTypeUseCase;
import com.hospital.signage.domain.model.SignType;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
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

    @GetMapping("/{id}")
    public ResponseEntity<SignType> getSignTypeById(@PathVariable Long id) {
        return signTypeUseCase.getSignTypeById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<SignType> createSignType(@RequestBody SignType signType) {
        return ResponseEntity.ok(signTypeUseCase.createSignType(signType));
    }

    @PutMapping("/{id}")
    public ResponseEntity<SignType> updateSignType(@PathVariable Long id, @RequestBody SignType signType) {
        return ResponseEntity.ok(signTypeUseCase.updateSignType(id, signType));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSignType(@PathVariable Long id) {
        signTypeUseCase.deleteSignType(id);
        return ResponseEntity.ok().build();
    }
}
