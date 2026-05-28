package com.hospital.signage.adapter.out.persistence.mapper;

import com.hospital.signage.adapter.out.persistence.entity.MapNodeEntity;
import com.hospital.signage.domain.model.MapNode;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface MapNodeMapper {
    MapNode toDomain(MapNodeEntity entity);
    MapNodeEntity toEntity(MapNode domain);
}
