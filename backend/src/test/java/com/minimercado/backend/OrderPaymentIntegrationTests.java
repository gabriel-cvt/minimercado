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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class OrderPaymentIntegrationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void selectedPaymentMethodKeepsOrderEditableAndCancellableUntilPaymentConfirmation() throws Exception {
        long productId = createProduct();
        long orderId = createOrder(productId, "PIX");

        mockMvc.perform(get("/api/orders/{id}", orderId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paymentMethod").value("PIX"))
                .andExpect(jsonPath("$.paymentStatus").value("PENDING"))
                .andExpect(jsonPath("$.paidAt").doesNotExist());

        mockMvc.perform(put("/api/orders/{id}", orderId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "items": [{ "productId": %d, "quantity": 2 }],
                                  "paymentMethod": "PIX"
                                }
                                """.formatted(productId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paymentStatus").value("PENDING"))
                .andExpect(jsonPath("$.items[0].quantity").value(2));

        mockMvc.perform(patch("/api/orders/{id}/cancel", orderId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"))
                .andExpect(jsonPath("$.paymentStatus").value("CANCELLED"));
    }

    @Test
    void finishedOrderMayStayPendingAndBePaidAfterPickup() throws Exception {
        long productId = createProduct();
        long orderId = createOrder(productId, "DINHEIRO");

        mockMvc.perform(patch("/api/orders/{id}/ready", orderId))
                .andExpect(status().isOk());

        mockMvc.perform(patch("/api/orders/{id}/finish", orderId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("FINISHED"))
                .andExpect(jsonPath("$.paymentStatus").value("PENDING"))
                .andExpect(jsonPath("$.paidAt").doesNotExist());

        mockMvc.perform(get("/api/dashboard/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalOrders").value(1))
                .andExpect(jsonPath("$.pendingPayments").value(1))
                .andExpect(jsonPath("$.revenueToday").value(0.0))
                .andExpect(jsonPath("$.totalRevenue").value(0.0));

        mockMvc.perform(patch("/api/orders/{id}/pay", orderId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("FINISHED"))
                .andExpect(jsonPath("$.paymentMethod").value("DINHEIRO"))
                .andExpect(jsonPath("$.paymentStatus").value("PAID"))
                .andExpect(jsonPath("$.paidAt").exists());

        mockMvc.perform(get("/api/dashboard/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalOrders").value(1))
                .andExpect(jsonPath("$.pendingPayments").value(0))
                .andExpect(jsonPath("$.revenueToday").value(12.5))
                .andExpect(jsonPath("$.totalRevenue").value(12.5));
    }

    @Test
    void orderCanBeCreatedWithPendingPaymentMethodToConfirmLater() throws Exception {
        long productId = createProduct();

        JsonNode order = objectMapper.readTree(mockMvc.perform(post("/api/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "items": [{ "productId": %d, "quantity": 1 }],
                                  "customerName": "Cliente Fiado",
                                  "customerPhoneNumber": "85999999999",
                                  "customerTeam": "Minimercado"
                                }
                                """.formatted(productId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.paymentStatus").value("PENDING"))
                .andExpect(jsonPath("$.paymentMethod").doesNotExist())
                .andExpect(jsonPath("$.customerName").value("Cliente Fiado"))
                .andExpect(jsonPath("$.customerPhoneNumber").value("85999999999"))
                .andExpect(jsonPath("$.customerTeam").value("Minimercado"))
                .andExpect(jsonPath("$.paidAt").doesNotExist())
                .andReturn()
                .getResponse()
                .getContentAsString());

        mockMvc.perform(patch("/api/orders/{id}/pay", order.get("id").asLong())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "paymentMethod": "PIX"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paymentMethod").value("PIX"))
                .andExpect(jsonPath("$.paymentStatus").value("PAID"))
                .andExpect(jsonPath("$.paidAt").exists());
    }

    @Test
    void orderCanUseCardPaymentMethod() throws Exception {
        long productId = createProduct();
        long orderId = createOrder(productId, "CARTAO");

        mockMvc.perform(patch("/api/orders/{id}/pay", orderId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paymentMethod").value("CARTAO"))
                .andExpect(jsonPath("$.paymentStatus").value("PAID"));
    }

    @Test
    void orderCanConfirmImmediatePaymentInCreationTransaction() throws Exception {
        long productId = createProduct();

        mockMvc.perform(post("/api/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "items": [{ "productId": %d, "quantity": 1 }],
                                  "paymentMethod": "PIX",
                                  "confirmPayment": true
                                }
                                """.formatted(productId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.paymentStatus").value("PAID"))
                .andExpect(jsonPath("$.paymentMethod").value("PIX"))
                .andExpect(jsonPath("$.paidAt").exists());
    }

    private long createProduct() throws Exception {
        JsonNode product = objectMapper.readTree(mockMvc.perform(post("/api/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Produto pagamento",
                                  "price": 12.50
                                }
                                """))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString());
        return product.get("id").asLong();
    }

    private long createOrder(long productId, String paymentMethod) throws Exception {
        JsonNode order = objectMapper.readTree(mockMvc.perform(post("/api/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "items": [{ "productId": %d, "quantity": 1 }],
                                  "paymentMethod": "%s"
                                }
                                """.formatted(productId, paymentMethod)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.paymentStatus").value("PENDING"))
                .andExpect(jsonPath("$.paidAt").doesNotExist())
                .andReturn()
                .getResponse()
                .getContentAsString());
        return order.get("id").asLong();
    }
}
