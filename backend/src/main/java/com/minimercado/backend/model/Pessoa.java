package com.minimercado.backend.model;

import jakarta.persistence.*;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "pessoas")
@NoArgsConstructor
public class Pessoa {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private String nome;

    @OneToMany(mappedBy = "pessoa", cascade = CascadeType.ALL)
    private List<Pedido> pedidos;

    public Pessoa(String nome){
        this.nome = nome;
        this.pedidos = new ArrayList<>();
    }
}
