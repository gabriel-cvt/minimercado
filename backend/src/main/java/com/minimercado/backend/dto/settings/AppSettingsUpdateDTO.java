package com.minimercado.backend.dto.settings;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record AppSettingsUpdateDTO(
        @NotBlank @Size(max = 80) String businessName,
        @NotBlank @Size(max = 12) String shortName,
        @NotBlank @Size(max = 120) String tagline,
        @NotBlank @Size(max = 240) String description,
        @NotBlank @Size(max = 120) String homeTitle,
        @NotBlank @Size(max = 300) String homeDescription,
        @NotBlank @Size(max = 160) String footerText,
        @NotBlank @Size(max = 120) String panelTitle,
        @NotBlank @Size(max = 180) String panelSubtitle,
        @NotBlank @Pattern(regexp = "^#[0-9a-fA-F]{6}$") String primaryColor,
        @NotBlank @Pattern(regexp = "^#[0-9a-fA-F]{6}$") String secondaryColor,
        @NotBlank @Pattern(regexp = "^#[0-9a-fA-F]{6}$") String accentColor,
        @NotBlank @Pattern(regexp = "^#[0-9a-fA-F]{6}$") String backgroundColor,
        @NotBlank @Pattern(regexp = "^#[0-9a-fA-F]{6}$") String surfaceColor,
        @NotBlank @Pattern(regexp = "^#[0-9a-fA-F]{6}$") String textColor,
        @NotBlank @Pattern(regexp = "^#[0-9a-fA-F]{6}$") String mutedTextColor,
        @NotBlank @Pattern(regexp = "^#[0-9a-fA-F]{6}$") String borderColor,
        @NotBlank @Pattern(regexp = "^#[0-9a-fA-F]{6}$") String preparingColor,
        @NotBlank @Pattern(regexp = "^#[0-9a-fA-F]{6}$") String readyColor,
        @NotBlank @Pattern(regexp = "^#[0-9a-fA-F]{6}$") String destructiveColor,
        @NotNull @Min(4) @Max(24) Integer borderRadius,
        @NotBlank @Size(max = 30) String fontFamily
) {
}
