package com.hospital.signage.adapter.in.web;

import com.hospital.signage.application.port.in.MapUseCase;
import com.hospital.signage.application.port.in.MapUseCase.MapFloorData;
import com.hospital.signage.domain.enums.NodeType;
import com.hospital.signage.domain.model.MapEdge;
import com.hospital.signage.domain.model.MapFloor;
import com.hospital.signage.domain.model.MapNode;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Tag(name = "Sơ đồ & Wayfinding")
@RestController
@RequestMapping("/api/map")
@RequiredArgsConstructor
public class MapController {

    private final MapUseCase mapUseCase;

    // ── Floor ──────────────────────────────────────────────────────────────

    @Operation(summary = "Danh sách tất cả sơ đồ tầng")
    @GetMapping("/floors")
    public ResponseEntity<List<MapFloor>> getAllFloors() {
        return ResponseEntity.ok(mapUseCase.getAllFloors());
    }

    @Operation(summary = "Sơ đồ tầng theo ID (kèm nodes + edges)")
    @GetMapping("/floors/{id}")
    public ResponseEntity<MapFloorData> getFloorData(@PathVariable Long id) {
        return ResponseEntity.ok(mapUseCase.getFloorData(id));
    }

    @Operation(summary = "Sơ đồ tầng theo locationId")
    @GetMapping("/floors/by-location/{locationId}")
    public ResponseEntity<MapFloorData> getFloorByLocation(@PathVariable Long locationId) {
        return mapUseCase.getFloorByLocationId(locationId)
                .map(f -> ResponseEntity.ok(mapUseCase.getFloorData(f.getId())))
                .orElse(ResponseEntity.notFound().build());
    }

    @Operation(summary = "Tạo sơ đồ tầng mới")
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/floors")
    public ResponseEntity<MapFloor> createFloor(@Valid @RequestBody FloorRequest req) {
        MapFloor floor = MapFloor.builder()
                .locationId(req.locationId())
                .imageUrl(req.imageUrl())
                .imgWidth(req.imgWidth())
                .imgHeight(req.imgHeight())
                .build();
        return ResponseEntity.ok(mapUseCase.createFloor(floor));
    }

    @Operation(summary = "Cập nhật sơ đồ tầng")
    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/floors/{id}")
    public ResponseEntity<MapFloor> updateFloor(@PathVariable Long id, @Valid @RequestBody FloorRequest req) {
        MapFloor floor = MapFloor.builder()
                .imageUrl(req.imageUrl())
                .imgWidth(req.imgWidth())
                .imgHeight(req.imgHeight())
                .build();
        return ResponseEntity.ok(mapUseCase.updateFloor(id, floor));
    }

    @Operation(summary = "Xóa sơ đồ tầng")
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/floors/{id}")
    public ResponseEntity<Void> deleteFloor(@PathVariable Long id) {
        mapUseCase.deleteFloor(id);
        return ResponseEntity.ok().build();
    }

    // ── Node ───────────────────────────────────────────────────────────────

    @Operation(summary = "Thêm node lên sơ đồ")
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/nodes")
    public ResponseEntity<MapNode> createNode(@Valid @RequestBody NodeRequest req) {
        MapNode node = MapNode.builder()
                .floorId(req.floorId())
                .x(req.x())
                .y(req.y())
                .type(req.type())
                .label(req.label())
                .locationId(req.locationId())
                .assetId(req.assetId())
                .build();
        return ResponseEntity.ok(mapUseCase.createNode(node));
    }

    @Operation(summary = "Cập nhật node")
    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/nodes/{id}")
    public ResponseEntity<MapNode> updateNode(@PathVariable Long id, @Valid @RequestBody NodeUpdateRequest req) {
        MapNode node = MapNode.builder()
                .x(req.x())
                .y(req.y())
                .type(req.type())
                .label(req.label())
                .locationId(req.locationId())
                .assetId(req.assetId())
                .build();
        return ResponseEntity.ok(mapUseCase.updateNode(id, node));
    }

    @Operation(summary = "Xóa node")
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/nodes/{id}")
    public ResponseEntity<Void> deleteNode(@PathVariable Long id) {
        mapUseCase.deleteNode(id);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "Lấy node theo assetId (ADMIN/TECHNICAL)")
    @PreAuthorize("hasAnyRole('ADMIN','TECHNICAL')")
    @GetMapping("/nodes/by-asset/{assetId}")
    public ResponseEntity<MapNode> getNodeByAsset(@PathVariable UUID assetId) {
        return mapUseCase.getNodeByAssetId(assetId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @Operation(summary = "Lấy node theo locationId (public)")
    @GetMapping("/nodes/by-location/{locationId}")
    public ResponseEntity<MapNode> getNodeByLocation(@PathVariable Long locationId) {
        return mapUseCase.getNodeByLocationId(locationId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // ── Edge ───────────────────────────────────────────────────────────────

    @Operation(summary = "Nối 2 node")
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/edges")
    public ResponseEntity<MapEdge> createEdge(@Valid @RequestBody EdgeRequest req) {
        return ResponseEntity.ok(mapUseCase.createEdge(req.nodeFromId(), req.nodeToId()));
    }

    @Operation(summary = "Xóa edge")
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/edges/{id}")
    public ResponseEntity<Void> deleteEdge(@PathVariable Long id) {
        mapUseCase.deleteEdge(id);
        return ResponseEntity.ok().build();
    }

    // ── Wayfinding ─────────────────────────────────────────────────────────

    @Operation(summary = "Tìm đường đến location (public — cho bệnh nhân)")
    @GetMapping("/wayfinding")
    public ResponseEntity<List<MapNode>> findPath(
            @RequestParam Long from,
            @RequestParam Long to,
            @RequestParam(defaultValue = "false") boolean avoidStairs) {
        return ResponseEntity.ok(mapUseCase.findPath(from, to, avoidStairs));
    }

    @Operation(summary = "Tìm đường đến asset (ADMIN/TECHNICAL — cho KTV)")
    @PreAuthorize("hasAnyRole('ADMIN','TECHNICAL')")
    @GetMapping("/wayfinding/asset")
    public ResponseEntity<List<MapNode>> findPathToAsset(
            @RequestParam Long from,
            @RequestParam UUID assetId,
            @RequestParam(defaultValue = "false") boolean avoidStairs) {
        MapNode target = mapUseCase.getNodeByAssetId(assetId)
                .orElse(null);
        if (target == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(mapUseCase.findPath(from, target.getId(), avoidStairs));
    }

    // ── Request records ────────────────────────────────────────────────────

    public record FloorRequest(
            @NotNull Long locationId,
            @NotNull String imageUrl,
            @NotNull Integer imgWidth,
            @NotNull Integer imgHeight
    ) {}

    public record NodeRequest(
            @NotNull Long floorId,
            @NotNull Double x,
            @NotNull Double y,
            @NotNull NodeType type,
            String label,
            Long locationId,
            UUID assetId
    ) {}

    public record NodeUpdateRequest(
            @NotNull Double x,
            @NotNull Double y,
            @NotNull NodeType type,
            String label,
            Long locationId,
            UUID assetId
    ) {}

    public record EdgeRequest(
            @NotNull Long nodeFromId,
            @NotNull Long nodeToId
    ) {}
}
