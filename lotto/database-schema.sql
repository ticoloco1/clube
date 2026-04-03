-- ============================================
-- SCHEMA SQL - Sistema Tarô e Loterias
-- TrustBank / ZicoBank Integration
-- ============================================

-- Tabela de configurações do usuário
CREATE TABLE IF NOT EXISTS user_mystic_lottery_config (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Módulos místicos selecionados (JSON array)
    -- Ex: ["tarot", "numerology", "astrology", "runes"]
    selected_mystic_modules JSONB DEFAULT '["tarot", "numerology", "astrology"]'::jsonb,
    
    -- Loterias selecionadas (JSON array)
    -- Ex: ["mega-sena", "quina", "lotofacil", "powerball", "euromillions"]
    selected_lotteries JSONB DEFAULT '["mega-sena", "quina", "lotofacil", "powerball", "euromillions"]'::jsonb,
    
    -- Tipo de plano
    plan_type VARCHAR(50) DEFAULT 'basic',
    
    -- Custo adicional mensal (em R$)
    additional_cost DECIMAL(10,2) DEFAULT 0.00,
    
    -- Visibilidade no minisite
    mystic_enabled BOOLEAN DEFAULT true,
    lottery_enabled BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- Índices para performance
CREATE INDEX idx_user_mystic_lottery_user ON user_mystic_lottery_config(user_id);

-- ============================================
-- Histórico de Gerações de Loteria
-- ============================================

CREATE TABLE IF NOT EXISTS lottery_generation_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- ID do cliente final (quem solicitou os números)
    client_id INTEGER,
    client_email VARCHAR(255),
    client_name VARCHAR(255),
    
    -- Informações da loteria
    lottery_id VARCHAR(50) NOT NULL,
    lottery_name VARCHAR(100),
    
    -- Modo de IA usado
    ai_mode VARCHAR(20) DEFAULT 'normal', -- 'normal' ou 'premium'
    
    -- Quantidade de jogos gerados
    quantity INTEGER DEFAULT 1,
    
    -- Jogos gerados (JSON)
    -- Ex: [{"numbers": [1,2,3,4,5,6], "bonus": 10, "confidence": 85, "analysis": {...}}]
    games JSONB,
    
    -- Custo da geração
    cost DECIMAL(10,2) DEFAULT 0.00,
    
    -- Metadados
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Índices
    INDEX idx_lottery_user (user_id),
    INDEX idx_lottery_client (client_id),
    INDEX idx_lottery_date (created_at),
    INDEX idx_lottery_id (lottery_id)
);

-- ============================================
-- Histórico de Leituras de Tarô
-- ============================================

CREATE TABLE IF NOT EXISTS tarot_reading_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- ID do cliente final
    client_id INTEGER,
    client_email VARCHAR(255),
    client_name VARCHAR(255),
    
    -- Tipo de tiragem
    spread_type VARCHAR(50) NOT NULL, -- '1-card', '3-cards', 'celtic-cross', etc
    spread_name VARCHAR(100),
    
    -- Pergunta do cliente
    question TEXT,
    
    -- Categoria da consulta
    category VARCHAR(50) DEFAULT 'general', -- 'general', 'love', 'career', 'spiritual', 'financial'
    
    -- Cartas selecionadas (JSON)
    -- Ex: [{"id": 0, "name": "O Louco", "reversed": false, "position": 0}]
    cards JSONB,
    
    -- Interpretação gerada
    interpretation TEXT,
    
    -- Metadados
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Índices
    INDEX idx_tarot_user (user_id),
    INDEX idx_tarot_client (client_id),
    INDEX idx_tarot_date (created_at),
    INDEX idx_tarot_category (category)
);

-- ============================================
-- Estatísticas de Loterias (Dados Históricos)
-- ============================================

CREATE TABLE IF NOT EXISTS lottery_statistics (
    id SERIAL PRIMARY KEY,
    lottery_id VARCHAR(50) NOT NULL,
    
    -- Concurso/Sorteio
    draw_number INTEGER,
    draw_date DATE,
    
    -- Números sorteados
    numbers JSONB,
    bonus_number INTEGER,
    stars JSONB,
    
    -- Prêmio
    jackpot DECIMAL(15,2),
    winners INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(lottery_id, draw_number),
    INDEX idx_lottery_stats_id (lottery_id),
    INDEX idx_lottery_stats_date (draw_date)
);

-- ============================================
-- Análises de Frequência (Cache)
-- ============================================

CREATE TABLE IF NOT EXISTS lottery_frequency_analysis (
    id SERIAL PRIMARY KEY,
    lottery_id VARCHAR(50) NOT NULL,
    
    -- Período de análise
    period_start DATE,
    period_end DATE,
    total_draws INTEGER,
    
    -- Números quentes (mais frequentes)
    hot_numbers JSONB,
    
    -- Números frios (menos frequentes)
    cold_numbers JSONB,
    
    -- Padrões identificados
    patterns JSONB,
    
    -- Última atualização
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(lottery_id, period_end),
    INDEX idx_frequency_lottery (lottery_id)
);

-- ============================================
-- Pagamentos e Transações
-- ============================================

CREATE TABLE IF NOT EXISTS mystic_lottery_transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Tipo de transação
    transaction_type VARCHAR(50) NOT NULL, -- 'lottery_generation', 'module_activation', 'plan_upgrade'
    
    -- Descrição
    description TEXT,
    
    -- Valor
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'BRL',
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
    
    -- Metadados
    metadata JSONB,
    
    -- Payment gateway
    payment_method VARCHAR(50),
    transaction_id VARCHAR(255),
    
    created_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP,
    
    INDEX idx_transactions_user (user_id),
    INDEX idx_transactions_date (created_at),
    INDEX idx_transactions_status (status)
);

