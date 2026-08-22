package com.hospital.signage.adapter.out.persistence.mapper;

import com.hospital.signage.adapter.out.persistence.entity.MapFloorEntity;
import com.hospital.signage.domain.model.MapFloor;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface MapFloorMapper {
    MapFloor toDomain(MapFloorEntity entity);
    MapFloorEntity toEntity(MapFloor domain);
}
