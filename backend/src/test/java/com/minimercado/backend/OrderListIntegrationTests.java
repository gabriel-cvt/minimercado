package com.minimercado.backend;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.AfterEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import com.minimercado.backend.repository.ClientRepository;
import com.minimercado.backend.repository.OrderRepository;
import com.minimercado.backend.repository.ProductRepository;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class OrderListIntegrationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ClientRepository clientRepository;

    @AfterEach
    void removeCommittedScenarioData() {
        orderRepository.deleteAll();
        productRepository.deleteAll();
        clientRepository.deleteAll();
    }

    @Test
    void pagedListsIncludeItemsWhenOpenInViewIsDisabled() throws Exception {
        String cpf = "39053344705";

        mockMvc.perform(post("/api/clients")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Cliente Painel",
                                  "cpf": "%s",
                                  "phoneNumber": "85999999999",
                                  "team": "Minimercado"
                                }
                                """.formatted(cpf)))
                .andExpect(status().isCreated());

        JsonNode product = objectMapper.readTree(mockMvc.perform(post("/api/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Pedido exibido no painel",
                                  "price": 9.50,
                                  "stockQuantity": 10
                                }
                                """))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString());

        mockMvc.perform(post("/api/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "items": [{ "productId": %d, "quantity": 1 }],
                                  "clienteCpf": "%s",
                                  "paymentMethod": "PIX"
                                }
                                """.formatted(product.get("id").asLong(), cpf)))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/orders")
                        .param("page", "0")
                        .param("size", "500")
                        .param("sort", "orderTime,asc")
                        .param("status", "PENDING")
                        .param("clientCpf", cpf))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].items[0].productName")
                        .value("Pedido exibido no painel"));

        mockMvc.perform(get("/api/orders/client/{cpf}", cpf)
                        .param("page", "0")
                        .param("size", "5")
                        .param("sort", "id,asc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].items[0].productName")
                        .value("Pedido exibido no painel"));
    }
}
