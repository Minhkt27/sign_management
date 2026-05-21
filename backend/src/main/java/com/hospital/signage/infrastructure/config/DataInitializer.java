package com.hospital.signage.infrastructure.config;

import com.hospital.signage.application.port.in.AssetUseCase;
import com.hospital.signage.application.port.in.LocationUseCase;
import com.hospital.signage.application.port.in.TicketUseCase;
import com.hospital.signage.application.port.out.UserDatabasePort;
import com.hospital.signage.domain.enums.*;
import com.hospital.signage.domain.model.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserDatabasePort userDatabasePort;
    private final LocationUseCase locationUseCase;
    private final AssetUseCase assetUseCase;
    private final TicketUseCase ticketUseCase;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin-initial-password}")
    private String adminInitialPassword;

    @Value("${app.tech-initial-password}")
    private String techInitialPassword;

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        // Only seed if there are no users in the database
        if (userDatabasePort.findByUsername("admin").isPresent()) {
            return;
        }

        // 1. Seed Users
        User admin = User.builder()
                .username("admin")
                .password(passwordEncoder.encode(adminInitialPassword))
                .fullName("Quản trị hệ thống")
                .role(Role.ADMIN)
                .isActive(true)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        admin = userDatabasePort.save(admin);

        User tech = User.builder()
                .username("tech")
                .password(passwordEncoder.encode(techInitialPassword))
                .fullName("Nguyễn Văn Kỹ Thuật")
                .role(Role.TECHNICAL)
                .isActive(true)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        tech = userDatabasePort.save(tech);

        // 2. Seed Locations
        // Building A
        Location buildingA = Location.builder()
                .locationCode("B_A")
                .name("Tòa nhà A")
                .description("Khu khám bệnh ngoại trú và cấp cứu")
                .type(LocationType.BUILDING)
                .build();
        buildingA = locationUseCase.createLocation(buildingA);

        // Building B
        Location buildingB = Location.builder()
                .locationCode("B_B")
                .name("Tòa nhà B")
                .description("Khu điều trị nội trú")
                .type(LocationType.BUILDING)
                .build();
        buildingB = locationUseCase.createLocation(buildingB);

        // Floor 1 (Building A)
        Location floor1A = Location.builder()
                .locationCode("B_A_F1")
                .name("Tầng 1")
                .parentId(buildingA.getId())
                .description("Khu sảnh đón tiếp và cấp cứu")
                .type(LocationType.FLOOR)
                .build();
        floor1A = locationUseCase.createLocation(floor1A);

        // Floor 2 (Building A)
        Location floor2A = Location.builder()
                .locationCode("B_A_F2")
                .name("Tầng 2")
                .parentId(buildingA.getId())
                .description("Khu các phòng khám chuyên khoa")
                .type(LocationType.FLOOR)
                .build();
        floor2A = locationUseCase.createLocation(floor2A);

        // Department 1 (Floor 1, Building A)
        Location deptEmergency = Location.builder()
                .locationCode("B_A_F1_D1")
                .name("Khoa Cấp cứu")
                .parentId(floor1A.getId())
                .description("Bộ phận cấp cứu tiếp nhận bệnh nhân")
                .type(LocationType.DEPARTMENT)
                .build();
        deptEmergency = locationUseCase.createLocation(deptEmergency);

        // Department 2 (Floor 2, Building A)
        Location deptOutpatient = Location.builder()
                .locationCode("B_A_F2_D2")
                .name("Khoa Khám bệnh")
                .parentId(floor2A.getId())
                .description("Khu khám bệnh ngoại trú")
                .type(LocationType.DEPARTMENT)
                .build();
        deptOutpatient = locationUseCase.createLocation(deptOutpatient);

        // Room 101 - Emergency Room (Department 1, Floor 1, Building A)
        Location room101 = Location.builder()
                .locationCode("B_A_F1_D1_R101")
                .name("Phòng Cấp cứu số 1")
                .parentId(deptEmergency.getId())
                .description("Phòng cấp cứu chính")
                .type(LocationType.ROOM)
                .build();
        room101 = locationUseCase.createLocation(room101);

        // Room 102 - X-Ray Room (Department 1, Floor 1, Building A)
        Location room102 = Location.builder()
                .locationCode("B_A_F1_D1_R102")
                .name("Phòng Chụp X-Quang")
                .parentId(deptEmergency.getId())
                .description("Khu chẩn đoán hình ảnh cấp cứu")
                .type(LocationType.ROOM)
                .build();
        room102 = locationUseCase.createLocation(room102);

        // 3. Seed Assets
        // LED sign at Emergency room
        Asset emergencyLed = Asset.builder()
                .id(UUID.randomUUID())
                .assetCode("LED-R101")
                .location(room101)
                .material(Material.LED)
                .size("120x80cm")
                .status(AssetStatus.ACTIVE)
                .installedAt(LocalDateTime.now().minusMonths(6))
                .supplier("Công ty Ánh Sáng Vina")
                .createdBy(admin.getId())
                .build();
        assetUseCase.createAsset(emergencyLed);

        // ALU sign at X-Ray room (damaged)
        Asset xrayAlu = Asset.builder()
                .id(UUID.randomUUID())
                .assetCode("ALU-R102")
                .location(room102)
                .material(Material.ALU)
                .size("80x40cm")
                .status(AssetStatus.DAMAGED)
                .installedAt(LocalDateTime.now().minusMonths(12))
                .supplier("Cơ sở cơ khí Thành Phát")
                .createdBy(admin.getId())
                .build();
        xrayAlu = assetUseCase.createAsset(xrayAlu);

        // MICA sign at Corridor Floor 1
        Asset corridorMica = Asset.builder()
                .id(UUID.randomUUID())
                .assetCode("MICA-F1")
                .location(floor1A)
                .material(Material.MICA)
                .size("200x50cm")
                .status(AssetStatus.ACTIVE)
                .installedAt(LocalDateTime.now().minusMonths(3))
                .supplier("Công ty Ánh Sáng Vina")
                .createdBy(admin.getId())
                .build();
        assetUseCase.createAsset(corridorMica);

        // 4. Seed Maintenance Tickets
        TicketUseCase.CreateTicketCommand ticketCmd = new TicketUseCase.CreateTicketCommand(
                xrayAlu.getId(),
                "Hỏng đèn nền led chữ bên trong biển số phòng X-Quang, nhấp nháy liên tục không đọc rõ phòng.",
                Priority.HIGH,
                admin
        );
        MaintenanceTicket ticket = ticketUseCase.createTicket(ticketCmd);
        
        // Auto assign this ticket to the technician for simulation
        ticketUseCase.assignTicket(ticket.getId(), tech.getId());
    }
}
