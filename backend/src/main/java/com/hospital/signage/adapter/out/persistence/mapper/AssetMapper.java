package com.hospital.signage.adapter.out.persistence.mapper;

import com.hospital.signage.adapter.out.persistence.entity.AssetEntity;
import com.hospital.signage.domain.model.Asset;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring", uses = {LocationMapper.class})
public interface AssetMapper {

    Asset toDomain(AssetEntity entity);

    AssetEntity toEntity(Asset domain);
}
