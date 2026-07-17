package com.hospital.signage.domain.enums;

import java.util.Set;

public final class Permission {

    public static final Set<String> VALID = Set.of(
            "USER_VIEW", "USER_MANAGE",
            "ROLE_VIEW", "ROLE_MANAGE",
            "ASSET_VIEW", "ASSET_MANAGE",
            "TICKET_VIEW", "TICKET_MANAGE", "TICKET_CREATE",
            "MAP_VIEW", "MAP_MANAGE",
            "FILE_UPLOAD"
    );

    private Permission() {
    }
}
