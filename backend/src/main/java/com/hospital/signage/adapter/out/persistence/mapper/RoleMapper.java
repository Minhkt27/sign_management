package com.hospital.signage.adapter.out.persistence.mapper;

import com.hospital.signage.adapter.out.persistence.entity.RoleEntity;
import com.hospital.signage.domain.model.Role;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface RoleMapper {
    Role toDomain(RoleEntity entity);
    RoleEntity toEntity(Role domain);
}
