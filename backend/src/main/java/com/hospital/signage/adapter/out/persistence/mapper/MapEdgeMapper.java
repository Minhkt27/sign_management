package com.hospital.signage.adapter.out.persistence.mapper;

import com.hospital.signage.adapter.out.persistence.entity.MapEdgeEntity;
import com.hospital.signage.domain.model.MapEdge;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface MapEdgeMapper {
    MapEdge toDomain(MapEdgeEntity entity);
    MapEdgeEntity toEntity(MapEdge domain);
}
