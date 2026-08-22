package com.hospital.signage.adapter.out.persistence.mapper;

import com.hospital.signage.adapter.out.persistence.entity.HospitalEntity;
import com.hospital.signage.domain.model.Hospital;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface HospitalMapper {

    Hospital toDomain(HospitalEntity entity);

    HospitalEntity toEntity(Hospital domain);
}
