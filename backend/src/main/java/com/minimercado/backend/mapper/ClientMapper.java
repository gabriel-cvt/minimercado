package com.minimercado.backend.mapper;

import com.minimercado.backend.dto.client.ClientPostDTO;
import com.minimercado.backend.dto.client.ClientResponseDTO;
import com.minimercado.backend.model.Client;
import org.springframework.stereotype.Component;

@Component
public class ClientMapper {

    public ClientResponseDTO toResponse(Client client) {
        if (client == null) {
            return null;
        }

        return new ClientResponseDTO(
                client.getId(),
                client.getName(),
                client.getCpf(),
                client.getPhoneNumber(),
                client.getTeam()
        );
    }

    public Client toEntity(ClientPostDTO dto) {
        if (dto == null) {
            return null;
        }

        Client client = new Client();
        client.setName(dto.name());
        client.setCpf(dto.cpf());
        client.setPhoneNumber(dto.phoneNumber());
        client.setTeam(dto.team().trim());
        return client;
    }
}
