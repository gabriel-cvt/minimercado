package com.minimercado.backend.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI minimercadoOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Minimercado API")
                        .description("API para produtos, disponibilidade, pedidos e analytics do minimercado")
                        .version("v1"))
                .servers(List.of(new Server().url("/")));
    }
}
