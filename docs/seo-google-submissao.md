# SEO: Google Search Console e inventário de URLs (TrustBank)

Este projeto expõe o **mesmo conjunto de URLs** que o `sitemap.xml`, num endpoint pensado para **auditoria**, cópia para folhas de cálculo ou verificação manual.

## 1. Endpoints

| URL | Descrição |
|-----|-----------|
| `https://www.trustbank.xyz/sitemap.xml` | Sitemap oficial (submeter na Search Console). |
| `https://www.trustbank.xyz/robots.txt` | Referência ao sitemap. |
| `https://www.trustbank.xyz/api/seo/inventory` | JSON com todas as URLs + contagens + links do sitemap/robots. |
| `.../api/seo/inventory?format=txt` | Uma URL por linha (fácil de colar noutro lado). |
| `.../api/seo/inventory?format=csv` | CSV com `url`, `category`, `lastModified`, etc. |

Substitui `www.trustbank.xyz` pelo teu domínio canónico se for diferente.

**Importante:** chama este API no **domínio principal** (`www` ou apex), não num mini-site `slug.trustbank.xyz` (o middleware reescreve outros caminhos).

### Proteger o inventário (recomendado em produção)

Na Vercel, define:

- `SEO_INVENTORY_SECRET` = uma string longa e aleatória.

Depois todas as chamadas precisam de:

- `?key=TUA_SECRET`, ou
- cabeçalho `x-seo-inventory-key: TUA_SECRET`.

Se **não** definires o segredo, o inventário é **público** (igual ao sitemap em termos de dados, mas mais cómodo para scraping).

## 2. Variáveis de ambiente relevantes

- `NEXT_PUBLIC_SITE_URL` — URL canónica do site principal (ex.: `https://www.trustbank.xyz`).
- `NEXT_PUBLIC_SITE_URL_ALT` — outra origem do mesmo site (ex.: `https://trustbank.xyz`), opcional.
- `NEXT_PUBLIC_ROOT_DOMAIN` — domínio raiz dos mini-sites (ex.: `trustbank.xyz`).
- `SITE_CANONICAL_URL` — (opcional, só servidor) força a base usada em sitemap/robots se quiseres ignorar headers.

Sem isto correto, o Google pode ver URLs com `*.vercel.app` ou mistura www/apex.

## 3. Checklist Google Search Console

1. **Propriedade**  
   - Preferível: propriedade de **domínio** `trustbank.xyz` (verificação DNS).  
   - Ou duas propriedades de prefixo: `https://trustbank.xyz/` e `https://www.trustbank.xyz/` se necessário.

2. **Sitemaps**  
   - Adiciona **apenas** o URL final que devolve **200** e XML válido, por exemplo:  
     `https://www.trustbank.xyz/sitemap.xml`  
   - Se o apex redireciona para `www`, submeter o sitemap no **host final** evita confusão.

3. **Pedido de indexação**  
   - A ferramenta “Inspecionar URL” só ajuda URL a URL; não substitui o sitemap.

4. **Tempo**  
   - “Sitemap lido com sucesso” e URLs descobertas podem demorar **vários dias**.

5. **Erros comuns**  
   - Propriedade URL-prefix **sem** `www` mas sitemap só em `www` (ou o contrário).  
   - URLs dentro do XML com domínio diferente da propriedade (ex.: `vercel.app`).

## 4. “Enviar para algum lado”

- **Google:** não há API pública fiável para indexar URLs arbitrárias (o Indexing API oficial é para tipos limitados). O caminho suportado é **Search Console + sitemap**.  
- **Bing / IndexNow:** podes configurar `INDEXNOW_KEY` e o ficheiro na raiz (ver comentários em `src/lib/seoSearchPings.ts`). Mini-sites em `*.trustbank.xyz` podem precisar de chave/host próprios por subdomínio, conforme a documentação IndexNow.

## 5. Conteúdo do inventário (categorias)

- **static** — páginas principais do domínio (home, slugs, sites, vídeos, etc.).  
- **minisite** — `https://{slug}.trustbank.xyz` publicados.  
- **listing** — anúncios ativos em `/imoveis/` e `/carros/`.

Limite alinhado ao sitemap: até 1000 mini-sites e 500 listagens (ajusta em `src/lib/seoUrlInventory.ts` se precisares).
