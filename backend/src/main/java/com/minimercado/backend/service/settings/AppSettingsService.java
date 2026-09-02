package com.minimercado.backend.service.settings;

import com.minimercado.backend.dto.settings.AppSettingsResponseDTO;
import com.minimercado.backend.dto.settings.AppSettingsUpdateDTO;

public interface AppSettingsService {
    AppSettingsResponseDTO getPublicSettings();
    AppSettingsResponseDTO update(AppSettingsUpdateDTO data);
    AppSettingsResponseDTO reset();
}
