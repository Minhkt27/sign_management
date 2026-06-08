package com.hospital.signage.adapter.in.web;

import com.hospital.signage.application.port.in.SignTypeUseCase;
import com.hospital.signage.domain.model.SignType;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Loại biển báo")
@RestController
@RequestMapping("/api/sign-types")
@RequiredArgsConstructor
public class SignTypeController {

    private final SignTypeUseCase signTypeUseCase;

    @Operation(summary = "Danh sách tất cả loại biển")
    @GetMapping
    public ResponseEntity<List<SignType>> getAllSignTypes() {
        return ResponseEntity.ok(signTypeUseCase.getAllSignTypes());
    }

    @Operation(summary = "Danh sách loại biển (phân trang)")
    @GetMapping("/page")
    @PreAuthorize("hasAuthority('ASSET_MANAGE')")
    public ResponseEntity<PagedResponse<SignType>> getSignTypesPage(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "") String search) {
        var result = signTypeUseCase.getSignTypesPage(Math.max(0, page), Math.min(Math.max(1, size), 100), search);
        return ResponseEntity.ok(PagedResponse.from(result));
    }

    @Operation(summary = "Chi tiết loại biển theo ID")
    @GetMapping("/{id}")
    public ResponseEntity<SignType> getSignTypeById(@PathVariable Long id) {
        return signTypeUseCase.getSignTypeById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @Operation(summary = "Tạo loại biển mới")
    @PreAuthorize("hasAuthority('ASSET_MANAGE')")
    @PostMapping
    public ResponseEntity<SignType> createSignType(@Valid @RequestBody SignTypeRequest req) {
        SignType signType = SignType.builder()
                .code(req.code())
                .name(req.name())
                .description(req.description())
                .build();
        return ResponseEntity.ok(signTypeUseCase.createSignType(signType));
    }

    @Operation(summary = "Cập nhật loại biển")
    @PreAuthorize("hasAuthority('ASSET_MANAGE')")
    @PutMapping("/{id}")
    public ResponseEntity<SignType> updateSignType(@PathVariable Long id, @Valid @RequestBody SignTypeRequest req) {
        SignType signType = SignType.builder()
                .code(req.code())
                .name(req.name())
                .description(req.description())
                .build();
        return ResponseEntity.ok(signTypeUseCase.updateSignType(id, signType));
    }

    @Operation(summary = "Xóa loại biển")
    @PreAuthorize("hasAuthority('ASSET_MANAGE')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSignType(@PathVariable Long id) {
        signTypeUseCase.deleteSignType(id);
        return ResponseEntity.ok().build();
    }

    public record SignTypeRequest(
            @NotBlank @Size(max = 100) String code,
            @NotBlank @Size(max = 200) String name,
            @Size(max = 500) String description
    ) {}
}
