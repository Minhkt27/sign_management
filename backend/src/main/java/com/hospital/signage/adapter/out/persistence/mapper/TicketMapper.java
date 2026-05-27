package com.hospital.signage.adapter.out.persistence.mapper;

import com.hospital.signage.adapter.out.persistence.entity.MaintenanceTicketEntity;
import com.hospital.signage.domain.model.MaintenanceTicket;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring", uses = {AssetMapper.class, UserMapper.class})
public interface TicketMapper {

    MaintenanceTicket toDomain(MaintenanceTicketEntity entity);

    MaintenanceTicketEntity toEntity(MaintenanceTicket domain);
}
