package com.minimercado.backend.service.client;

import com.minimercado.backend.dto.client.ClientPostDTO;
import com.minimercado.backend.dto.client.ClientResponseDTO;
import com.minimercado.backend.mapper.ClientMapper;
import com.minimercado.backend.model.Client;
import com.minimercado.backend.repository.ClientRepository;
import jakarta.persistence.EntityNotFoundException;
import jakarta.persistence.criteria.Predicate;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

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
    public Page<ClientResponseDTO> search(String query, Pageable pageable) {
        return clientRepository.findAll(buildSearchSpecification(query), pageable)
                .map(mapper::toResponse);
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

    private Specification<Client> buildSearchSpecification(String query) {
        String text = query == null ? "" : query.trim().toLowerCase();
        String digits = query == null ? "" : query.replaceAll("\\D", "");

        return (root, criteriaQuery, criteriaBuilder) -> {
            if (text.isBlank() && digits.isBlank()) {
                return criteriaBuilder.conjunction();
            }

            List<Predicate> predicates = new ArrayList<>();
            if (!text.isBlank()) {
                predicates.add(criteriaBuilder.like(
                        criteriaBuilder.lower(root.get("name")),
                        "%" + text + "%"
                ));
            }
            if (!digits.isBlank()) {
                predicates.add(criteriaBuilder.like(root.get("cpf"), "%" + digits + "%"));
            }
            return criteriaBuilder.or(predicates.toArray(new Predicate[0]));
        };
    }
}
