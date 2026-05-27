package com.minimercado.backend;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ProductDeletionIntegrationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void removalPreservesOrderHistoryAndBlocksNewUseOfArchivedProduct() throws Exception {
        String cpf = "06874245422";

        mockMvc.perform(post("/api/clients")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Cliente Produto Removido",
                                  "cpf": "%s",
                                  "phoneNumber": "85999999999"
                                }
                                """.formatted(cpf)))
                .andExpect(status().isCreated());

        JsonNode product = objectMapper.readTree(mockMvc.perform(post("/api/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Produto historico",
                                  "price": 12.50,
                                  "stockQuantity": 10
                                }
                                """))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString());
        long productId = product.get("id").asLong();

        String oneItemOrder = """
                {
                  "items": [{ "productId": %d, "quantity": 1 }],
                  "clienteCpf": "%s",
                  "paymentMethod": "PIX"
                }
                """.formatted(productId, cpf);
        JsonNode order = objectMapper.readTree(mockMvc.perform(post("/api/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(oneItemOrder))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString());
        long orderId = order.get("id").asLong();

        mockMvc.perform(put("/api/products/{id}", productId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Produto renomeado"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Produto renomeado"));

        mockMvc.perform(delete("/api/products/{id}", productId))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/products/{id}", productId))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/api/products"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(0));

        mockMvc.perform(get("/api/orders/{id}", orderId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].productName").value("Produto historico"));

        mockMvc.perform(post("/api/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(oneItemOrder))
                .andExpect(status().isConflict());

        mockMvc.perform(put("/api/orders/{id}", orderId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "items": [{ "productId": %d, "quantity": 2 }],
                                  "clienteCpf": "%s"
                                }
                                """.formatted(productId, cpf)))
                .andExpect(status().isConflict());

        mockMvc.perform(patch("/api/orders/{id}/cancel", orderId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"))
                .andExpect(jsonPath("$.items[0].productName").value("Produto historico"));
    }
}
