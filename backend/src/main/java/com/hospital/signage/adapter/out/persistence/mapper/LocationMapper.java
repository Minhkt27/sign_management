package com.hospital.signage.adapter.out.persistence.mapper;

import com.hospital.signage.adapter.out.persistence.entity.LocationEntity;
import com.hospital.signage.domain.model.Location;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface LocationMapper {

    @Mapping(source = "parent.id", target = "parentId")
    Location toDomain(LocationEntity entity);

    @Mapping(target = "parent", expression = "java(domain.getParentId() != null ? com.hospital.signage.adapter.out.persistence.entity.LocationEntity.builder().id(domain.getParentId()).build() : null)")
    LocationEntity toEntity(Location domain);
}
