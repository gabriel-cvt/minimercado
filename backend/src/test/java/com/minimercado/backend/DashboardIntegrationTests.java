package com.minimercado.backend;

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

    @AfterEach
    void removeCommittedScenarioData() {
        orderRepository.deleteAll();
        productRepository.deleteAll();
    }

    @Test
    void topProductsEndpointReturnsProductsInDescendingQuantityOrder() throws Exception {
        long smashBurgerId = createProduct("Smash burger", 18.90);
        long batataId = createProduct("Batata frita", 12.00);
        long canceladoId = createProduct("Produto cancelado", 7.00);

        createOrder(batataId, 2);
        createOrder(batataId, 1);
        createOrder(smashBurgerId, 5);
        long cancelledOrderId = createOrder(canceladoId, 20);

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

    private long createProduct(String name, double price) throws Exception {
        JsonNode product = objectMapper.readTree(mockMvc.perform(post("/api/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "%s",
                                  "price": %s
                                }
                                """.formatted(name, Double.toString(price))))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString());

        return product.get("id").asLong();
    }

    private long createOrder(long productId, int quantity) throws Exception {
        JsonNode order = objectMapper.readTree(mockMvc.perform(post("/api/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "items": [{ "productId": %d, "quantity": %d }],
                                  "paymentMethod": "PIX"
                                }
                                """.formatted(productId, quantity)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString());

        return order.get("id").asLong();
    }
}