-- ============================================
-- Configurações Globais do Sistema
-- ============================================

CREATE TABLE IF NOT EXISTS mystic_lottery_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value JSONB,
    description TEXT,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Inserir configurações padrão
INSERT INTO mystic_lottery_settings (setting_key, setting_value, description) VALUES
    ('mystic_modules_pricing', '{"runes": 19.90, "iching": 19.90, "buzios": 19.90, "crystals": 24.90, "cards": 19.90, "palmistry": 19.90, "gypsy": 24.90}'::jsonb, 'Preços dos módulos místicos adicionais'),
    ('lottery_pricing', '{"base_lotteries": 5, "additional_cost_per_lottery": 15.00}'::jsonb, 'Configuração de preços de loterias'),
    ('ai_generation_costs', '{"normal": 0, "premium": 5.00}'::jsonb, 'Custos de geração com IA'),
    ('enabled_lotteries', '["mega-sena", "quina", "lotofacil", "lotomania", "timemania", "dupla-sena", "dia-de-sorte", "super-sete", "powerball", "mega-millions", "euromillions", "eurojackpot"]'::jsonb, 'Loterias disponíveis no sistema')
ON CONFLICT (setting_key) DO NOTHING;

-- ============================================
-- Views para Relatórios
-- ============================================

-- View de resumo de usuários
CREATE OR REPLACE VIEW v_user_mystic_lottery_summary AS
SELECT 
    u.id,
    u.email,
    u.name,
    umlc.selected_mystic_modules,
    umlc.selected_lotteries,
    umlc.additional_cost,
    COUNT(DISTINCT lgh.id) as total_lottery_generations,
    COUNT(DISTINCT trh.id) as total_tarot_readings,
    SUM(lgh.cost) as total_lottery_revenue,
    MAX(lgh.created_at) as last_lottery_generation,
    MAX(trh.created_at) as last_tarot_reading
FROM users u
LEFT JOIN user_mystic_lottery_config umlc ON u.id = umlc.user_id
LEFT JOIN lottery_generation_history lgh ON u.id = lgh.user_id
LEFT JOIN tarot_reading_history trh ON u.id = trh.user_id
GROUP BY u.id, u.email, u.name, umlc.selected_mystic_modules, umlc.selected_lotteries, umlc.additional_cost;

-- View de estatísticas de loterias
CREATE OR REPLACE VIEW v_lottery_statistics_summary AS
SELECT 
    lottery_id,
    COUNT(*) as total_generations,
    SUM(quantity) as total_games,
    SUM(cost) as total_revenue,
    AVG(cost) as avg_cost_per_generation,
    COUNT(DISTINCT user_id) as unique_users,
    MAX(created_at) as last_generation
FROM lottery_generation_history
GROUP BY lottery_id;

-- ============================================
-- Triggers para Atualização Automática
-- ============================================

-- Trigger para atualizar updated_at em user_mystic_lottery_config
CREATE OR REPLACE FUNCTION update_mystic_lottery_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_mystic_lottery_config
BEFORE UPDATE ON user_mystic_lottery_config
FOR EACH ROW
EXECUTE FUNCTION update_mystic_lottery_config_timestamp();

-- ============================================
-- Funções Úteis
-- ============================================

-- Função para calcular custo total do usuário
CREATE OR REPLACE FUNCTION calculate_user_total_cost(p_user_id INTEGER)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    v_additional_cost DECIMAL(10,2);
BEGIN
    SELECT additional_cost INTO v_additional_cost
    FROM user_mystic_lottery_config
    WHERE user_id = p_user_id;
    
    RETURN COALESCE(v_additional_cost, 0.00);
END;
$$ LANGUAGE plpgsql;

-- Função para verificar acesso à loteria
CREATE OR REPLACE FUNCTION check_lottery_access(p_user_id INTEGER, p_lottery_id VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    v_selected_lotteries JSONB;
BEGIN
    SELECT selected_lotteries INTO v_selected_lotteries
    FROM user_mystic_lottery_config
    WHERE user_id = p_user_id;
    
    IF v_selected_lotteries IS NULL THEN
        RETURN FALSE;
    END IF;
    
    RETURN v_selected_lotteries ? p_lottery_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Grants (ajustar conforme seu usuário do banco)
-- ============================================

-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO trustbank_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO trustbank_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO trustbank_user;

-- ============================================
-- Dados de Exemplo (Opcional - para testes)
-- ============================================

-- Inserir configuração para usuário de exemplo
-- INSERT INTO user_mystic_lottery_config (user_id, selected_mystic_modules, selected_lotteries, additional_cost)
-- VALUES (1, 
--         '["tarot", "numerology", "astrology", "runes"]'::jsonb,
--         '["mega-sena", "quina", "lotofacil", "powerball", "euromillions", "eurojackpot"]'::jsonb,
--         34.90
-- );

-- ============================================
-- Comentários nas Tabelas
-- ============================================

COMMENT ON TABLE user_mystic_lottery_config IS 'Configurações de módulos místicos e loterias por usuário';
COMMENT ON TABLE lottery_generation_history IS 'Histórico de todas as gerações de números de loteria';
COMMENT ON TABLE tarot_reading_history IS 'Histórico de todas as leituras de tarô realizadas';
COMMENT ON TABLE lottery_statistics IS 'Dados históricos dos sorteios de loterias';
COMMENT ON TABLE lottery_frequency_analysis IS 'Análises de frequência e padrões de loterias (cache)';
COMMENT ON TABLE mystic_lottery_transactions IS 'Transações financeiras relacionadas aos módulos';
COMMENT ON TABLE mystic_lottery_settings IS 'Configurações globais do sistema';
