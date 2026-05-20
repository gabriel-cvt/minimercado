package com.minimercado.backend.service.client;

import com.minimercado.backend.dto.client.ClientPostDTO;
import com.minimercado.backend.dto.client.ClientResponseDTO;
import com.minimercado.backend.model.Client;

public interface ClientService {

    ClientResponseDTO create(ClientPostDTO data);
    ClientResponseDTO findByCpf(String cpf);

    Client findEntityByCpf(String cpf);
}
