package com.hospital.signage.integration;

import com.hospital.signage.adapter.out.persistence.entity.AssetEntity;
import com.hospital.signage.adapter.out.persistence.entity.HospitalEntity;
import com.hospital.signage.adapter.out.persistence.entity.LocationEntity;
import com.hospital.signage.adapter.out.persistence.entity.MaintenanceTicketEntity;
import com.hospital.signage.adapter.out.persistence.entity.MapEdgeEntity;
import com.hospital.signage.adapter.out.persistence.entity.MapFloorEntity;
import com.hospital.signage.adapter.out.persistence.entity.MapNodeEntity;
import com.hospital.signage.adapter.out.persistence.entity.SignTypeEntity;
import com.hospital.signage.adapter.out.persistence.entity.UserEntity;
import com.hospital.signage.adapter.out.persistence.repository.AssetRepository;
import com.hospital.signage.adapter.out.persistence.repository.HospitalRepository;
import com.hospital.signage.adapter.out.persistence.repository.LocationRepository;
import com.hospital.signage.adapter.out.persistence.repository.MapEdgeRepository;
import com.hospital.signage.adapter.out.persistence.repository.MapFloorRepository;
import com.hospital.signage.adapter.out.persistence.repository.MapNodeRepository;
import com.hospital.signage.adapter.out.persistence.repository.SignTypeRepository;
import com.hospital.signage.adapter.out.persistence.repository.TicketRepository;
import com.hospital.signage.adapter.out.persistence.repository.UserRepository;
import com.hospital.signage.domain.enums.*;
import com.hospital.signage.infrastructure.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Xác nhận một bệnh viện (tenant) không thể đọc/ghi dữ liệu của bệnh viện khác,
 * kể cả khi biết trước ID tài nguyên. Bao phủ 2 cơ chế cách ly hiện có trong code:
 * lọc theo hospitalId khi đọc (get-by-id, danh sách) và assertSameHospital khi ghi.
 */
