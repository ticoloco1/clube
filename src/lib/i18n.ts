'use client';
import { useState, useEffect } from 'react';

export type Lang = 'en'|'pt'|'es'|'fr'|'de'|'ja'|'zh'|'ko'|'ru'|'sv'|'vi'|'hi'|'id'|'it';

export const LANGS = [
  { code:'en' as Lang, label:'English',    flag:'🇺🇸' },
  { code:'pt' as Lang, label:'Português',  flag:'🇧🇷' },
  { code:'es' as Lang, label:'Español',    flag:'🇪🇸' },
  { code:'fr' as Lang, label:'Français',   flag:'🇫🇷' },
  { code:'de' as Lang, label:'Deutsch',    flag:'🇩🇪' },
  { code:'ja' as Lang, label:'日本語',      flag:'🇯🇵' },
  { code:'zh' as Lang, label:'中文',        flag:'🇨🇳' },
  { code:'ko' as Lang, label:'한국어',      flag:'🇰🇷' },
  { code:'ru' as Lang, label:'Русский',    flag:'🇷🇺' },
  { code:'sv' as Lang, label:'Svenska',    flag:'🇸🇪' },
  { code:'vi' as Lang, label:'Tiếng Việt', flag:'🇻🇳' },
  { code:'hi' as Lang, label:'हिन्दी',     flag:'🇮🇳' },
  { code:'id' as Lang, label:'Bahasa ID',   flag:'🇮🇩' },
  { code:'it' as Lang, label:'Italiano',    flag:'🇮🇹' },
];

