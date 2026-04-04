import type { Lang } from '@/lib/i18n/types';
import { LOCALE_CODES } from '@/lib/i18n/types';

/** Valida `uiLang` vindo do cliente (bandeiras / localStorage). */
export function parseUiLang(raw: unknown): Lang {
  const s = String(raw ?? 'en')
    .toLowerCase()
    .trim()
    .slice(0, 12);
  if ((LOCALE_CODES as readonly string[]).includes(s)) return s as Lang;
  return 'en';
}

/** Nome do idioma para instruções em prompts (inglês, para o modelo). */
export function outputLanguageNameForPrompt(lang: Lang): string {
  const map: Record<Lang, string> = {
    en: 'English',
    pt: 'Portuguese (prefer Brazilian Portuguese if not specified)',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    it: 'Italian',
    zh: 'Simplified Chinese',
    ja: 'Japanese',
    ko: 'Korean',
    ar: 'Arabic (Modern Standard Arabic, simple sentences)',
  };
  return map[lang] ?? 'English';
}

/** Idioma pedido explicitamente na última mensagem (ex.: "reply in English"). */
export function explicitRequestedLang(text: string): Lang | null {
  const t = text.trim();
  if (!t) return null;
  if (/\b(in english|reply in english|respond in english|answer in english|speak english|write in english)\b/i.test(t)) {
    return 'en';
  }
  if (/\b(em ingl[eê]s|fala ingl[eê]s|responde em ingl[eê]s|ingles|inglês)\b/i.test(t)) {
    return 'en';
  }
  if (/\b(in portuguese|em portugu[eê]s|responde em portugu[eê]s|fala portugu[eê]s)\b/i.test(t)) {
    return 'pt';
  }
  if (/\b(en espa[nñ]ol|in spanish|habla espa[nñ]ol)\b/i.test(t)) return 'es';
  if (/\b(en fran[cç]ais|in french)\b/i.test(t)) return 'fr';
  if (/\b(auf deutsch|in german)\b/i.test(t)) return 'de';
  if (/\b(in italiano|in italian)\b/i.test(t)) return 'it';
  if (/\b(用中文|说中文|in chinese|简体中文)\b/i.test(t)) return 'zh';
  if (/\b(日本語で|in japanese)\b/i.test(t)) return 'ja';
  if (/\b(한국어로|in korean)\b/i.test(t)) return 'ko';
  if (/\b(بالعربية|in arabic)\b/i.test(t)) return 'ar';
  return null;
}

const PT_HEURISTIC =
  /[áàâãçéêíóôõú]|\b(não|você|horário|consulta|marcar|agendar|telefone|olá|obrigad[oa]|bom dia|boa tarde)\b/i;
const ES_HEURISTIC = /\b(hola|qué|cómo|gracias|por favor|dónde|cuándo|buenos|necesito)\b/i;
const FR_HEURISTIC = /\b(bonjour|merci|comment|où|combien|bonsoir)\b/i;
const DE_HEURISTIC = /\b(hallo|danke|bitte|wie viel|guten tag)\b/i;

/**
 * Ordem: pedido explícito na mensagem → (se UI=EN) deteção simples PT/ES/FR/DE na mensagem → idioma da UI (bandeira do mini-site).
 * Assim o assistente segue a língua que o visitante escolheu no site, em todas as línguas suportadas.
 */
export function resolveLivelyReplyLang(params: { uiLang: Lang; lastUserText: string }): Lang {
  const ex = explicitRequestedLang(params.lastUserText);
  if (ex) return ex;
  const t = params.lastUserText;
  if (params.uiLang === 'en') {
    if (PT_HEURISTIC.test(t)) return 'pt';
    if (ES_HEURISTIC.test(t)) return 'es';
    if (FR_HEURISTIC.test(t)) return 'fr';
    if (DE_HEURISTIC.test(t)) return 'de';
  }
  return params.uiLang;
}

/** Regras de estilo (em inglês) para o modelo — respostas diretas e multilingue. */
export function livelyAssistantStyleRules(langName: string): string {
  return `RESPONSE STYLE (mandatory):
- Write entirely in ${langName} unless the visitor explicitly asked for another language in their last message.
- Be direct: give the answer in the first 1–2 short sentences. No long introductions ("Sure!", "I'd be happy to…"), no filler, no repeating the whole question back.
- Default length: about 2–6 short sentences or ≤90 words. If the visitor asks for "more detail", "explain step by step", or similar, you may go longer.
- Use at most 5 bullet points when listing; each line one idea.
- If you lack information from the site JSON, say so briefly and suggest what they can do (e.g. use a link from the profile) instead of rambling.`;
}

/** Agendamento vertical/booking: só temos cópia PT/EN nas helpers atuais. */
export function bookingCopyLang(lang: Lang): 'en' | 'pt' {
  return lang === 'pt' ? 'pt' : 'en';
}

