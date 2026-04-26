package com.minimercado.backend.repository;

import com.minimercado.backend.model.Pedido;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PedidoRepository extends JpaRepository<Pedido, UUID> {
    List<Pedido> findByNomeContainingIgnoreCase(String nome);
}
