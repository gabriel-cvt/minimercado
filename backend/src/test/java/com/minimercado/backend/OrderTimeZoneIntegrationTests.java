package com.minimercado.backend;

import com.minimercado.backend.config.TimeConfig;
import com.minimercado.backend.repository.ClientRepository;
import com.minimercado.backend.repository.OrderRepository;
import com.minimercado.backend.repository.ProductRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.time.LocalDateTime;
import java.util.TimeZone;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class OrderTimeZoneIntegrationTests {

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
    void orderTimeUsesBrasiliaTimezoneEvenWhenServerDefaultTimezoneIsUtc() throws Exception {
        TimeZone originalTimezone = TimeZone.getDefault();
        TimeZone.setDefault(TimeZone.getTimeZone("UTC"));

        try {
            String cpf = "88282776776";
            long productId = createProductAndClient(cpf);
            LocalDateTime beforeCreate = LocalDateTime.now(TimeConfig.BRASILIA_ZONE).minusSeconds(1);

            JsonNode order = objectMapper.readTree(mockMvc.perform(post("/api/orders")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {
                                      "items": [{ "productId": %d, "quantity": 1 }],
                                      "clienteCpf": "%s",
                                      "paymentMethod": "PIX"
                                    }
                                    """.formatted(productId, cpf)))
                    .andExpect(status().isCreated())
                    .andReturn()
                    .getResponse()
                    .getContentAsString());

            LocalDateTime afterCreate = LocalDateTime.now(TimeConfig.BRASILIA_ZONE).plusSeconds(1);
            LocalDateTime orderTime = LocalDateTime.parse(order.get("orderTime").asText());

            assertFalse(orderTime.isBefore(beforeCreate));
            assertFalse(orderTime.isAfter(afterCreate));
        } finally {
            TimeZone.setDefault(originalTimezone);
        }
    }

    private long createProductAndClient(String cpf) throws Exception {
        mockMvc.perform(post("/api/clients")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Cliente Horario",
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
                                  "name": "Produto horario",
                                  "price": 8.00,
                                  "stockQuantity": 10
                                }
                                """))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString());
        return product.get("id").asLong();
    }
}