@AutoConfigureMockMvc
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
public class TenantIsolationIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private JwtTokenProvider jwtTokenProvider;
    @Autowired
    private HospitalRepository hospitalRepository;
    @Autowired
    private LocationRepository locationRepository;
    @Autowired
    private AssetRepository assetRepository;
    @Autowired
    private TicketRepository ticketRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private SignTypeRepository signTypeRepository;
    @Autowired
    private MapFloorRepository mapFloorRepository;
    @Autowired
    private MapNodeRepository mapNodeRepository;
    @Autowired
    private MapEdgeRepository mapEdgeRepository;

    private static final List<String> ADMIN_AUTHORITIES = List.of(
            "ASSET_VIEW", "ASSET_MANAGE", "TICKET_VIEW", "TICKET_MANAGE", "USER_VIEW", "USER_MANAGE", "MAP_MANAGE");
    private static final List<String> SUPER_ADMIN_AUTHORITIES = List.of(
            "ASSET_VIEW", "ASSET_MANAGE", "TICKET_VIEW", "TICKET_MANAGE", "USER_VIEW", "USER_MANAGE", "HOSPITAL_MANAGE");

    private Long hospital2Id;
    private AssetEntity asset1;
    private AssetEntity asset2;
    private MaintenanceTicketEntity ticket1;
    private MaintenanceTicketEntity ticket2;
    private SignTypeEntity signType1;
    private SignTypeEntity signType2;
    private MapFloorEntity floor1;
    private MapFloorEntity floor2;
    private MapNodeEntity node1a;
    private MapNodeEntity node1b;
    private MapNodeEntity node2;
    private MapEdgeEntity edge1;
    private UserEntity admin1;
    private UserEntity admin2;
    private UserEntity superAdmin;
    private String admin1Token;
    private String admin2Token;
    private String superAdminToken;

    @BeforeEach
    void setup() {
        mapEdgeRepository.deleteAll();
        mapNodeRepository.deleteAll();
        mapFloorRepository.deleteAll();
        ticketRepository.deleteAll();
        assetRepository.deleteAll();
        signTypeRepository.deleteAll();
        locationRepository.deleteAll();
        userRepository.deleteAll();

        hospital2Id = hospitalRepository.save(HospitalEntity.builder()
                .name("Hospital B")
                .shortCode("HB-" + UUID.randomUUID())
                .gpsRadiusM(300)
                .active(true)
                .build()).getId();

        LocationEntity loc1 = locationRepository.save(LocationEntity.builder()
                .locationCode("LOC1-" + UUID.randomUUID())
                .name("Location Hospital 1")
                .hospitalId(1L)
                .type(LocationType.ROOM)
                .build());
        LocationEntity loc2 = locationRepository.save(LocationEntity.builder()
                .locationCode("LOC2-" + UUID.randomUUID())
                .name("Location Hospital 2")
                .hospitalId(hospital2Id)
                .type(LocationType.ROOM)
                .build());

        asset1 = assetRepository.save(AssetEntity.builder()
                .id(UUID.randomUUID())
                .assetCode("A1-" + UUID.randomUUID())
                .hospitalId(1L)
                .material(Material.LED)
                .status(AssetStatus.ACTIVE)
                .location(loc1)
                .build());
        asset2 = assetRepository.save(AssetEntity.builder()
                .id(UUID.randomUUID())
                .assetCode("A2-" + UUID.randomUUID())
                .hospitalId(hospital2Id)
                .material(Material.LED)
                .status(AssetStatus.ACTIVE)
                .location(loc2)
                .build());

        admin1 = userRepository.save(UserEntity.builder()
                .username("admin1_" + UUID.randomUUID())
                .password("hashed")
                .fullName("Admin Hospital 1")
                .roleId(1L)
                .hospitalId(1L)
                .isActive(true)
                .build());
        admin2 = userRepository.save(UserEntity.builder()
                .username("admin2_" + UUID.randomUUID())
                .password("hashed")
                .fullName("Admin Hospital 2")
                .roleId(1L)
                .hospitalId(hospital2Id)
                .isActive(true)
                .build());
        superAdmin = userRepository.save(UserEntity.builder()
                .username("super_" + UUID.randomUUID())
                .password("hashed")
                .fullName("Super Admin")
                .roleId(1L)
                .hospitalId(null)
                .isActive(true)
                .build());

        ticket1 = ticketRepository.save(MaintenanceTicketEntity.builder()
                .asset(asset1)
                .hospitalId(1L)
                .reporter(admin1)
                .priority(Priority.MEDIUM)
                .ticketStatus(TicketStatus.OPEN)
                .source(TicketSource.MANUAL)
                .rejectionCount(0)
                .build());
        ticket2 = ticketRepository.save(MaintenanceTicketEntity.builder()
                .asset(asset2)
                .hospitalId(hospital2Id)
                .reporter(admin2)
                .priority(Priority.MEDIUM)
                .ticketStatus(TicketStatus.OPEN)
                .source(TicketSource.MANUAL)
                .rejectionCount(0)
                .build());

        signType1 = signTypeRepository.save(SignTypeEntity.builder()
                .code("ST1-" + UUID.randomUUID())
                .name("Sign Type Hospital 1")
                .hospitalId(1L)
                .build());
        signType2 = signTypeRepository.save(SignTypeEntity.builder()
                .code("ST2-" + UUID.randomUUID())
                .name("Sign Type Hospital 2")
                .hospitalId(hospital2Id)
                .build());

        floor1 = mapFloorRepository.save(MapFloorEntity.builder()
                .hospitalId(1L)
                .locationId(loc1.getId())
                .imageUrl("floor1.png")
                .imgWidth(100)
                .imgHeight(100)
                .build());
        floor2 = mapFloorRepository.save(MapFloorEntity.builder()
                .hospitalId(hospital2Id)
                .locationId(loc2.getId())
                .imageUrl("floor2.png")
                .imgWidth(100)
                .imgHeight(100)
                .build());

        node1a = mapNodeRepository.save(MapNodeEntity.builder()
                .floorId(floor1.getId())
                .x(0).y(0)
                .type(NodeType.ROOM)
                .build());
        node1b = mapNodeRepository.save(MapNodeEntity.builder()
                .floorId(floor1.getId())
                .x(1).y(1)
                .type(NodeType.JUNCTION)
                .build());
        node2 = mapNodeRepository.save(MapNodeEntity.builder()
                .floorId(floor2.getId())
                .x(0).y(0)
                .type(NodeType.ROOM)
                .build());

        edge1 = mapEdgeRepository.save(MapEdgeEntity.builder()
                .nodeFromId(node1a.getId())
                .nodeToId(node1b.getId())
                .weight(1.0)
                .bidirectional(true)
                .build());

        admin1Token = jwtTokenProvider.generateToken(admin1.getUsername(), ADMIN_AUTHORITIES, "ADMIN", 1L);
        admin2Token = jwtTokenProvider.generateToken(admin2.getUsername(), ADMIN_AUTHORITIES, "ADMIN", hospital2Id);
        superAdminToken = jwtTokenProvider.generateToken(superAdmin.getUsername(), SUPER_ADMIN_AUTHORITIES, "ADMIN", null);
    }

    @Test
    void getAssetById_ownHospital_returnsAsset() throws Exception {
        mockMvc.perform(get("/api/assets/" + asset1.getId())
                        .header("Authorization", "Bearer " + admin1Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assetCode").value(asset1.getAssetCode()));
    }

    @Test
    void getAssetById_otherHospital_returns404() throws Exception {
        // admin1 biết được UUID của asset2 (vd. rò rỉ qua log/QR) nhưng không được xem dữ liệu.
        mockMvc.perform(get("/api/assets/" + asset2.getId())
                        .header("Authorization", "Bearer " + admin1Token))
                .andExpect(status().isNotFound());
    }

    @Test
    void getAssetById_superAdmin_canAccessAnyHospital() throws Exception {
        mockMvc.perform(get("/api/assets/" + asset2.getId())
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assetCode").value(asset2.getAssetCode()));
    }

    @Test
    void updateAsset_otherHospital_returns403() throws Exception {
        mockMvc.perform(put("/api/assets/" + asset2.getId())
                        .header("Authorization", "Bearer " + admin1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"material\":\"LED\",\"status\":\"ACTIVE\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void deleteAsset_otherHospital_returns403() throws Exception {
        mockMvc.perform(delete("/api/assets/" + asset2.getId())
                        .header("Authorization", "Bearer " + admin1Token))
                .andExpect(status().isForbidden());
    }

    @Test
    void listAssets_nonSuperAdmin_ignoresRequestedHospitalIdParam() throws Exception {
        // admin1 cố truyền hospitalId=2 trên query param để dò dữ liệu viện khác;
        // SecurityUtils.resolveAdminHospitalId phải ép về hospitalId thật của admin1.
        mockMvc.perform(get("/api/assets")
                        .param("hospitalId", hospital2Id.toString())
                        .param("size", "50")
                        .header("Authorization", "Bearer " + admin1Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[?(@.assetCode == '" + asset2.getAssetCode() + "')]").doesNotExist())
                .andExpect(jsonPath("$.content[?(@.assetCode == '" + asset1.getAssetCode() + "')]").exists());
    }

    @Test
    void getTicketById_ownHospital_returnsTicket() throws Exception {
        mockMvc.perform(get("/api/tickets/" + ticket1.getId())
                        .header("Authorization", "Bearer " + admin1Token))
                .andExpect(status().isOk());
    }

    @Test
    void getTicketById_otherHospital_returns404() throws Exception {
        mockMvc.perform(get("/api/tickets/" + ticket2.getId())
                        .header("Authorization", "Bearer " + admin1Token))
                .andExpect(status().isNotFound());
    }

    @Test
    void assignTicket_otherHospital_returns403() throws Exception {
        mockMvc.perform(put("/api/tickets/" + ticket2.getId() + "/assign")
                        .header("Authorization", "Bearer " + admin1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"assigneeId\":" + admin1.getId() + "}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void setUserActive_otherHospital_returns403() throws Exception {
        mockMvc.perform(put("/api/users/" + admin2.getId() + "/active")
                        .header("Authorization", "Bearer " + admin1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"active\":false}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void getLocationById_ownHospital_returnsLocation() throws Exception {
        mockMvc.perform(get("/api/locations/" + floor1.getLocationId())
                        .header("Authorization", "Bearer " + admin1Token))
                .andExpect(status().isOk());
    }

    @Test
    void getLocationById_otherHospital_returns404() throws Exception {
        mockMvc.perform(get("/api/locations/" + floor2.getLocationId())
                        .header("Authorization", "Bearer " + admin1Token))
                .andExpect(status().isNotFound());
    }

    @Test
    void getSignTypeById_ownHospital_returnsSignType() throws Exception {
        mockMvc.perform(get("/api/sign-types/" + signType1.getId())
                        .header("Authorization", "Bearer " + admin1Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(signType1.getCode()));
    }

    @Test
    void getSignTypeById_otherHospital_returns404() throws Exception {
        mockMvc.perform(get("/api/sign-types/" + signType2.getId())
                        .header("Authorization", "Bearer " + admin1Token))
                .andExpect(status().isNotFound());
    }

    @Test
    void getFloorData_otherHospital_returns400() throws Exception {
        // admin1 biết ID sơ đồ tầng của viện khác (ID là số nguyên tuần tự, dễ đoán).
        mockMvc.perform(get("/api/map/floors/" + floor2.getId())
                        .header("Authorization", "Bearer " + admin1Token))
                .andExpect(status().isBadRequest());
    }

    @Test
    void updateFloor_otherHospital_returns400() throws Exception {
        mockMvc.perform(put("/api/map/floors/" + floor2.getId())
                        .header("Authorization", "Bearer " + admin1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"locationId\":" + floor2.getLocationId()
                                + ",\"imageUrl\":\"hacked.png\",\"imgWidth\":100,\"imgHeight\":100}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void deleteFloor_otherHospital_returns400() throws Exception {
        mockMvc.perform(delete("/api/map/floors/" + floor2.getId())
                        .header("Authorization", "Bearer " + admin1Token))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createNode_otherHospitalFloor_returns400() throws Exception {
        // admin1 cố tạo node trên sơ đồ tầng thuộc viện khác.
        mockMvc.perform(post("/api/map/nodes")
                        .header("Authorization", "Bearer " + admin1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"floorId\":" + floor2.getId() + ",\"x\":0,\"y\":0,\"type\":\"ROOM\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void updateNode_otherHospital_returns404() throws Exception {
        mockMvc.perform(put("/api/map/nodes/" + node2.getId())
                        .header("Authorization", "Bearer " + admin1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"x\":5,\"y\":5,\"type\":\"ROOM\"}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void deleteNode_otherHospital_returns404() throws Exception {
        mockMvc.perform(delete("/api/map/nodes/" + node2.getId())
                        .header("Authorization", "Bearer " + admin1Token))
                .andExpect(status().isNotFound());
    }

    @Test
    void deleteEdge_otherHospital_returns404() throws Exception {
        // edge1 nối 2 node của viện 1; admin2 (viện khác) không được xoá.
        mockMvc.perform(delete("/api/map/edges/" + edge1.getId())
                        .header("Authorization", "Bearer " + admin2Token))
                .andExpect(status().isNotFound());
    }
}
