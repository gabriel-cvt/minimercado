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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ProductVariantIntegrationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void requiredVariantMustBeAvailableAndIsStoredWithOrderObservation() throws Exception {
        createClient("11144477735");
        JsonNode tapioca = createProduct("""
                {
                  "name": "Tapioca",
                  "price": 10.00,
                  "stockQuantity": 8,
                  "hasVariants": true,
                  "variantType": "Recheio",
                  "variantSelectionRequired": true,
                  "variants": [
                    { "name": "Frango", "available": true },
                    { "name": "Carne", "available": false }
                  ]
                }
                """);
        long productId = tapioca.get("id").asLong();
        long chickenVariantId = tapioca.get("variants").get(0).get("id").asLong();
        long meatVariantId = tapioca.get("variants").get(1).get("id").asLong();

        mockMvc.perform(post("/api/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(orderPayload(productId, null, "11144477735", null)))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(orderPayload(productId, meatVariantId, "11144477735", null)))
                .andExpect(status().isConflict());

        JsonNode createdOrder = objectMapper.readTree(mockMvc.perform(post("/api/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(orderPayload(productId, chickenVariantId, "11144477735", "Sem molho")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.observation").value("Sem molho"))
                .andExpect(jsonPath("$.items[0].selectedVariantName").value("Frango"))
                .andExpect(jsonPath("$.items[0].unitPrice").value(10.0))
                .andReturn().getResponse().getContentAsString());

        mockMvc.perform(put("/api/products/{id}", productId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "hasVariants": true,
                                  "variantType": "Recheio",
                                  "variantSelectionRequired": true,
                                  "variants": [
                                    { "id": %d, "name": "Frango", "available": false },
                                    { "id": %d, "name": "Carne", "available": false }
                                  ]
                                }
                                """.formatted(chickenVariantId, meatVariantId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.variants[0].id").value(chickenVariantId))
                .andExpect(jsonPath("$.variants[0].available").value(false));

        long orderId = createdOrder.get("id").asLong();
        mockMvc.perform(put("/api/orders/{id}", orderId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updateOrderPayload(productId, chickenVariantId, 1, "11144477735")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].selectedVariantName").value("Frango"));

        mockMvc.perform(put("/api/orders/{id}", orderId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updateOrderPayload(productId, chickenVariantId, 2, "11144477735")))
                .andExpect(status().isConflict());
    }

    @Test
    void productNamedComboUsesOrdinaryProductFlow() throws Exception {
        createClient("52998224725");
        JsonNode combo = createProduct("""
                {
                  "name": "Combo Hamburguer",
                  "price": 20.00,
                  "stockQuantity": 3
                }
                """);
        long comboId = combo.get("id").asLong();

        mockMvc.perform(get("/api/products/{id}", comboId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hasVariants").value(false))
                .andExpect(jsonPath("$.variants.length()").value(0))
                .andExpect(jsonPath("$.productType").doesNotExist())
                .andExpect(jsonPath("$.comboComponents").doesNotExist());

        mockMvc.perform(post("/api/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(orderPayload(comboId, null, "52998224725", null)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.items[0].selectedVariantName").doesNotExist());

        mockMvc.perform(get("/api/products/{id}", comboId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stockQuantity").value(2));
    }

    private void createClient(String cpf) throws Exception {
        mockMvc.perform(post("/api/clients")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Cliente Variacao",
                                  "cpf": "%s",
                                  "phoneNumber": "85999999999"
                                }
                                """.formatted(cpf)))
                .andExpect(status().isCreated());
    }

    private JsonNode createProduct(String payload) throws Exception {
        return objectMapper.readTree(mockMvc.perform(post("/api/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString());
    }

    private String orderPayload(long productId, Long variantId, String cpf, String observation) {
        String variant = variantId == null ? "" : ", \"selectedVariantId\": " + variantId;
        String note = observation == null ? "" : ", \"observation\": \"" + observation + "\"";
        return """
                {
                  "items": [{ "productId": %d, "quantity": 1%s }],
                  "clienteCpf": "%s",
                  "paymentMethod": "PIX"%s
                }
                """.formatted(productId, variant, cpf, note);
    }

    private String updateOrderPayload(long productId, long variantId, int quantity, String cpf) {
        return """
                {
                  "items": [{ "productId": %d, "quantity": %d, "selectedVariantId": %d }],
                  "clienteCpf": "%s",
                  "observation": "Mantem sabor reservado"
                }
                """.formatted(productId, quantity, variantId, cpf);
    }
}
