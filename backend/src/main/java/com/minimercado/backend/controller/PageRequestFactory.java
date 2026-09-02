package com.minimercado.backend.controller;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.util.Set;

final class PageRequestFactory {

    private static final int MAX_PAGE_SIZE = 200;

    private PageRequestFactory() {
    }

    static Pageable create(int page, int size, String sort, Set<String> allowedSortFields) {
        if (page < 0) throw new IllegalArgumentException("Pagina deve ser maior ou igual a zero");
        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw new IllegalArgumentException("Tamanho da pagina deve estar entre 1 e " + MAX_PAGE_SIZE);
        }
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
