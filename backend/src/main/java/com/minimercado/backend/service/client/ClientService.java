package com.minimercado.backend.service.client;

import com.minimercado.backend.dto.client.ClientPostDTO;
import com.minimercado.backend.dto.client.ClientResponseDTO;
import com.minimercado.backend.model.Client;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface ClientService {

    ClientResponseDTO create(ClientPostDTO data);
    Page<ClientResponseDTO> search(String query, Pageable pageable);
    ClientResponseDTO findByCpf(String cpf);

    Client findEntityByCpf(String cpf);
}
