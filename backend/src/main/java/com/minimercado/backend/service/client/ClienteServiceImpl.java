package com.minimercado.backend.service.client;

import com.minimercado.backend.dto.client.ClientPostDTO;
import com.minimercado.backend.dto.client.ClientResponseDTO;
import com.minimercado.backend.mapper.ClientMapper;
import com.minimercado.backend.model.Client;
import com.minimercado.backend.repository.ClientRepository;
import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ClienteServiceImpl implements ClientService{

    private final ClientRepository clientRepository;
    private final ClientMapper mapper;

    @Override
    @Transactional
    public ClientResponseDTO create(ClientPostDTO data) {
        Client client = mapper.toEntity(data);

        Client savedClient = clientRepository.save(client);

        return mapper.toResponse(savedClient);
    }

    @Override
    public ClientResponseDTO findByCpf(String cpf) {
        Client client = findEntityByCpf(cpf);
        return mapper.toResponse(client);
    }

    @Override
    public Client findEntityByCpf(String cpf) {
        return clientRepository.findByCpf(cpf)
                .orElseThrow(EntityNotFoundException::new);
    }
}
