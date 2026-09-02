package com.minimercado.backend.dto.settings;

import java.time.Instant;

public record AppSettingsResponseDTO(
        String businessName,
        String shortName,
        String tagline,
        String description,
        String homeTitle,
        String homeDescription,
        String footerText,
        String panelTitle,
        String panelSubtitle,
        String primaryColor,
        String secondaryColor,
        String accentColor,
        String backgroundColor,
        String surfaceColor,
        String textColor,
        String mutedTextColor,
        String borderColor,
        String preparingColor,
        String readyColor,
        String destructiveColor,
        Integer borderRadius,
        String fontFamily,
        Instant updatedAt
) {
}
