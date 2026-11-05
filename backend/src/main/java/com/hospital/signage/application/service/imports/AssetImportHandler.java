package com.hospital.signage.application.service.imports;

import com.hospital.signage.application.port.in.AssetUseCase;
import com.hospital.signage.application.port.in.LocationUseCase;
import com.hospital.signage.application.port.out.AssetDatabasePort;
import com.hospital.signage.application.port.out.LocationDatabasePort;
import com.hospital.signage.application.port.out.SignTypeDatabasePort;
import com.hospital.signage.domain.enums.AssetStatus;
import com.hospital.signage.domain.enums.Material;
import com.hospital.signage.domain.model.Asset;
import com.hospital.signage.domain.model.SignType;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.format.ResolverStyle;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Nhập biển báo. Vị trí (Tòa › Tầng › Khoa › Phòng) chưa có thì tạo luôn — xem trước sẽ đếm
 * riêng số vị trí sẽ tạo để người dùng phát hiện tên gõ sai. Mã biển (in trên QR) luôn do hệ
 * thống sinh, như khi tạo bằng tay. Biển trùng tên + vị trí với biển đã có thì bỏ qua, nên
 * nhập lại cùng một file không sinh bản trùng.
 */
@Component
@RequiredArgsConstructor
public class AssetImportHandler implements ImportHandler {

    static final String NAME = "Tên biển";
    static final String LOCATION_NOTE = "Mô tả vị trí";
    static final String SIGN_TYPE = "Loại biển";
    static final String MATERIAL = "Chất liệu";
    static final String SIZE = "Kích thước";
    static final String STATUS = "Trạng thái";
    static final String INSTALLED_AT = "Ngày lắp";
    static final String SUPPLIER = "Nhà cung cấp";

    private static final int MAX_TEXT = 255;
    private static final Map<String, AssetStatus> STATUS_LABELS = new LinkedHashMap<>();
    static {
        STATUS_LABELS.put("Hoạt động", AssetStatus.ACTIVE);
        STATUS_LABELS.put("Báo hỏng", AssetStatus.DAMAGED);
        STATUS_LABELS.put("Đang sửa", AssetStatus.REPAIRING);
        STATUS_LABELS.put("Đã thanh lý", AssetStatus.SCRAPPED);
    }
    // STRICT: mặc định Java "sửa" 31/02 thành 28/02 — ngày gõ nhầm sẽ âm thầm thành ngày khác.
    private static final List<DateTimeFormatter> DATE_FORMATS = List.of(
            DateTimeFormatter.ISO_LOCAL_DATE,
            DateTimeFormatter.ofPattern("d/M/uuuu").withResolverStyle(ResolverStyle.STRICT),
            DateTimeFormatter.ofPattern("d-M-uuuu").withResolverStyle(ResolverStyle.STRICT),
            DateTimeFormatter.ofPattern("d.M.uuuu").withResolverStyle(ResolverStyle.STRICT));

    private final AssetDatabasePort assetDatabasePort;
    private final AssetUseCase assetUseCase;
    private final LocationDatabasePort locationDatabasePort;
    private final LocationUseCase locationUseCase;
    private final SignTypeDatabasePort signTypeDatabasePort;

    @Override
    public String type() {
        return "assets";
    }

    @Override
    public String title() {
        return "Biển báo";
    }

    @Override
    public String requiredAuthority() {
        return "ASSET_MANAGE";
    }

    @Override
    public List<ImportColumn> columns(Long hospitalId) {
        List<String> signTypeNames = signTypeDatabasePort.findAllByHospital(hospitalId).stream()
                .map(SignType::getName).toList();
        List<ImportColumn> cols = new ArrayList<>();
        cols.add(ImportColumn.required(NAME, "Biển Phòng 101", "Tên hiển thị của biển."));
        cols.add(ImportColumn.optional("Tòa", "Tòa A", "Vị trí chưa có sẽ được tạo mới."));
        cols.add(ImportColumn.optional("Tầng", "Tầng 1", null));
        cols.add(ImportColumn.optional("Khoa", "Khoa Cấp Cứu", null));
        cols.add(ImportColumn.optional("Phòng", "Phòng 101", null));
        cols.add(ImportColumn.optional(LOCATION_NOTE, "Cạnh cửa ra vào", null));
        ImportColumn signType = ImportColumn.optional(SIGN_TYPE, signTypeNames.isEmpty() ? "" : signTypeNames.get(0),
                "Phải là loại biển đã có trong mục Quản lý Loại biển.");
        cols.add(signTypeNames.isEmpty() ? signType : signType.withAllowedValues(signTypeNames));
        cols.add(ImportColumn.required(MATERIAL, "MICA", null)
                .withAllowedValues(Arrays.stream(Material.values()).map(Enum::name).toList()));
        cols.add(ImportColumn.optional(SIZE, "30x60", null));
        cols.add(ImportColumn.optional(STATUS, "Hoạt động", "Để trống = Hoạt động.")
                .withAllowedValues(List.copyOf(STATUS_LABELS.keySet())));
        cols.add(ImportColumn.optional(INSTALLED_AT, "01/10/2026", "Ngày/tháng/năm."));
        cols.add(ImportColumn.optional(SUPPLIER, "Công ty ABC", null));
        return cols;
    }

