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
