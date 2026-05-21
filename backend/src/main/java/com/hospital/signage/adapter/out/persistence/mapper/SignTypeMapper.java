package com.hospital.signage.adapter.out.persistence.mapper;

import com.hospital.signage.adapter.out.persistence.entity.SignTypeEntity;
import com.hospital.signage.domain.model.SignType;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface SignTypeMapper {

    SignType toDomain(SignTypeEntity entity);

    SignTypeEntity toEntity(SignType domain);
}
