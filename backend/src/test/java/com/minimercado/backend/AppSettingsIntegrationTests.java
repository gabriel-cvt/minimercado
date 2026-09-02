package com.minimercado.backend;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = "app.admin-key=segredo")
@Transactional
class AppSettingsIntegrationTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void exposesPublicSettingsAndProtectsUpdates() throws Exception {
        mockMvc.perform(get("/api/settings/public"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.businessName").value("Meu Estabelecimento"))
                .andExpect(jsonPath("$.shortName").value("ME"));

        mockMvc.perform(put("/api/settings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validSettingsJson()))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(put("/api/settings")
                        .header("X-Admin-Key", "segredo")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validSettingsJson()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.businessName").value("Loja Teste"))
                .andExpect(jsonPath("$.primaryColor").value("#123456"));
    }

    private String validSettingsJson() {
        return """
                {
                  "businessName": "Loja Teste",
                  "shortName": "LT",
                  "tagline": "Pedidos",
                  "description": "Descricao da loja",
                  "homeTitle": "Bem-vindo",
                  "homeDescription": "Descricao da pagina inicial",
                  "footerText": "Todos os direitos reservados.",
                  "panelTitle": "Painel de Pedidos",
                  "panelSubtitle": "Acompanhe seu pedido",
                  "primaryColor": "#123456",
                  "secondaryColor": "#F4B400",
                  "accentColor": "#F7C948",
                  "backgroundColor": "#FFFCF7",
                  "surfaceColor": "#FFFFFF",
                  "textColor": "#251C19",
                  "mutedTextColor": "#73645F",
                  "borderColor": "#E9E0DA",
                  "preparingColor": "#E7A900",
                  "readyColor": "#27935C",
                  "destructiveColor": "#C7352A",
                  "borderRadius": 14,
                  "fontFamily": "system"
                }
                """;
    }
}
