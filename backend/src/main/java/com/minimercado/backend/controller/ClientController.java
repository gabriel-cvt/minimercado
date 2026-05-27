package com.minimercado.backend.controller;

import com.minimercado.backend.dto.client.ClientPostDTO;
import com.minimercado.backend.dto.client.ClientResponseDTO;
import com.minimercado.backend.service.client.ClientService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import static com.minimercado.backend.controller.ApiRoutes.*;

@RestController
@RequiredArgsConstructor
public class ClientController {

    private final ClientService clientService;

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
