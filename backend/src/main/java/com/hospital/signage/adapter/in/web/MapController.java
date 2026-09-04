package com.hospital.signage.adapter.in.web;

import com.hospital.signage.application.port.in.MapUseCase;
import com.hospital.signage.application.port.in.MapUseCase.MapFloorData;
import com.hospital.signage.domain.enums.NodeType;
import com.hospital.signage.domain.model.MapEdge;
import com.hospital.signage.domain.model.MapFloor;
import com.hospital.signage.domain.model.MapNode;
import com.hospital.signage.infrastructure.security.SecurityUtils;
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
    public ResponseEntity<List<MapFloor>> getAllFloors(@RequestParam(required = false) Long hospitalId) {
        return ResponseEntity.ok(mapUseCase.getAllFloors(SecurityUtils.resolveHospitalId(hospitalId)));
    }

    @Operation(summary = "Sơ đồ tầng theo ID (kèm nodes + edges)")
    @GetMapping("/floors/{id}")
    public ResponseEntity<MapFloorData> getFloorData(@PathVariable Long id) {
        return ResponseEntity.ok(mapUseCase.getFloorData(id, SecurityUtils.getCurrentHospitalId()));
    }

    @Operation(summary = "Lấy nhiều sơ đồ tầng theo danh sách ID (batch)")
    @GetMapping("/floors/batch")
    public ResponseEntity<List<MapFloorData>> getFloorDataBatch(@RequestParam List<Long> ids) {
        return ResponseEntity.ok(mapUseCase.getFloorDataBatch(ids, SecurityUtils.getCurrentHospitalId()));
    }

    @Operation(summary = "Sơ đồ tầng theo locationId")
    @GetMapping("/floors/by-location/{locationId}")
    public ResponseEntity<MapFloorData> getFloorByLocation(@PathVariable Long locationId) {
        return mapUseCase.getFloorByLocationId(locationId)
                .map(f -> ResponseEntity.ok(mapUseCase.getFloorData(f.getId(), SecurityUtils.getCurrentHospitalId())))
                .orElse(ResponseEntity.notFound().build());
    }

    @Operation(summary = "Tạo sơ đồ tầng mới")
    @PreAuthorize("hasAuthority('MAP_MANAGE')")
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
    @PreAuthorize("hasAuthority('MAP_MANAGE')")
    @PutMapping("/floors/{id}")
    public ResponseEntity<MapFloor> updateFloor(@PathVariable Long id, @Valid @RequestBody FloorRequest req) {
        MapFloor floor = MapFloor.builder()
                .imageUrl(req.imageUrl())
                .imgWidth(req.imgWidth())
                .imgHeight(req.imgHeight())
                .build();
        return ResponseEntity.ok(mapUseCase.updateFloor(id, floor, SecurityUtils.getCurrentHospitalId()));
    }

    @Operation(summary = "Xóa sơ đồ tầng")
    @PreAuthorize("hasAuthority('MAP_MANAGE')")
    @DeleteMapping("/floors/{id}")
    public ResponseEntity<Void> deleteFloor(@PathVariable Long id) {
        mapUseCase.deleteFloor(id, SecurityUtils.getCurrentHospitalId());
        return ResponseEntity.ok().build();
    }

    // ── Campus map ────────────────────────────────────────────────────────

    @Operation(summary = "Lấy sơ đồ tổng thể bệnh viện (public)")
    @GetMapping("/campus")
    public ResponseEntity<MapFloorData> getCampusMap(@RequestParam(required = false) Long hospitalId) {
        return mapUseCase.getCampusMap(SecurityUtils.resolveHospitalId(hospitalId))
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @Operation(summary = "Tạo sơ đồ tổng thể bệnh viện")
    @PreAuthorize("hasAuthority('MAP_MANAGE')")
    @PostMapping("/campus")
    public ResponseEntity<MapFloor> createCampusFloor(@Valid @RequestBody CampusFloorRequest req,
            @RequestParam(required = false) Long hospitalId) {
        MapFloor floor = MapFloor.builder()
                .imageUrl(req.imageUrl())
                .imgWidth(req.imgWidth())
                .imgHeight(req.imgHeight())
                .build();
        return ResponseEntity.ok(mapUseCase.createCampusFloor(floor, SecurityUtils.resolveAdminHospitalId(hospitalId)));
    }

    @Operation(summary = "Cập nhật ảnh sơ đồ tổng thể")
    @PreAuthorize("hasAuthority('MAP_MANAGE')")
    @PutMapping("/campus")
    public ResponseEntity<MapFloor> updateCampusFloor(@Valid @RequestBody CampusFloorRequest req,
            @RequestParam(required = false) Long hospitalId) {
        MapFloor floor = MapFloor.builder()
                .imageUrl(req.imageUrl())
                .imgWidth(req.imgWidth())
                .imgHeight(req.imgHeight())
                .build();
        return ResponseEntity.ok(mapUseCase.updateCampusFloor(floor, SecurityUtils.resolveAdminHospitalId(hospitalId)));
    }

    @Operation(summary = "Xóa sơ đồ tổng thể")
    @PreAuthorize("hasAuthority('MAP_MANAGE')")
    @DeleteMapping("/campus")
    public ResponseEntity<Void> deleteCampusFloor(@RequestParam(required = false) Long hospitalId) {
        mapUseCase.deleteCampusFloor(SecurityUtils.resolveAdminHospitalId(hospitalId));
        return ResponseEntity.ok().build();
    }

    // ── Node ───────────────────────────────────────────────────────────────

    @Operation(summary = "Thêm node lên sơ đồ")
    @PreAuthorize("hasAuthority('MAP_MANAGE')")
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
                .linkedCampusNodeId(req.linkedCampusNodeId())
                .build();
        return ResponseEntity.ok(mapUseCase.createNode(node, SecurityUtils.getCurrentHospitalId()));
    }

    @Operation(summary = "Cập nhật node")
    @PreAuthorize("hasAuthority('MAP_MANAGE')")
    @PutMapping("/nodes/{id}")
    public ResponseEntity<MapNode> updateNode(@PathVariable Long id, @Valid @RequestBody NodeUpdateRequest req) {
        MapNode node = MapNode.builder()
                .x(req.x())
                .y(req.y())
                .type(req.type())
                .label(req.label())
                .locationId(req.locationId())
                .assetId(req.assetId())
                .linkedCampusNodeId(req.linkedCampusNodeId())
                .build();
        return ResponseEntity.ok(mapUseCase.updateNode(id, node, SecurityUtils.getCurrentHospitalId()));
    }

    @Operation(summary = "Xóa node")
    @PreAuthorize("hasAuthority('MAP_MANAGE')")
    @DeleteMapping("/nodes/{id}")
    public ResponseEntity<Void> deleteNode(@PathVariable Long id) {
        mapUseCase.deleteNode(id, SecurityUtils.getCurrentHospitalId());
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "Lấy node theo assetId (ADMIN/TECHNICAL)")
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
    @PreAuthorize("hasAuthority('MAP_MANAGE')")
    @PostMapping("/edges")
    public ResponseEntity<MapEdge> createEdge(@Valid @RequestBody EdgeRequest req) {
        return ResponseEntity.ok(mapUseCase.createEdge(req.nodeFromId(), req.nodeToId()));
    }

    @Operation(summary = "Xóa edge")
    @PreAuthorize("hasAuthority('MAP_MANAGE')")
    @DeleteMapping("/edges/{id}")
    public ResponseEntity<Void> deleteEdge(@PathVariable Long id) {
        mapUseCase.deleteEdge(id, SecurityUtils.getCurrentHospitalId());
        return ResponseEntity.ok().build();
    }

    // ── Wayfinding ─────────────────────────────────────────────────────────

    @Operation(summary = "Tìm đường đến location (public — cho bệnh nhân)")
    @GetMapping("/wayfinding")
    public ResponseEntity<List<MapNode>> findPath(
            @RequestParam Long from,
            @RequestParam Long to,
            @RequestParam(defaultValue = "false") boolean avoidStairs,
            @RequestParam(required = false) Long hospitalId) {
        return ResponseEntity.ok(mapUseCase.findPath(from, to, avoidStairs, SecurityUtils.resolveHospitalId(hospitalId)));
    }

    @Operation(summary = "Tìm đường theo đoạn (hỗ trợ liên tòa — public)")
    @GetMapping("/wayfinding/v2")
    public ResponseEntity<MapUseCase.WayfindingResult> findPathSegmented(
            @RequestParam Long from,
            @RequestParam Long to,
            @RequestParam(defaultValue = "false") boolean avoidStairs,
            @RequestParam(required = false) Long hospitalId) {
        return ResponseEntity.ok(mapUseCase.findPathWithSegments(from, to, avoidStairs, SecurityUtils.resolveHospitalId(hospitalId)));
    }

    @Operation(summary = "Tìm đường đến asset (ADMIN/TECHNICAL — cho KTV)")
    @GetMapping("/wayfinding/asset")
    public ResponseEntity<List<MapNode>> findPathToAsset(
            @RequestParam Long from,
            @RequestParam UUID assetId,
            @RequestParam(defaultValue = "false") boolean avoidStairs) {
        MapNode target = mapUseCase.getNodeByAssetId(assetId)
                .orElse(null);
        if (target == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(mapUseCase.findPath(from, target.getId(), avoidStairs, SecurityUtils.getCurrentHospitalId()));
    }

    // ── Request records ────────────────────────────────────────────────────

    public record FloorRequest(
            @NotNull Long locationId,
            @NotNull String imageUrl,
            @NotNull Integer imgWidth,
            @NotNull Integer imgHeight
    ) {}

    public record CampusFloorRequest(
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
            UUID assetId,
            Long linkedCampusNodeId
    ) {}

    public record NodeUpdateRequest(
            Double x,
            Double y,
            @NotNull NodeType type,
            String label,
            Long locationId,
            UUID assetId,
            Long linkedCampusNodeId
    ) {}

    public record EdgeRequest(
            @NotNull Long nodeFromId,
            @NotNull Long nodeToId
    ) {}
}