const REPLY_INSTRUCTIONS: Record<Lang, string> = {
  en: `Language: Reply in English. Match the visitor's tone briefly. Be concise — answer first, then stop unless detail is needed. If they explicitly ask for another language in their message, use that language for your reply.`,
  pt: `Idioma: Responde em português. Tom alinhado ao visitante, mas curto: resposta útil em primeiro lugar, sem rodeios. Se pedir explicitamente outro idioma, usa-o nessa resposta.`,
  es: `Idioma: español, tono cercano pero breve: primero la respuesta útil. Si piden otro idioma explícitamente, úsalo en esa respuesta.`,
  fr: `Langue : français, ton adapté mais concis : la réponse utile d’abord. Si une autre langue est demandée explicitement, utilise-la pour cette réponse.`,
  de: `Sprache: Deutsch, freundlich aber knapp: zuerst die Antwort. Wenn ausdrücklich eine andere Sprache gewünscht wird, in dieser Antwort verwenden.`,
  it: `Lingua: italiano, tono adeguato ma conciso: prima la risposta utile. Se chiedono esplicitamente un’altra lingua, usala in quella risposta.`,
  zh: `语言：简体中文，语气友好但要简短，先给有用答案。若访客明确要求其他语言，该轮用其语言。`,
  ja: `言語：日本語、丁寧だが簡潔に。まず要点。別の言語を明示的に求められたらその言語で。`,
  ko: `언어: 한국어, 친절하되 간결하게. 먼저 핵심 답변. 다른 언어를 명시적으로 요청하면 해당 언어로.`,
  ar: `اللغة: عربية فصحى مبسطة، لطيفة ومختصرة؛ الجواب المفيد أولًا. إذا طلب لغة أخرى صراحةً فاستخدمها في تلك الإجابة.`,
};

export function livelyReplyInstruction(lang: Lang): string {
  return REPLY_INSTRUCTIONS[lang] ?? REPLY_INSTRUCTIONS.en;
}

export function livelyAgentPersonaLine(replyLang: Lang): string {
  switch (replyLang) {
    case 'pt':
      return 'O assistente usa a imagem de perfil do criador no site; mantém tom profissional e acolhedor, coerente com essa identidade visual.';
    case 'es':
      return 'El asistente usa la imagen de perfil del creador; mantén un tono profesional y cercano, alineado con esa identidad visual.';
    case 'fr':
      return "L’assistant s’appuie sur la photo de profil du créateur ; ton professionnel et accueillant, cohérent avec cette identité visuelle.";
    case 'de':
      return 'Der Assistent bezieht sich auf das Profilbild des Erstellers; professioneller, freundlicher Ton, passend zum visuellen Auftritt.';
    case 'it':
      return "L’assistente si allinea all’immagine del profilo del creatore; tono professionale e accogliente, coerente con quell’identità visiva.";
    case 'zh':
      return '助手与创作者的头像形象一致；语气专业、友好，与视觉身份相符。';
    case 'ja':
      return 'アシスタントは作成者のプロフィール画像に沿う。プロフェッショナルで親しみやすいトーンを保つ。';
    case 'ko':
      return '어시스턴트는 크리에이터의 프로필 이미지와 맞춤. 전문적이고 친근한 톤을 유지.';
    case 'ar':
      return 'المساعد يتماشى مع صورة الملف الشخصي للمنشئ؛ نبرة مهنية ومرحبة بما يتوافق مع الهوية البصرية.';
    default:
      return 'The assistant uses the creator’s profile image on the site; keep a professional, welcoming tone consistent with that visual identity.';
  }
}

/** Saudação inicial do painel Lively quando não há `welcome` guardado (alinhada à bandeira). */
export function livelyDefaultVisitorGreeting(siteName: string, lang: Lang): string {
  const n = siteName.trim() || 'this page';
  switch (lang) {
    case 'pt':
      return `Olá! Sou o assistente de ${n} na TrustBank. Em que posso ajudar?`;
    case 'es':
      return `¡Hola! Soy el asistente de ${n} en TrustBank. ¿En qué puedo ayudarte?`;
    case 'fr':
      return `Bonjour ! Je suis l’assistant de ${n} sur TrustBank. Comment puis-je vous aider ?`;
    case 'de':
      return `Hallo! Ich bin der Assistent von ${n} auf TrustBank. Wie kann ich helfen?`;
    case 'it':
      return `Ciao! Sono l’assistente di ${n} su TrustBank. Come posso aiutarti?`;
    case 'zh':
      return `你好！我是 TrustBank 上 ${n} 的助手。需要什么帮助？`;
    case 'ja':
      return `こんにちは！TrustBank の ${n} のアシスタントです。何をお手伝いしましょうか？`;
    case 'ko':
      return `안녕하세요! TrustBank의 ${n} 도우미입니다. 무엇을 도와드릴까요?`;
    case 'ar':
      return `مرحبًا! أنا مساعد ${n} على TrustBank. كيف يمكنني المساعدة؟`;
    default:
      return `Hi! I'm ${n}'s assistant on TrustBank. How can I help?`;
  }
}