const T: Record<string, Record<Lang, string>> = {
  // NAV
  nav_slugs:    { en:'Slugs',      pt:'Slugs',      es:'Slugs',    fr:'Slugs',   de:'Slugs',     ja:'スラッグ', zh:'域名',  ko:'슬러그', ru:'Слаги',    sv:'Slugs',  vi:'Slug' },
  nav_sites:    { en:'Sites',      pt:'Sites',      es:'Sitios',   fr:'Sites',   de:'Sites',     ja:'サイト',  zh:'网站',  ko:'사이트', ru:'Сайты',    sv:'Sajter', vi:'Trang' },
  nav_videos:   { en:'Videos',     pt:'Vídeos',     es:'Videos',   fr:'Vidéos',  de:'Videos',    ja:'動画',    zh:'视频',  ko:'비디오', ru:'Видео',    sv:'Video',  vi:'Video' },
  nav_cvs:      { en:'CVs',        pt:'CVs',        es:'CVs',      fr:'CVs',     de:'CVs',       ja:'履歴書',  zh:'简历',  ko:'이력서', ru:'Резюме',   sv:'CV',     vi:'CV' },
  nav_signin:   { en:'Sign In',    pt:'Entrar',     es:'Entrar',   fr:'Connexion',de:'Anmelden', ja:'ログイン',zh:'登录',  ko:'로그인', ru:'Войти',    sv:'Logga in',vi:'Đăng nhập' },
  nav_market:   { en:'Market',     pt:'Mercado',    es:'Mercado',  fr:'Marché',  de:'Markt',     ja:'マーケット',zh:'市场', ko:'마켓',   ru:'Рынок',    sv:'Marknad',vi:'Chợ' },
  nav_vault:    { en:'Vault',      pt:'Cofre',      es:'Cofre',    fr:'Coffre',  de:'Tresor',    ja:'金庫',    zh:'保险库', ko:'금고',   ru:'Хранилище',sv:'Valv',   vi:'Kho' },
  nav_planos:   { en:'Plans',      pt:'Planos',     es:'Planes',   fr:'Plans',   de:'Pläne',     ja:'プラン',  zh:'方案',  ko:'요금제', ru:'Тарифы',   sv:'Planer', vi:'Gói' },
  // HOME
  home_hero:    { en:'Your identity. Your revenue.', pt:'Sua identidade. Sua renda.', es:'Tu identidad. Tus ingresos.', fr:'Votre identité. Vos revenus.', de:'Deine Identität. Dein Einkommen.', ja:'あなたのアイデンティティ。あなたの収入。', zh:'您的身份。您的收入。', ko:'당신의 정체성. 당신의 수익.', ru:'Ваша личность. Ваш доход.', sv:'Din identitet. Din inkomst.', vi:'Danh tính của bạn. Thu nhập.' },
  home_start:   { en:'Get Started Free', pt:'Criar Grátis', es:'Empezar Gratis', fr:'Commencer', de:'Kostenlos starten', ja:'無料で始める', zh:'免费开始', ko:'무료로 시작', ru:'Начать бесплатно', sv:'Börja gratis', vi:'Bắt đầu' },
  home_browse:  { en:'Browse Slugs', pt:'Ver Slugs', es:'Ver Slugs', fr:'Voir Slugs', de:'Slugs ansehen', ja:'スラッグを見る', zh:'浏览域名', ko:'슬러그 보기', ru:'Просмотр', sv:'Se Slugs', vi:'Xem Slug' },
  // EDITOR
  ed_save:      { en:'Save',       pt:'Salvar',     es:'Guardar',  fr:'Sauvegarder',de:'Speichern',ja:'保存',   zh:'保存',  ko:'저장',  ru:'Сохранить', sv:'Spara',  vi:'Lưu' },
  ed_saving:    { en:'Saving…',    pt:'Salvando…',  es:'Guardando…',fr:'Sauvegarde…',de:'Speichert…',ja:'保存中…',zh:'保存中…',ko:'저장 중…',ru:'Сохранение…',sv:'Sparar…',vi:'Đang lưu…' },
  ed_preview:   { en:'Preview',    pt:'Preview',    es:'Vista Previa',fr:'Aperçu', de:'Vorschau', ja:'プレビュー',zh:'预览', ko:'미리보기',ru:'Просмотр',sv:'Förhandsgranska',vi:'Xem trước' },
  ed_publish:   { en:'Publish',    pt:'Publicar',   es:'Publicar', fr:'Publier',  de:'Veröffentlichen',ja:'公開',zh:'发布',ko:'게시',   ru:'Опубликовать',sv:'Publicera',vi:'Xuất bản' },
  ed_profile:   { en:'Profile',    pt:'Perfil',     es:'Perfil',   fr:'Profil',   de:'Profil',   ja:'プロフィール',zh:'个人资料',ko:'프로필',ru:'Профиль',sv:'Profil',vi:'Hồ sơ' },
  ed_theme:     { en:'Theme',      pt:'Tema',       es:'Tema',     fr:'Thème',    de:'Thema',    ja:'テーマ',  zh:'主题',  ko:'테마',  ru:'Тема',     sv:'Tema',   vi:'Chủ đề' },
  ed_links:     { en:'Links',      pt:'Links',      es:'Links',    fr:'Liens',    de:'Links',    ja:'リンク',  zh:'链接',  ko:'링크',  ru:'Ссылки',   sv:'Länkar', vi:'Liên kết' },
  ed_videos:    { en:'Videos',     pt:'Vídeos',     es:'Videos',   fr:'Vidéos',   de:'Videos',   ja:'動画',    zh:'视频',  ko:'비디오',ru:'Видео',    sv:'Video',  vi:'Video' },
  ed_cv:        { en:'CV',         pt:'CV',         es:'CV',       fr:'CV',       de:'CV',       ja:'履歴書',  zh:'简历',  ko:'이력서',ru:'Резюме',   sv:'CV',     vi:'CV' },
  ed_feed:      { en:'Feed',       pt:'Feed',       es:'Feed',     fr:'Feed',     de:'Feed',     ja:'フィード',zh:'动态',  ko:'피드',  ru:'Лента',    sv:'Flöde',  vi:'Nguồn' },
  ed_pages:     { en:'Pages',      pt:'Páginas',    es:'Páginas',  fr:'Pages',    de:'Seiten',   ja:'ページ',  zh:'页面',  ko:'페이지',ru:'Страницы', sv:'Sidor',  vi:'Trang' },
  // SLUGS
  slug_title:   { en:'Slug Marketplace', pt:'Marketplace de Slugs', es:'Mercado de Slugs', fr:'Marché des Slugs', de:'Slug-Marktplatz', ja:'スラッグ市場', zh:'域名市场', ko:'슬러그 마켓', ru:'Рынок слагов', sv:'Slug-marknad', vi:'Chợ Slug' },
  slug_search:  { en:'Search slug…', pt:'Buscar slug…', es:'Buscar slug…', fr:'Rechercher…', de:'Slug suchen…', ja:'検索…', zh:'搜索域名…', ko:'검색…', ru:'Поиск…', sv:'Sök…', vi:'Tìm…' },
  slug_available: { en:'Available!', pt:'Disponível!', es:'¡Disponible!', fr:'Disponible!', de:'Verfügbar!', ja:'利用可能！', zh:'可用！', ko:'사용 가능!', ru:'Доступен!', sv:'Tillgänglig!', vi:'Có sẵn!' },
  slug_taken:   { en:'Not available', pt:'Indisponível', es:'No disponible', fr:'Non disponible', de:'Nicht verfügbar', ja:'利用不可', zh:'不可用', ko:'사용 불가', ru:'Недоступен', sv:'Inte tillgänglig', vi:'Không có sẵn' },
  slug_register:{ en:'Register', pt:'Registrar', es:'Registrar', fr:'Enregistrer', de:'Registrieren', ja:'登録', zh:'注册', ko:'등록', ru:'Зарегистрировать', sv:'Registrera', vi:'Đăng ký' },
  slug_buy:     { en:'Buy', pt:'Comprar', es:'Comprar', fr:'Acheter', de:'Kaufen', ja:'購入', zh:'购买', ko:'구매', ru:'Купить', sv:'Köpa', vi:'Mua' },
  // VAULT
  vault_title:  { en:'Slug Vault', pt:'Cofre de Slugs', es:'Bóveda de Slugs', fr:'Coffre de Slugs', de:'Slug-Tresor', ja:'スラッグ金庫', zh:'域名保险库', ko:'슬러그 금고', ru:'Хранилище слагов', sv:'Slug-valv', vi:'Kho Slug' },
  vault_use:    { en:'Use on site', pt:'Usar no meu site', es:'Usar en mi sitio', fr:'Utiliser sur le site', de:'Auf Website verwenden', ja:'サイトで使用', zh:'用于网站', ko:'사이트에서 사용', ru:'Использовать на сайте', sv:'Använd på sajt', vi:'Dùng trên trang' },
  vault_sell:   { en:'Sell', pt:'Vender', es:'Vender', fr:'Vendre', de:'Verkaufen', ja:'売る', zh:'出售', ko:'팔기', ru:'Продать', sv:'Sälj', vi:'Bán' },
  // SITE PUBLIC
  site_posts:   { en:'Posts', pt:'Posts', es:'Posts', fr:'Posts', de:'Beiträge', ja:'投稿', zh:'帖子', ko:'게시물', ru:'Публикации', sv:'Inlägg', vi:'Bài đăng' },
  new_post:     { en:'New post', pt:'Novo post', es:'Nueva entrada', fr:'Nouveau post', de:'Neuer Beitrag', ja:'新しい投稿', zh:'新帖子', ko:'새 게시물', ru:'Новая запись', sv:'Nytt inlägg', vi:'Bài viết mới' },
  publish:      { en:'Publish', pt:'Publicar', es:'Publicar', fr:'Publier', de:'Veröffentlichen', ja:'公開', zh:'发布', ko:'게시', ru:'Опубликовать', sv:'Publicera', vi:'Xuất bản' },
  open_editor:  { en:'Open Editor', pt:'Abrir Editor', es:'Abrir Editor', fr:'Ouvrir Éditeur', de:'Editor öffnen', ja:'エディタを開く', zh:'打开编辑器', ko:'편집기 열기', ru:'Открыть редактор', sv:'Öppna redigering', vi:'Mở trình chỉnh sửa' },
  coming_soon:  { en:'Coming soon', pt:'Em breve', es:'Próximamente', fr:'Bientôt', de:'Demnächst', ja:'近日公開', zh:'即将推出', ko:'곧 출시', ru:'Скоро', sv:'Snart', vi:'Sắp ra mắt' },
  // AUTH
  auth_welcome_back: { en:'Welcome back', pt:'Bem-vindo de volta', es:'Welcome back', fr:'Welcome back', de:'Welcome back', ja:'Welcome back', zh:'Welcome back', ko:'Welcome back', ru:'Welcome back', sv:'Welcome back', vi:'Welcome back', hi:'Welcome back', id:'Welcome back', it:'Welcome back' },
  auth_create_account: { en:'Create your account', pt:'Crie sua conta', es:'Create your account', fr:'Create your account', de:'Create your account', ja:'Create your account', zh:'Create your account', ko:'Create your account', ru:'Create your account', sv:'Create your account', vi:'Create your account', hi:'Create your account', id:'Create your account', it:'Create your account' },
  auth_continue_google: { en:'Continue with Google', pt:'Continuar com Google', es:'Continue with Google', fr:'Continue with Google', de:'Continue with Google', ja:'Continue with Google', zh:'Continue with Google', ko:'Continue with Google', ru:'Continue with Google', sv:'Continue with Google', vi:'Continue with Google', hi:'Continue with Google', id:'Continue with Google', it:'Continue with Google' },
  auth_or_email: { en:'or email', pt:'ou email', es:'or email', fr:'or email', de:'or email', ja:'or email', zh:'or email', ko:'or email', ru:'or email', sv:'or email', vi:'or email', hi:'or email', id:'or email', it:'or email' },
  auth_password: { en:'Password', pt:'Senha', es:'Password', fr:'Password', de:'Password', ja:'Password', zh:'Password', ko:'Password', ru:'Password', sv:'Password', vi:'Password', hi:'Password', id:'Password', it:'Password' },
  auth_loading: { en:'Loading...', pt:'Carregando...', es:'Loading...', fr:'Loading...', de:'Loading...', ja:'Loading...', zh:'Loading...', ko:'Loading...', ru:'Loading...', sv:'Loading...', vi:'Loading...', hi:'Loading...', id:'Loading...', it:'Loading...' },
  auth_signin: { en:'Sign in', pt:'Entrar', es:'Sign in', fr:'Sign in', de:'Sign in', ja:'Sign in', zh:'Sign in', ko:'Sign in', ru:'Sign in', sv:'Sign in', vi:'Sign in', hi:'Sign in', id:'Sign in', it:'Sign in' },
  auth_signup: { en:'Create account', pt:'Criar conta', es:'Create account', fr:'Create account', de:'Create account', ja:'Create account', zh:'Create account', ko:'Create account', ru:'Create account', sv:'Create account', vi:'Create account', hi:'Create account', id:'Create account', it:'Create account' },
  auth_no_account: { en:"Don't have an account?", pt:'Não tem conta?', es:"Don't have an account?", fr:"Don't have an account?", de:"Don't have an account?", ja:"Don't have an account?", zh:"Don't have an account?", ko:"Don't have an account?", ru:"Don't have an account?", sv:"Don't have an account?", vi:"Don't have an account?", hi:"Don't have an account?", id:"Don't have an account?", it:"Don't have an account?" },
  auth_have_account: { en:'Already have an account?', pt:'Já tem conta?', es:'Already have an account?', fr:'Already have an account?', de:'Already have an account?', ja:'Already have an account?', zh:'Already have an account?', ko:'Already have an account?', ru:'Already have an account?', sv:'Already have an account?', vi:'Already have an account?', hi:'Already have an account?', id:'Already have an account?', it:'Already have an account?' },
  auth_create_free: { en:'Create free', pt:'Criar grátis', es:'Create free', fr:'Create free', de:'Create free', ja:'Create free', zh:'Create free', ko:'Create free', ru:'Create free', sv:'Create free', vi:'Create free', hi:'Create free', id:'Create free', it:'Create free' },
  // SITES
  sites_title: { en:'Mini Sites', pt:'Mini Sites', es:'Mini Sites', fr:'Mini Sites', de:'Mini Sites', ja:'Mini Sites', zh:'Mini Sites', ko:'Mini Sites', ru:'Mini Sites', sv:'Mini Sites', vi:'Mini Sites', hi:'Mini Sites', id:'Mini Sites', it:'Mini Sites' },
  sites_subtitle: { en:'Discover creators, professionals and brands', pt:'Descubra criadores, profissionais e marcas', es:'Discover creators, professionals and brands', fr:'Discover creators, professionals and brands', de:'Discover creators, professionals and brands', ja:'Discover creators, professionals and brands', zh:'Discover creators, professionals and brands', ko:'Discover creators, professionals and brands', ru:'Discover creators, professionals and brands', sv:'Discover creators, professionals and brands', vi:'Discover creators, professionals and brands', hi:'Discover creators, professionals and brands', id:'Discover creators, professionals and brands', it:'Discover creators, professionals and brands' },
  sites_search_placeholder: { en:'Search by name, slug or bio...', pt:'Buscar por nome, slug ou bio...', es:'Search by name, slug or bio...', fr:'Search by name, slug or bio...', de:'Search by name, slug or bio...', ja:'Search by name, slug or bio...', zh:'Search by name, slug or bio...', ko:'Search by name, slug or bio...', ru:'Search by name, slug or bio...', sv:'Search by name, slug or bio...', vi:'Search by name, slug or bio...', hi:'Search by name, slug or bio...', id:'Search by name, slug or bio...', it:'Search by name, slug or bio...' },
  sites_visit: { en:'Visit', pt:'Visitar', es:'Visit', fr:'Visit', de:'Visit', ja:'Visit', zh:'Visit', ko:'Visit', ru:'Visit', sv:'Visit', vi:'Visit', hi:'Visit', id:'Visit', it:'Visit' },
  sites_not_found: { en:'No sites found', pt:'Nenhum site encontrado', es:'No sites found', fr:'No sites found', de:'No sites found', ja:'No sites found', zh:'No sites found', ko:'No sites found', ru:'No sites found', sv:'No sites found', vi:'No sites found', hi:'No sites found', id:'No sites found', it:'No sites found' },
  // DASHBOARD
  dashboard_title: { en:'Dashboard', pt:'Dashboard', es:'Dashboard', fr:'Dashboard', de:'Dashboard', ja:'Dashboard', zh:'Dashboard', ko:'Dashboard', ru:'Dashboard', sv:'Dashboard', vi:'Dashboard', hi:'Dashboard', id:'Dashboard', it:'Dashboard' },
  dashboard_edit: { en:'Edit', pt:'Editar', es:'Edit', fr:'Edit', de:'Edit', ja:'Edit', zh:'Edit', ko:'Edit', ru:'Edit', sv:'Edit', vi:'Edit', hi:'Edit', id:'Edit', it:'Edit' },
  dashboard_overview: { en:'Overview', pt:'Visão Geral', es:'Overview', fr:'Overview', de:'Overview', ja:'Overview', zh:'Overview', ko:'Overview', ru:'Overview', sv:'Overview', vi:'Overview', hi:'Overview', id:'Overview', it:'Overview' },
  dashboard_slug_vault: { en:'Slug Vault', pt:'Cofre', es:'Slug Vault', fr:'Slug Vault', de:'Slug Vault', ja:'Slug Vault', zh:'Slug Vault', ko:'Slug Vault', ru:'Slug Vault', sv:'Slug Vault', vi:'Slug Vault', hi:'Slug Vault', id:'Slug Vault', it:'Slug Vault' },
  dashboard_feed: { en:'Feed', pt:'Feed', es:'Feed', fr:'Feed', de:'Feed', ja:'Feed', zh:'Feed', ko:'Feed', ru:'Feed', sv:'Feed', vi:'Feed', hi:'Feed', id:'Feed', it:'Feed' },
  dashboard_listings: { en:'Listings', pt:'Anúncios', es:'Listings', fr:'Listings', de:'Listings', ja:'Listings', zh:'Listings', ko:'Listings', ru:'Listings', sv:'Listings', vi:'Listings', hi:'Listings', id:'Listings', it:'Listings' },
  dashboard_visits: { en:'Visits', pt:'Visitas', es:'Visits', fr:'Visits', de:'Visits', ja:'Visits', zh:'Visits', ko:'Visits', ru:'Visits', sv:'Visits', vi:'Visits', hi:'Visits', id:'Visits', it:'Visits' },
  dashboard_clicks: { en:'Clicks', pt:'Cliques', es:'Clicks', fr:'Clicks', de:'Clicks', ja:'Clicks', zh:'Clicks', ko:'Clicks', ru:'Clicks', sv:'Clicks', vi:'Clicks', hi:'Clicks', id:'Clicks', it:'Clicks' },
  dashboard_purchases: { en:'Purchases', pt:'Compras', es:'Purchases', fr:'Purchases', de:'Purchases', ja:'Purchases', zh:'Purchases', ko:'Purchases', ru:'Purchases', sv:'Purchases', vi:'Purchases', hi:'Purchases', id:'Purchases', it:'Purchases' },
  dashboard_total: { en:'Total', pt:'Total', es:'Total', fr:'Total', de:'Total', ja:'Total', zh:'Total', ko:'Total', ru:'Total', sv:'Total', vi:'Total', hi:'Total', id:'Total', it:'Total' },
  dashboard_videos: { en:'Videos', pt:'Vídeos', es:'Videos', fr:'Videos', de:'Videos', ja:'Videos', zh:'Videos', ko:'Videos', ru:'Videos', sv:'Videos', vi:'Videos', hi:'Videos', id:'Videos', it:'Videos' },
  dashboard_cvs: { en:'CVs', pt:'CVs', es:'CVs', fr:'CVs', de:'CVs', ja:'CVs', zh:'CVs', ko:'CVs', ru:'CVs', sv:'CVs', vi:'CVs', hi:'CVs', id:'CVs', it:'CVs' },
  dashboard_funnel: { en:'Funnel conversion', pt:'Conversão do funil', es:'Funnel conversion', fr:'Funnel conversion', de:'Funnel conversion', ja:'Funnel conversion', zh:'Funnel conversion', ko:'Funnel conversion', ru:'Funnel conversion', sv:'Funnel conversion', vi:'Funnel conversion', hi:'Funnel conversion', id:'Funnel conversion', it:'Funnel conversion' },
  // PLANS
  plans_title: { en:'Plans', pt:'Planos', es:'Plans', fr:'Plans', de:'Plans', ja:'Plans', zh:'Plans', ko:'Plans', ru:'Plans', sv:'Plans', vi:'Plans', hi:'Plans', id:'Plans', it:'Plans' },
  plans_subtitle: { en:'Start free. Pay only when you want more.', pt:'Comece grátis. Pague apenas quando quiser mais.', es:'Start free. Pay only when you want more.', fr:'Start free. Pay only when you want more.', de:'Start free. Pay only when you want more.', ja:'Start free. Pay only when you want more.', zh:'Start free. Pay only when you want more.', ko:'Start free. Pay only when you want more.', ru:'Start free. Pay only when you want more.', sv:'Start free. Pay only when you want more.', vi:'Start free. Pay only when you want more.', hi:'Start free. Pay only when you want more.', id:'Start free. Pay only when you want more.', it:'Start free. Pay only when you want more.' },
  plans_monthly: { en:'Monthly', pt:'Mensal', es:'Monthly', fr:'Monthly', de:'Monthly', ja:'Monthly', zh:'Monthly', ko:'Monthly', ru:'Monthly', sv:'Monthly', vi:'Monthly', hi:'Monthly', id:'Monthly', it:'Monthly' },
  plans_yearly: { en:'Yearly', pt:'Anual', es:'Yearly', fr:'Yearly', de:'Yearly', ja:'Yearly', zh:'Yearly', ko:'Yearly', ru:'Yearly', sv:'Yearly', vi:'Yearly', hi:'Yearly', id:'Yearly', it:'Yearly' },
  plans_most_popular: { en:'Most popular', pt:'Mais popular', es:'Most popular', fr:'Most popular', de:'Most popular', ja:'Most popular', zh:'Most popular', ko:'Most popular', ru:'Most popular', sv:'Most popular', vi:'Most popular', hi:'Most popular', id:'Most popular', it:'Most popular' },
  plans_start_with: { en:'Start with', pt:'Começar com', es:'Start with', fr:'Start with', de:'Start with', ja:'Start with', zh:'Start with', ko:'Start with', ru:'Start with', sv:'Start with', vi:'Start with', hi:'Start with', id:'Start with', it:'Start with' },
  plans_no_plans: { en:'No plans available right now.', pt:'Nenhum plano disponível no momento.', es:'No plans available right now.', fr:'No plans available right now.', de:'No plans available right now.', ja:'No plans available right now.', zh:'No plans available right now.', ko:'No plans available right now.', ru:'No plans available right now.', sv:'No plans available right now.', vi:'No plans available right now.', hi:'No plans available right now.', id:'No plans available right now.', it:'No plans available right now.' },
  // REAL ESTATE / CARS
  imoveis_search_placeholder: { en:'Search property, neighborhood, city...', pt:'Buscar imóvel, bairro, cidade...', es:'Search property, neighborhood, city...', fr:'Search property, neighborhood, city...', de:'Search property, neighborhood, city...', ja:'Search property, neighborhood, city...', zh:'Search property, neighborhood, city...', ko:'Search property, neighborhood, city...', ru:'Search property, neighborhood, city...', sv:'Search property, neighborhood, city...', vi:'Search property, neighborhood, city...', hi:'Search property, neighborhood, city...', id:'Search property, neighborhood, city...', it:'Search property, neighborhood, city...' },
  imoveis_list_property: { en:'List Property', pt:'Anunciar imóvel', es:'List Property', fr:'List Property', de:'List Property', ja:'List Property', zh:'List Property', ko:'List Property', ru:'List Property', sv:'List Property', vi:'List Property', hi:'List Property', id:'List Property', it:'List Property' },
  imoveis_title: { en:'Properties', pt:'Imóveis', es:'Properties', fr:'Properties', de:'Properties', ja:'Properties', zh:'Properties', ko:'Properties', ru:'Properties', sv:'Properties', vi:'Properties', hi:'Properties', id:'Properties', it:'Properties' },
  imoveis_found: { en:'properties found', pt:'imóveis encontrados', es:'properties found', fr:'properties found', de:'properties found', ja:'properties found', zh:'properties found', ko:'properties found', ru:'properties found', sv:'properties found', vi:'properties found', hi:'properties found', id:'properties found', it:'properties found' },
  imoveis_none_region: { en:'No properties in this region', pt:'Nenhum imóvel nessa região', es:'No properties in this region', fr:'No properties in this region', de:'No properties in this region', ja:'No properties in this region', zh:'No properties in this region', ko:'No properties in this region', ru:'No properties in this region', sv:'No properties in this region', vi:'No properties in this region', hi:'No properties in this region', id:'No properties in this region', it:'No properties in this region' },
  imoveis_first_list: { en:'Be the first to list here!', pt:'Seja o primeiro a anunciar aqui!', es:'Be the first to list here!', fr:'Be the first to list here!', de:'Be the first to list here!', ja:'Be the first to list here!', zh:'Be the first to list here!', ko:'Be the first to list here!', ru:'Be the first to list here!', sv:'Be the first to list here!', vi:'Be the first to list here!', hi:'Be the first to list here!', id:'Be the first to list here!', it:'Be the first to list here!' },
  imoveis_list_mine: { en:'List my property', pt:'Anunciar meu imóvel', es:'List my property', fr:'List my property', de:'List my property', ja:'List my property', zh:'List my property', ko:'List my property', ru:'List my property', sv:'List my property', vi:'List my property', hi:'List my property', id:'List my property', it:'List my property' },
  carros_search_placeholder: { en:'Search by model, brand, year...', pt:'Buscar por modelo, marca, ano...', es:'Search by model, brand, year...', fr:'Search by model, brand, year...', de:'Search by model, brand, year...', ja:'Search by model, brand, year...', zh:'Search by model, brand, year...', ko:'Search by model, brand, year...', ru:'Search by model, brand, year...', sv:'Search by model, brand, year...', vi:'Search by model, brand, year...', hi:'Search by model, brand, year...', id:'Search by model, brand, year...', it:'Search by model, brand, year...' },
  carros_title: { en:'Cars', pt:'Carros', es:'Cars', fr:'Cars', de:'Cars', ja:'Cars', zh:'Cars', ko:'Cars', ru:'Cars', sv:'Cars', vi:'Cars', hi:'Cars', id:'Cars', it:'Cars' },
  carros_vehicle_found_one: { en:'vehicle found', pt:'veículo encontrado', es:'vehicle found', fr:'vehicle found', de:'vehicle found', ja:'vehicle found', zh:'vehicle found', ko:'vehicle found', ru:'vehicle found', sv:'vehicle found', vi:'vehicle found', hi:'vehicle found', id:'vehicle found', it:'vehicle found' },
  carros_vehicle_found_many: { en:'vehicles found', pt:'veículos encontrados', es:'vehicles found', fr:'vehicles found', de:'vehicles found', ja:'vehicles found', zh:'vehicles found', ko:'vehicles found', ru:'vehicles found', sv:'vehicles found', vi:'vehicles found', hi:'vehicles found', id:'vehicles found', it:'vehicles found' },
  carros_details: { en:'See details', pt:'Ver detalhes', es:'See details', fr:'See details', de:'See details', ja:'See details', zh:'See details', ko:'See details', ru:'See details', sv:'See details', vi:'See details', hi:'See details', id:'See details', it:'See details' },
  carros_none_found: { en:'No vehicles found', pt:'Nenhum veículo encontrado', es:'No vehicles found', fr:'No vehicles found', de:'No vehicles found', ja:'No vehicles found', zh:'No vehicles found', ko:'No vehicles found', ru:'No vehicles found', sv:'No vehicles found', vi:'No vehicles found', hi:'No vehicles found', id:'No vehicles found', it:'No vehicles found' },
  carros_try_filters: { en:'Try adjusting search or filters', pt:'Tente ajustar a busca ou filtros', es:'Try adjusting search or filters', fr:'Try adjusting search or filters', de:'Try adjusting search or filters', ja:'Try adjusting search or filters', zh:'Try adjusting search or filters', ko:'Try adjusting search or filters', ru:'Try adjusting search or filters', sv:'Try adjusting search or filters', vi:'Try adjusting search or filters', hi:'Try adjusting search or filters', id:'Try adjusting search or filters', it:'Try adjusting search or filters' },
};

export type TKey = keyof typeof T;

export function getLang(): Lang {
  if (typeof window === 'undefined') return 'en';
  const saved = localStorage.getItem('i18n-lang') as Lang;
  if (saved && LANGS.find(l => l.code === saved)) return saved;
  const browser = navigator.language.split('-')[0] as Lang;
  if (LANGS.find(l => l.code === browser)) return browser;
  return 'en';
}

export function setLang(lang: Lang) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('i18n-lang', lang);
  window.dispatchEvent(new Event('lang-change'));
}

export function t(key: string, lang?: Lang): string {
  const l = lang || getLang();
  const entry = T[key];
  if (!entry) return key;
  return entry[l] || entry['en'] || key;
}

export function useT() {
  const [lang, setLangState] = useState<Lang>('en');

  useEffect(() => {
    setLangState(getLang());
    const handler = () => setLangState(getLang());
    window.addEventListener('lang-change', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('lang-change', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  return (key: string) => t(key, lang);
}

export default { changeLanguage: (l: string) => setLang(l as Lang), language: 'en' };
