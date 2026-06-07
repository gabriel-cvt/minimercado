package com.minimercado.backend.controller;

import com.minimercado.backend.dto.client.ClientPostDTO;
import com.minimercado.backend.dto.client.ClientResponseDTO;
import com.minimercado.backend.service.client.ClientService;
import io.swagger.v3.oas.annotations.Parameter;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Set;

import static com.minimercado.backend.controller.ApiRoutes.*;

@RestController
@RequiredArgsConstructor
public class ClientController {

    private static final Set<String> CLIENT_SORT_FIELDS = Set.of("id", "name", "cpf", "team");

    private final ClientService clientService;

    @GetMapping(API_CLIENT)
    public ResponseEntity<Page<ClientResponseDTO>> search(
            @RequestParam(required = false) String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @Parameter(description = "Ordenacao no formato campo,direcao. Campos aceitos: id, name, cpf, team.", example = "name,asc")
            @RequestParam(defaultValue = "name,asc") String sort) {
        return ResponseEntity.ok(clientService.search(
                query,
                PageRequestFactory.create(page, size, sort, CLIENT_SORT_FIELDS)
        ));
    }

    @PostMapping(API_CLIENT)
    public ResponseEntity<ClientResponseDTO> create(@RequestBody @Valid ClientPostDTO data) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(clientService.create(data));
    }

    @GetMapping(API_CLIENT_GET_CLIENT_BY_CPF)
    public ResponseEntity<ClientResponseDTO> getByCpf(@PathVariable String cpf) {
        return ResponseEntity
                .ok()
                .body(clientService.findByCpf(cpf));
    }
}
