ALTER TABLE app_settings
    DROP COLUMN IF EXISTS logo_content_type,
    DROP COLUMN IF EXISTS logo_data,
    DROP COLUMN IF EXISTS icon_content_type,
    DROP COLUMN IF EXISTS icon_data;