    @Override
    public void plan(List<ImportRow> rows, Long hospitalId, ImportPlan plan) {
        LocationPlanner planner = new LocationPlanner(locationDatabasePort.findAllByHospital(hospitalId), hospitalId);
        boolean canCreateLocations = callerHas("MAP_MANAGE");

        Map<String, SignType> signTypes = new HashMap<>();
        for (SignType t : signTypeDatabasePort.findAllByHospital(hospitalId)) {
            signTypes.putIfAbsent(ImportText.key(t.getName()), t);
            if (t.getCode() != null) signTypes.putIfAbsent(ImportText.key(t.getCode()), t);
        }

        Map<String, Integer> seen = new HashMap<>();
        for (Asset a : assetDatabasePort.findAllByHospital(hospitalId)) {
            Long locationId = a.getLocation() != null ? a.getLocation().getId() : null;
            seen.putIfAbsent(ImportText.key(a.getName()) + "@" + locationId, 0);
        }

        for (ImportRow row : rows) {
            int n = row.rowNumber();
            List<String> errors = new ArrayList<>();

            String name = row.get(NAME);
            if (name == null) errors.add("Thiếu tên biển.");
            checkLength(row, errors, NAME, LOCATION_NOTE, SIZE, SUPPLIER);

            Material material = parseMaterial(row.get(MATERIAL), errors);
            AssetStatus status = parseStatus(row.get(STATUS), errors);
            Instant installedAt = parseDate(row.get(INSTALLED_AT), errors);

            SignType signType = null;
            String signTypeText = row.get(SIGN_TYPE);
            if (signTypeText != null) {
                signType = signTypes.get(ImportText.key(signTypeText));
                if (signType == null) {
                    errors.add("Loại biển \"" + signTypeText + "\" chưa có. Hãy tạo ở mục Quản lý Loại biển trước.");
                }
            }

            LocationPlanner.Node node = null;
            List<LocationPlanner.Node> newLocations = List.of();
            List<String> levels = LocationPlanner.levelsOf(row);
            if (levels != null && errors.isEmpty()) {
                LocationPlanner.Resolution r = planner.resolve(levels, n);
                if (r.error() != null) {
                    errors.add(r.error());
                } else {
                    node = r.node();
                    newLocations = r.created();
                    if (!newLocations.isEmpty() && !canCreateLocations) {
                        errors.add("Vị trí \"" + node.path() + "\" chưa có, và tài khoản của bạn không có quyền tạo vị trí.");
                    }
                }
            }

            if (!errors.isEmpty()) {
                plan.error(n, String.join(" ", errors));
                continue;
            }

            String where = node == null ? "chưa gắn vị trí" : node.path();
            String locationKey = node == null ? "null"
                    : node.existedBefore() ? String.valueOf(node.location().getId())
                    : "new" + System.identityHashCode(node);
            String dupKey = ImportText.key(name) + "@" + locationKey;
            Integer firstRow = seen.get(dupKey);
            if (firstRow != null) {
                plan.skip(n, firstRow == 0
                        ? "Đã có biển \"" + name + "\" tại " + where + "."
                        : "Trùng với dòng " + firstRow + ".");
                continue;
            }
            seen.put(dupKey, n);

            newLocations.forEach(l -> plan.count(LocationPlanner.typeLabel(l.type()) + " tạo mới"));
            plan.count("Biển báo tạo mới");
            plan.create(n, "Tạo biển \"" + name + "\" tại " + where
                    + (newLocations.isEmpty() ? "" : " (tạo mới " + newLocations.size() + " vị trí)"));

            LocationPlanner.Node target = node;
            Long signTypeId = signType != null ? signType.getId() : null;
            plan.addWriter(() -> {
                Asset asset = new Asset();
                asset.setHospitalId(hospitalId);
                asset.setName(name);
                asset.setLocationDescription(row.get(LOCATION_NOTE));
                asset.setSignTypeId(signTypeId);
                asset.setMaterial(material);
                asset.setSize(row.get(SIZE));
                asset.setStatus(status);
                asset.setInstalledAt(installedAt);
                asset.setSupplier(row.get(SUPPLIER));
                if (target != null) asset.setLocation(planner.ensureCreated(target, locationUseCase));
                assetUseCase.createAsset(asset);
            });
        }
    }

    private static void checkLength(ImportRow row, List<String> errors, String... headers) {
        for (String h : headers) {
            String v = row.get(h);
            if (v != null && v.length() > MAX_TEXT) errors.add("Cột \"" + h + "\" dài quá " + MAX_TEXT + " ký tự.");
        }
    }

    private static Material parseMaterial(String text, List<String> errors) {
        if (text == null) {
            errors.add("Thiếu chất liệu.");
            return null;
        }
        for (Material m : Material.values()) {
            if (m.name().equalsIgnoreCase(text)) return m;
        }
        errors.add("Chất liệu \"" + text + "\" không hợp lệ (chọn: "
                + String.join(", ", Arrays.stream(Material.values()).map(Enum::name).toList()) + ").");
        return null;
    }

    private static AssetStatus parseStatus(String text, List<String> errors) {
        if (text == null) return AssetStatus.ACTIVE;
        for (Map.Entry<String, AssetStatus> e : STATUS_LABELS.entrySet()) {
            if (ImportText.key(e.getKey()).equals(ImportText.key(text)) || e.getValue().name().equalsIgnoreCase(text)) {
                return e.getValue();
            }
        }
        errors.add("Trạng thái \"" + text + "\" không hợp lệ (chọn: " + String.join(", ", STATUS_LABELS.keySet()) + ").");
        return null;
    }

    private static Instant parseDate(String text, List<String> errors) {
        if (text == null) return null;
        for (DateTimeFormatter f : DATE_FORMATS) {
            try {
                return LocalDate.parse(text, f).atStartOfDay(ZoneOffset.UTC).toInstant();
            } catch (DateTimeParseException ignored) {
                // thử định dạng tiếp theo
            }
        }
        errors.add("Ngày lắp \"" + text + "\" không đúng định dạng ngày/tháng/năm.");
        return null;
    }

    private static boolean callerHas(String authority) {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getAuthorities().stream().anyMatch(a -> authority.equals(a.getAuthority()));
    }
}
