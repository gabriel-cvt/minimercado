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
        JsonNode tapioca = createProduct("""
                {
                  "name": "Tapioca",
                  "price": 10.00,
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
                        .content(orderPayload(productId, null, null)))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(orderPayload(productId, meatVariantId, null)))
                .andExpect(status().isConflict());

        JsonNode createdOrder = objectMapper.readTree(mockMvc.perform(post("/api/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(orderPayload(productId, chickenVariantId, "Sem molho")))
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
                        .content(updateOrderPayload(productId, chickenVariantId, 1)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].selectedVariantName").value("Frango"));

        mockMvc.perform(put("/api/orders/{id}", orderId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updateOrderPayload(productId, chickenVariantId, 2)))
                .andExpect(status().isConflict());
    }

    @Test
    void productNamedComboUsesOrdinaryProductFlow() throws Exception {
        JsonNode combo = createProduct("""
                {
                  "name": "Combo Hamburguer",
                  "price": 20.00
                }
                """);
        long comboId = combo.get("id").asLong();

        mockMvc.perform(get("/api/products/{id}", comboId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.icon").value("GENERAL"))
                .andExpect(jsonPath("$.urlImage").doesNotExist())
                .andExpect(jsonPath("$.hasVariants").value(false))
                .andExpect(jsonPath("$.variants.length()").value(0))
                .andExpect(jsonPath("$.productType").doesNotExist())
                .andExpect(jsonPath("$.comboComponents").doesNotExist());

        mockMvc.perform(post("/api/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(orderPayload(comboId, null, null)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.items[0].selectedVariantName").doesNotExist());

        mockMvc.perform(get("/api/products/{id}", comboId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.quantitySold").doesNotExist());
    }

    @Test
    void productCanAcceptMultipleSelectedVariants() throws Exception {
        JsonNode sandwich = createProduct("""
                {
                  "name": "Sanduiche",
                  "price": 15.00,
                  "hasVariants": true,
                  "variantType": "Adicional",
                  "variantSelectionRequired": true,
                  "variantSelectionMode": "MULTIPLE",
                  "variants": [
                    { "name": "Queijo", "available": true },
                    { "name": "Bacon", "available": true },
                    { "name": "Ovo", "available": true }
                  ]
                }
                """);
        long productId = sandwich.get("id").asLong();
        long cheeseVariantId = sandwich.get("variants").get(0).get("id").asLong();
        long baconVariantId = sandwich.get("variants").get(1).get("id").asLong();

        mockMvc.perform(post("/api/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "items": [{
                                    "productId": %d,
                                    "quantity": 1,
                                    "selectedVariantIds": [%d, %d]
                                  }],
                                  "paymentMethod": "PIX"
                                }
                                """.formatted(productId, cheeseVariantId, baconVariantId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.items[0].selectedVariantId").value(cheeseVariantId))
                .andExpect(jsonPath("$.items[0].selectedVariantName").value("Queijo, Bacon"))
                .andExpect(jsonPath("$.items[0].selectedVariantIds.length()").value(2))
                .andExpect(jsonPath("$.items[0].selectedVariantNames[0]").value("Queijo"))
                .andExpect(jsonPath("$.items[0].selectedVariantNames[1]").value("Bacon"));
    }

    @Test
    void productUsesLocalIconKeyInsteadOfRemoteImageUrl() throws Exception {
        JsonNode product = createProduct("""
                {
                  "name": "Suco",
                  "price": 7.00,
                  "icon": "DRINK"
                }
                """);
        long productId = product.get("id").asLong();

        mockMvc.perform(get("/api/products/{id}", productId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.icon").value("DRINK"))
                .andExpect(jsonPath("$.urlImage").doesNotExist());

        mockMvc.perform(put("/api/products/{id}", productId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "icon": "HOT_DRINK"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.icon").value("HOT_DRINK"))
                .andExpect(jsonPath("$.urlImage").doesNotExist());
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

    private String orderPayload(long productId, Long variantId, String observation) {
        String variant = variantId == null ? "" : ", \"selectedVariantId\": " + variantId;
        String note = observation == null ? "" : ", \"observation\": \"" + observation + "\"";
        return """
                {
                  "items": [{ "productId": %d, "quantity": 1%s }],
                  "paymentMethod": "PIX"%s
                }
                """.formatted(productId, variant, note);
    }

    private String updateOrderPayload(long productId, long variantId, int quantity) {
        return """
                {
                  "items": [{ "productId": %d, "quantity": %d, "selectedVariantId": %d }],
                  "paymentMethod": "PIX",
                  "observation": "Mantem sabor reservado"
                }
                """.formatted(productId, quantity, variantId);
    }
}
