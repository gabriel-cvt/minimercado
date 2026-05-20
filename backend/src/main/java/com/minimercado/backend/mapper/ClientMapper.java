package com.minimercado.backend.mapper;

import com.minimercado.backend.dto.client.ClientPostDTO;
import com.minimercado.backend.dto.client.ClientResponseDTO;
import com.minimercado.backend.model.Client;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface ClientMapper {

    ClientResponseDTO toResponse(Client client);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "orders", ignore = true)
    Client toEntity(ClientPostDTO dto);
}