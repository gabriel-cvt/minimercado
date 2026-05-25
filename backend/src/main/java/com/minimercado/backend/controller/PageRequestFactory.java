package com.minimercado.backend.controller;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.util.Set;

final class PageRequestFactory {

    private PageRequestFactory() {
    }

    static Pageable create(int page, int size, String sort, Set<String> allowedSortFields) {
        String[] sortParts = sort.trim().split(",", -1);

        if (sortParts.length > 2 || sortParts[0].isBlank()) {
            throw new IllegalArgumentException("Ordenacao deve usar o formato campo,direcao");
        }

        String sortField = sortParts[0].trim();
        if (!allowedSortFields.contains(sortField)) {
            throw new IllegalArgumentException("Campo de ordenacao invalido: " + sortField);
        }

        Sort.Direction direction = Sort.Direction.ASC;
        if (sortParts.length == 2 && !sortParts[1].isBlank()) {
            try {
                direction = Sort.Direction.fromString(sortParts[1].trim());
            } catch (IllegalArgumentException exception) {
                throw new IllegalArgumentException("Direcao de ordenacao invalida. Use asc ou desc");
            }
        }

        return PageRequest.of(page, size, Sort.by(direction, sortField));
    }
}
