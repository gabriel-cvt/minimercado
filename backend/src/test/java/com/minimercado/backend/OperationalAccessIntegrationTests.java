package com.minimercado.backend;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = "app.admin-key=segredo-operacional")
class OperationalAccessIntegrationTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void keepsPublicReadsOpenAndProtectsOperationalRoutes() throws Exception {
        mockMvc.perform(get("/api/products")).andExpect(status().isOk());
        mockMvc.perform(get("/api/settings/public")).andExpect(status().isOk());
        mockMvc.perform(get("/api/orders/public").param("status", "PENDING"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/dashboard/summary")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/orders")).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Protegido\",\"price\":10}"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/auth/verify")
                        .header("X-Admin-Key", "segredo-operacional"))
                .andExpect(status().isOk());
    }
}
