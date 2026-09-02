CREATE TABLE IF NOT EXISTS app_settings (
    id BIGINT PRIMARY KEY,
    business_name VARCHAR(80) NOT NULL,
    short_name VARCHAR(12) NOT NULL,
    tagline VARCHAR(120) NOT NULL,
    description VARCHAR(240) NOT NULL,
    home_title VARCHAR(120) NOT NULL,
    home_description VARCHAR(300) NOT NULL,
    footer_text VARCHAR(160) NOT NULL,
    panel_title VARCHAR(120) NOT NULL,
    panel_subtitle VARCHAR(180) NOT NULL,
    primary_color VARCHAR(7) NOT NULL,
    secondary_color VARCHAR(7) NOT NULL,
    accent_color VARCHAR(7) NOT NULL,
    background_color VARCHAR(7) NOT NULL,
    surface_color VARCHAR(7) NOT NULL,
    text_color VARCHAR(7) NOT NULL,
    muted_text_color VARCHAR(7) NOT NULL,
    border_color VARCHAR(7) NOT NULL,
    preparing_color VARCHAR(7) NOT NULL,
    ready_color VARCHAR(7) NOT NULL,
    destructive_color VARCHAR(7) NOT NULL,
    border_radius INTEGER NOT NULL,
    font_family VARCHAR(30) NOT NULL,
    logo_content_type VARCHAR(80),
    logo_data BYTEA,
    icon_content_type VARCHAR(80),
    icon_data BYTEA,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

INSERT INTO app_settings (
    id, business_name, short_name, tagline, description, home_title, home_description,
    footer_text, panel_title, panel_subtitle, primary_color, secondary_color, accent_color,
    background_color, surface_color, text_color, muted_text_color, border_color,
    preparing_color, ready_color, destructive_color, border_radius, font_family, updated_at
) VALUES (
    1, 'Meu Estabelecimento', 'ME', 'Sistema de Pedidos',
    'Sistema para registrar pedidos, acompanhar a cozinha e organizar retiradas.',
    'Pedidos simples, operação organizada.',
    'Registre pedidos, acompanhe a cozinha e organize a retirada em um só lugar.',
    'Todos os direitos reservados.', 'Painel de Pedidos',
    'Veja quando seu pedido estiver pronto', '#B42318', '#F4B400', '#F7C948',
    '#FFFCF7', '#FFFFFF', '#251C19', '#73645F', '#E9E0DA', '#E7A900',
    '#27935C', '#C7352A', 14, 'system', CURRENT_TIMESTAMP
) ON CONFLICT (id) DO NOTHING;
