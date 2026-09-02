package com.minimercado.backend.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class AdminApiFilter extends OncePerRequestFilter {

    private final SettingsAdminAuthorizer authorizer;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        String method = request.getMethod();
        if (!path.startsWith("/api/") || "OPTIONS".equals(method)) return true;
        if ("GET".equals(method)
                && ("/api/products".equals(path) || path.startsWith("/api/products/"))) return true;
        if ("POST".equals(method) && "/api/orders".equals(path)) return true;
        if ("GET".equals(method) && "/api/orders/public".equals(path)) return true;
        return "GET".equals(method) && "/api/settings/public".equals(path);
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        try {
            authorizer.authorize(request.getHeader("X-Admin-Key"));
            filterChain.doFilter(request, response);
        } catch (org.springframework.web.server.ResponseStatusException exception) {
            response.setStatus(exception.getStatusCode().value());
            response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
            response.getWriter().write("{\"title\":\"Acesso negado\",\"detail\":\"Chave operacional invalida\"}");
        }
    }
}
