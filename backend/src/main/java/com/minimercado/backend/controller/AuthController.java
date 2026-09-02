package com.minimercado.backend.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

import static com.minimercado.backend.controller.ApiRoutes.API_AUTH_VERIFY;

@RestController
public class AuthController {

    @GetMapping(API_AUTH_VERIFY)
    public Map<String, Boolean> verify() {
        return Map.of("authenticated", true);
    }
}
