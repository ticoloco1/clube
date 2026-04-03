import type { MessageRow } from './types';

/** Páginas legais + vídeos — `{ en, pt }`, inglês primeiro (merge em MESSAGES). */
export const LEGAL_AND_PAGES_MESSAGES: Record<string, MessageRow> = {
  videos_page_title: { en: 'Videos', pt: 'Vídeos' },
  videos_search_ph: { en: 'Search videos…', pt: 'Buscar vídeos…' },
  videos_filter_all: { en: 'All', pt: 'Todos' },
  videos_filter_free: { en: 'Free', pt: 'Grátis' },
  videos_filter_premium: { en: 'Premium 🔒', pt: 'Premium 🔒' },
  videos_empty: { en: 'No videos found', pt: 'Nenhum vídeo encontrado' },
  videos_untitled: { en: 'Untitled', pt: 'Sem título' },

  page_privacy_title: { en: 'Privacy Policy', pt: 'Política de privacidade' },
  page_privacy_updated: { en: 'Last updated: March 2026', pt: 'Última atualização: março de 2026' },
  page_terms_title: { en: 'Terms of Service', pt: 'Termos de serviço' },
  page_terms_updated: { en: 'Last updated: March 2026', pt: 'Última atualização: março de 2026' },

  page_privacy_0_t: { en: 'What We Collect', pt: 'O que recolhemos' },
  page_privacy_0_p: {
    en: 'Email address and name (from Google OAuth or email signup). Profile information you voluntarily provide (bio, avatar, links, CV). Polygon wallet address (only if you provide it for optional credit redemptions). Payment metadata for Stripe (e.g. session and payment IDs, amounts — card data is processed by Stripe, not stored by us). Stripe Connect account identifiers when you onboard as a seller. Usage data (page views, feature usage) via anonymous analytics.',
    pt: 'Endereço de e-mail e nome (Google OAuth ou registo por e-mail). Dados de perfil que forneces voluntariamente (bio, avatar, links, CV). Endereço de carteira Polygon (apenas se o indicares para resgates opcionais). Metadados de pagamento Stripe (IDs de sessão/pagamento, valores — dados de cartão tratados pela Stripe, não armazenados por nós). Identificadores Stripe Connect quando te registas como vendedor. Dados de utilização (visualizações, funcionalidades) via analytics anónimos.',
  },
  page_privacy_1_t: { en: 'What We Do NOT Collect', pt: 'O que NÃO recolhemos' },
  page_privacy_1_p: {
    en: 'We do not store passwords. We do not store credit card numbers. We do not sell your data to third parties. We do not run ads.',
    pt: 'Não armazenamos palavras-passe. Não armazenamos números de cartão. Não vendemos os teus dados a terceiros. Não exibimos anúncios.',
  },
  page_privacy_2_t: { en: 'How We Use Data', pt: 'Como usamos os dados' },
  page_privacy_2_p: {
    en: 'To provide platform features (mini sites, slugs, listings). To process payment splits via Stripe. To display your public profile to other users. To send transactional emails (payment confirmations, slug expiry notices).',
    pt: 'Para prestar as funcionalidades da plataforma (mini-sites, slugs, anúncios). Para processar repartições de pagamento via Stripe. Para mostrar o teu perfil público a outros utilizadores. Para enviar e-mails transacionais (confirmações de pagamento, avisos de expiração de slug).',
  },
  page_privacy_3_t: { en: 'Data Storage', pt: 'Armazenamento' },
  page_privacy_3_p: {
    en: 'Data is stored in Supabase (PostgreSQL) hosted on AWS. Media files are stored in Cloudflare R2 or Supabase Storage. Data may be stored in servers located in the United States.',
    pt: 'Os dados ficam na Supabase (PostgreSQL) alojada na AWS. Ficheiros de média na Cloudflare R2 ou Supabase Storage. Podem estar em servidores nos Estados Unidos.',
  },
  page_privacy_4_t: { en: 'Your Rights', pt: 'Os teus direitos' },
  page_privacy_4_p: {
    en: 'You may request deletion of your account and all associated data at any time by emailing support. Blockchain transactions (USDC payments) are immutable and cannot be deleted — this is inherent to blockchain technology.',
    pt: 'Podes pedir a eliminação da conta e dados associados por e-mail ao suporte. Transações em blockchain (USDC) são imutáveis e não podem ser apagadas.',
  },
  page_privacy_5_t: { en: 'Cookies', pt: 'Cookies' },
  page_privacy_5_p: {
    en: 'We use cookies only for authentication sessions (Supabase Auth). No tracking cookies. No ad cookies. Language preference is stored in localStorage.',
    pt: 'Usamos cookies apenas para sessão de autenticação (Supabase Auth). Sem cookies de rastreio ou publicidade. A preferência de idioma fica em localStorage.',
  },
  page_privacy_6_t: { en: 'Third-Party Services', pt: 'Serviços de terceiros' },
  page_privacy_6_p: {
    en: 'Google OAuth (authentication), Supabase (database), Stripe (payments and Connect), Cloudflare (DNS, CDN), Vercel (hosting). Each has their own privacy policy.',
    pt: 'Google OAuth (autenticação), Supabase (base de dados), Stripe (pagamentos e Connect), Cloudflare (DNS, CDN), Vercel (alojamento). Cada um tem a sua política de privacidade.',
  },
  page_privacy_7_t: { en: 'Contact', pt: 'Contacto' },
  page_privacy_7_p: {
    en: 'For privacy questions or data deletion requests, contact us at privacy@trustbank.xyz',
    pt: 'Questões de privacidade ou pedidos de eliminação: privacy@trustbank.xyz',
  },

  page_terms_0_t: { en: '1. Platform Nature', pt: '1. Natureza da plataforma' },
  page_terms_0_p: {
    en: 'TrustBank is a content, classifieds, and identity platform. We are NOT a bank or financial institution. Checkout and subscriptions are processed by Stripe (USD). Optional on-chain features (e.g. credit redemptions) may use a wallet you provide separately.',
    pt: 'O TrustBank é uma plataforma de conteúdo, classificados e identidade. NÃO somos um banco nem instituição financeira. Checkout e subscrições são processados pela Stripe (USD). Funcionalidades on-chain opcionais podem usar uma carteira que indicares separadamente.',
  },
  page_terms_1_t: { en: '2. Eligibility', pt: '2. Elegibilidade' },
  page_terms_1_p: {
    en: 'You must be at least 18 years old to use TrustBank. By using the platform, you confirm that you meet this requirement and that your use complies with all applicable local laws.',
    pt: 'Deves ter pelo menos 18 anos. Ao usar a plataforma confirmas que cumpres a idade e as leis aplicáveis.',
  },
  page_terms_2_t: { en: '3. User Accounts', pt: '3. Contas de utilizador' },
  page_terms_2_p: {
    en: 'You are responsible for maintaining the security of your account. TrustBank uses Google OAuth and email authentication via Supabase. We do not store passwords. You are responsible for all activity under your account.',
    pt: 'És responsável pela segurança da conta. Usamos Google OAuth e autenticação por e-mail (Supabase). Não armazenamos palavras-passe. És responsável por toda a atividade na tua conta.',
  },
  page_terms_3_t: { en: '4. Content & Listings', pt: '4. Conteúdo e anúncios' },
  page_terms_3_p: {
    en: 'Users are solely responsible for content they post, list, or publish on TrustBank. Prohibited content includes: illegal goods or services, adult content, weapons, spam, or anything that violates applicable law. TrustBank reserves the right to remove content without notice.',
    pt: 'Os utilizadores são os únicos responsáveis pelo conteúdo publicado. É proibido conteúdo ilegal, adulto, armas, spam ou que viole a lei. O TrustBank pode remover conteúdo sem aviso prévio.',
  },
  page_terms_4_t: { en: '5. Payments & Stripe', pt: '5. Pagamentos e Stripe' },
  page_terms_4_p: {
    en: "Purchases (including plans, paywall unlocks, CV unlocks, and marketplace items where applicable) are charged in USD through Stripe Checkout. Creator payouts for eligible sales may use Stripe Connect transfers subject to Stripe's terms and your onboarding status. TrustBank is not liable for payment failures, chargebacks, or issues arising from third-party payment processors.",
    pt: 'Compras (planos, paywall, CVs, marketplace quando aplicável) são cobradas em USD via Stripe Checkout. Pagamentos a criadores elegíveis podem usar Stripe Connect, sujeitos aos termos da Stripe e ao teu onboarding. O TrustBank não responde por falhas de pagamento, estornos ou problemas de processadores terceiros.',
  },
  page_terms_5_t: { en: '6. Slugs & Digital Assets', pt: '6. Slugs e ativos digitais' },
  page_terms_5_p: {
    en: 'Slugs (custom URL identifiers) are licensed, not sold. TrustBank reserves the right to revoke slugs that violate terms of service. Slug registrations are annual and must be renewed. Unclaimed or expired slugs return to the marketplace.',
    pt: 'Os slugs (identificadores de URL) são licenciados, não vendidos em definitivo. O TrustBank pode revogar slugs que violem os termos. Os registos são anuais e devem ser renovados. Slugs não reclamados ou expirados podem voltar ao marketplace.',
  },
  page_terms_6_t: { en: '7. Boost', pt: '7. Boost' },
  page_terms_6_p: {
    en: 'Boost lets visitors highlight mini sites or content for a fee. Boost purchases are processed in USD through Stripe. A portion of boost revenue may be allocated to an internal loyalty pool at the platform’s discretion; there is no public jackpot page or separate gambling product.',
    pt: 'O boost permite destacar mini sites ou conteúdo mediante pagamento. As compras de boost são processadas em USD via Stripe. Parte da receita pode ser destinada a um pool interno de fidelidade à discrição da plataforma; não existe página pública de jackpot nem produto de jogo separado.',
  },
  page_terms_7_t: { en: '8. CV Directory', pt: '8. Diretório de CVs' },
  page_terms_7_p: {
    en: 'Professionals list CVs voluntarily. Companies that pay for directory access agree to use contact information only for legitimate recruitment purposes. Misuse of contact data is prohibited.',
    pt: 'Profissionais listam CVs voluntariamente. Empresas que pagam pelo acesso comprometem-se a usar os contactos apenas para recrutamento legítimo. O uso indevido é proibido.',
  },
  page_terms_8_t: { en: '9. Limitation of Liability', pt: '9. Limitação de responsabilidade' },
  page_terms_8_p: {
    en: 'TrustBank is provided "as is." We are not liable for any indirect, incidental, special, or consequential damages arising from your use of the platform, including loss of data, revenue, or digital assets.',
    pt: 'O TrustBank é fornecido “como está”. Não respondemos por danos indiretos, incidentais ou consequenciais, incluindo perda de dados, receita ou ativos digitais.',
  },
  page_terms_9_t: { en: '10. Governing Law', pt: '10. Lei aplicável' },
  page_terms_9_p: {
    en: 'These terms are governed by applicable law. Disputes shall be resolved through binding arbitration. Class action lawsuits are waived.',
    pt: 'Estes termos regem-se pela lei aplicável. Litígios podem ser resolvidos por arbitragem vinculativa. Renúncia a ações coletivas.',
  },
  page_terms_10_t: { en: '11. Changes', pt: '11. Alterações' },
  page_terms_10_p: {
    en: 'We may update these terms at any time. Continued use of the platform after changes constitutes acceptance.',
    pt: 'Podemos atualizar estes termos a qualquer momento. O uso continuado após alterações implica aceitação.',
  },
};
