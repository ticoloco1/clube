-- SEO extra: tags de pesquisa (long-tail) e JSON-LD opcional definido pelo criador
ALTER TABLE mini_sites ADD COLUMN IF NOT EXISTS seo_search_tags text[] DEFAULT '{}';
ALTER TABLE mini_sites ADD COLUMN IF NOT EXISTS seo_json_ld text;

COMMENT ON COLUMN mini_sites.seo_search_tags IS 'Frases-chave / nicho para meta keywords e contexto SEO';
COMMENT ON COLUMN mini_sites.seo_json_ld IS 'JSON-LD extra (Schema.org) — objeto ou array; fundido com Person base no layout público';
