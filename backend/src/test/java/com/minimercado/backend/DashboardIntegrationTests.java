package com.minimercado.backend;

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

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class DashboardIntegrationTests {

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
    void topProductsEndpointReturnsProductsInDescendingQuantityOrder() throws Exception {
        String cpf = "12345678909";

        mockMvc.perform(post("/api/clients")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Cliente Dashboard",
                                  "cpf": "%s",
                                  "phoneNumber": "85999999999",
                                  "team": "Minimercado"
                                }
                                """.formatted(cpf)))
                .andExpect(status().isCreated());

        long smashBurgerId = createProduct("Smash burger", 18.90, 20);
        long batataId = createProduct("Batata frita", 12.00, 20);
        long canceladoId = createProduct("Produto cancelado", 7.00, 30);

        createOrder(cpf, batataId, 2);
        createOrder(cpf, batataId, 1);
        createOrder(cpf, smashBurgerId, 5);
        long cancelledOrderId = createOrder(cpf, canceladoId, 20);

        mockMvc.perform(patch("/api/orders/{id}/cancel", cancelledOrderId))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/dashboard/top-products"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].name").value("Smash burger"))
                .andExpect(jsonPath("$[0].quantitySold").value(5))
                .andExpect(jsonPath("$[1].name").value("Batata frita"))
                .andExpect(jsonPath("$[1].quantitySold").value(3))
                .andExpect(jsonPath("$[*].name", not(hasItem("Produto cancelado"))));
    }

    private long createProduct(String name, double price, int stockQuantity) throws Exception {
        JsonNode product = objectMapper.readTree(mockMvc.perform(post("/api/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "%s",
                                  "price": %s,
                                  "stockQuantity": %d
                                }
                                """.formatted(name, Double.toString(price), stockQuantity)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString());

        return product.get("id").asLong();
    }

    private long createOrder(String cpf, long productId, int quantity) throws Exception {
        JsonNode order = objectMapper.readTree(mockMvc.perform(post("/api/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "items": [{ "productId": %d, "quantity": %d }],
                                  "clienteCpf": "%s",
                                  "paymentMethod": "PIX"
                                }
                                """.formatted(productId, quantity, cpf)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString());

        return order.get("id").asLong();
    }
}
