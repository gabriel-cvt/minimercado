package com.minimercado.backend.service.settings;

import com.minimercado.backend.dto.settings.AppSettingsResponseDTO;
import com.minimercado.backend.dto.settings.AppSettingsUpdateDTO;
import com.minimercado.backend.model.AppSettings;
import com.minimercado.backend.repository.AppSettingsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AppSettingsServiceImpl implements AppSettingsService {

    private static final Set<String> ALLOWED_FONTS = Set.of(
            "system", "serif", "rounded", "mono"
    );

    private final AppSettingsRepository repository;

    @Override
    @Transactional
    public AppSettingsResponseDTO getPublicSettings() {
        return toResponse(findOrCreate());
    }

    @Override
    @Transactional
    public AppSettingsResponseDTO update(AppSettingsUpdateDTO data) {
        if (!ALLOWED_FONTS.contains(data.fontFamily())) {
            throw new IllegalArgumentException("Fonte nao permitida");
        }
        validateTextContrast(data.textColor(), data.backgroundColor(), "texto principal");
        validateTextContrast(data.textColor(), data.surfaceColor(), "texto principal nos cartoes");
        validateTextContrast(data.mutedTextColor(), data.backgroundColor(), "texto secundario");
        AppSettings settings = findOrCreate();
        apply(settings, data);
        touch(settings);
        return toResponse(repository.save(settings));
    }

    @Override
    @Transactional
    public AppSettingsResponseDTO reset() {
        AppSettings current = findOrCreate();
        applyDefaults(current);
        touch(current);
        return toResponse(repository.save(current));
    }

    private AppSettings findOrCreate() {
        return repository.findById(AppSettings.SINGLETON_ID).orElseGet(() -> {
            AppSettings settings = new AppSettings();
            applyDefaults(settings);
            touch(settings);
            return repository.save(settings);
        });
    }

    private void apply(AppSettings settings, AppSettingsUpdateDTO data) {
        settings.setBusinessName(data.businessName().trim());
        settings.setShortName(data.shortName().trim());
        settings.setTagline(data.tagline().trim());
        settings.setDescription(data.description().trim());
        settings.setHomeTitle(data.homeTitle().trim());
        settings.setHomeDescription(data.homeDescription().trim());
        settings.setFooterText(data.footerText().trim());
        settings.setPanelTitle(data.panelTitle().trim());
        settings.setPanelSubtitle(data.panelSubtitle().trim());
        settings.setPrimaryColor(data.primaryColor().toUpperCase());
        settings.setSecondaryColor(data.secondaryColor().toUpperCase());
        settings.setAccentColor(data.accentColor().toUpperCase());
        settings.setBackgroundColor(data.backgroundColor().toUpperCase());
        settings.setSurfaceColor(data.surfaceColor().toUpperCase());
        settings.setTextColor(data.textColor().toUpperCase());
        settings.setMutedTextColor(data.mutedTextColor().toUpperCase());
        settings.setBorderColor(data.borderColor().toUpperCase());
        settings.setPreparingColor(data.preparingColor().toUpperCase());
        settings.setReadyColor(data.readyColor().toUpperCase());
        settings.setDestructiveColor(data.destructiveColor().toUpperCase());
        settings.setBorderRadius(data.borderRadius());
        settings.setFontFamily(data.fontFamily());
    }

    private void applyDefaults(AppSettings settings) {
        settings.setId(AppSettings.SINGLETON_ID);
        settings.setBusinessName("Meu Estabelecimento");
        settings.setShortName("ME");
        settings.setTagline("Sistema de Pedidos");
        settings.setDescription("Sistema para registrar pedidos, acompanhar a cozinha e organizar retiradas.");
        settings.setHomeTitle("Pedidos simples, operação organizada.");
        settings.setHomeDescription("Registre pedidos, acompanhe a cozinha e organize a retirada em um só lugar.");
        settings.setFooterText("Todos os direitos reservados.");
        settings.setPanelTitle("Painel de Pedidos");
        settings.setPanelSubtitle("Veja quando seu pedido estiver pronto");
        settings.setPrimaryColor("#B42318");
        settings.setSecondaryColor("#F4B400");
        settings.setAccentColor("#F7C948");
        settings.setBackgroundColor("#FFFCF7");
        settings.setSurfaceColor("#FFFFFF");
        settings.setTextColor("#251C19");
        settings.setMutedTextColor("#73645F");
        settings.setBorderColor("#E9E0DA");
        settings.setPreparingColor("#E7A900");
        settings.setReadyColor("#27935C");
        settings.setDestructiveColor("#C7352A");
        settings.setBorderRadius(14);
        settings.setFontFamily("system");
    }

    private void validateTextContrast(String foreground, String background, String label) {
        double contrast = contrastRatio(foreground, background);
        if (contrast < 4.5D) {
            throw new IllegalArgumentException("Contraste insuficiente para " + label + " (minimo 4.5:1)");
        }
    }

    private double contrastRatio(String first, String second) {
        double firstLuminance = luminance(first);
        double secondLuminance = luminance(second);
        double lighter = Math.max(firstLuminance, secondLuminance);
        double darker = Math.min(firstLuminance, secondLuminance);
        return (lighter + 0.05D) / (darker + 0.05D);
    }

    private double luminance(String hex) {
        double[] channels = {1, 3, 5};
        double[] linear = java.util.Arrays.stream(channels)
                .map(offset -> Integer.parseInt(hex.substring((int) offset, (int) offset + 2), 16) / 255D)
                .map(value -> value <= 0.03928D ? value / 12.92D : Math.pow((value + 0.055D) / 1.055D, 2.4D))
                .toArray();
        return 0.2126D * linear[0] + 0.7152D * linear[1] + 0.0722D * linear[2];
    }

    private void touch(AppSettings settings) {
        settings.setUpdatedAt(Instant.now());
    }

    private AppSettingsResponseDTO toResponse(AppSettings settings) {
        return new AppSettingsResponseDTO(
                settings.getBusinessName(), settings.getShortName(), settings.getTagline(),
                settings.getDescription(), settings.getHomeTitle(), settings.getHomeDescription(),
                settings.getFooterText(), settings.getPanelTitle(), settings.getPanelSubtitle(),
                settings.getPrimaryColor(), settings.getSecondaryColor(), settings.getAccentColor(),
                settings.getBackgroundColor(), settings.getSurfaceColor(), settings.getTextColor(),
                settings.getMutedTextColor(), settings.getBorderColor(), settings.getPreparingColor(),
                settings.getReadyColor(), settings.getDestructiveColor(), settings.getBorderRadius(),
                settings.getFontFamily(), settings.getUpdatedAt()
        );
    }
}
