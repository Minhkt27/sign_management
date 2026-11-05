package com.hospital.signage.application.service.imports;

import com.hospital.signage.application.port.in.LocationUseCase;
import com.hospital.signage.application.port.out.LocationDatabasePort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

/** Nhập cây vị trí: mỗi dòng là một đường dẫn Tòa › Tầng › Khoa › Phòng. */
@Component
@RequiredArgsConstructor
public class LocationImportHandler implements ImportHandler {

    private final LocationDatabasePort locationDatabasePort;
    private final LocationUseCase locationUseCase;

    @Override
    public String type() {
        return "locations";
    }

    @Override
    public String title() {
        return "Vị trí";
    }

    @Override
    public String requiredAuthority() {
        return "MAP_MANAGE";
    }

    @Override
    public List<ImportColumn> columns(Long hospitalId) {
        return List.of(
                ImportColumn.required("Tòa", "Tòa A", "Tên tòa nhà."),
                ImportColumn.optional("Tầng", "Tầng 1", "Để trống nếu dòng này chỉ tạo tòa."),
                ImportColumn.optional("Khoa", "Khoa Cấp Cứu", "Để trống nếu dòng này chỉ tạo tới tầng."),
                ImportColumn.optional("Phòng", "Phòng 101", "Để trống nếu dòng này chỉ tạo tới khoa."));
    }

    @Override
    public void plan(List<ImportRow> rows, Long hospitalId, ImportPlan plan) {
        LocationPlanner planner = new LocationPlanner(locationDatabasePort.findAllByHospital(hospitalId), hospitalId);
        for (ImportRow row : rows) {
            List<String> levels = LocationPlanner.levelsOf(row);
            if (levels == null) {
                plan.error(row.rowNumber(), "Thiếu tên Tòa.");
                continue;
            }
            LocationPlanner.Resolution r = planner.resolve(levels, row.rowNumber());
            if (r.error() != null) {
                plan.error(row.rowNumber(), r.error());
            } else if (!r.created().isEmpty()) {
                r.created().forEach(n -> plan.count(LocationPlanner.typeLabel(n.type()) + " tạo mới"));
                plan.create(row.rowNumber(), "Tạo mới: " + r.node().path());
            } else if (r.node().existedBefore()) {
                plan.skip(row.rowNumber(), "Đã có: " + r.node().path());
            } else {
                plan.skip(row.rowNumber(), "Trùng với dòng " + r.node().firstRow() + ": " + r.node().path());
            }
        }
        plan.addWriter(() -> planner.planned().forEach(n -> planner.ensureCreated(n, locationUseCase)));
    }
}
