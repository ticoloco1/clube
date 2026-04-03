'use client';

import { useState, useMemo } from 'react';
import { Sparkles, Moon, Sun, Star, Heart, Briefcase, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useT, useI18n, type Lang } from '@/lib/i18n';

type SpreadKey = '1-card' | '3-cards' | 'celtic-cross' | 'love' | 'career';

type TarotCard = {
  name: string;
  arcana: string;
  number: number;
  meaning: string;
  reversed: boolean;
  position: number;
};

const TAROT_DECK_PT: Omit<TarotCard, 'reversed' | 'position'>[] = [
  { name: 'O Louco', arcana: 'maior', number: 0, meaning: 'Novos começos, aventura, espontaneidade' },
  { name: 'O Mago', arcana: 'maior', number: 1, meaning: 'Manifestação, poder pessoal, ação' },
  { name: 'A Sacerdotisa', arcana: 'maior', number: 2, meaning: 'Intuição, mistério, conhecimento oculto' },
  { name: 'A Imperatriz', arcana: 'maior', number: 3, meaning: 'Abundância, nutrição, fertilidade' },
  { name: 'O Imperador', arcana: 'maior', number: 4, meaning: 'Autoridade, estrutura, controle' },
  { name: 'O Hierofante', arcana: 'maior', number: 5, meaning: 'Tradição, conformidade, moralidade' },
  { name: 'Os Amantes', arcana: 'maior', number: 6, meaning: 'Escolhas, união, relacionamentos' },
  { name: 'O Carro', arcana: 'maior', number: 7, meaning: 'Direção, controle, vitória' },
  { name: 'A Força', arcana: 'maior', number: 8, meaning: 'Coragem, paciência, compaixão' },
  { name: 'O Eremita', arcana: 'maior', number: 9, meaning: 'Introspecção, busca interior, solidão' },
  { name: 'A Roda da Fortuna', arcana: 'maior', number: 10, meaning: 'Ciclos, destino, mudanças' },
  { name: 'A Justiça', arcana: 'maior', number: 11, meaning: 'Equilíbrio, verdade, consequências' },
  { name: 'O Enforcado', arcana: 'maior', number: 12, meaning: 'Suspensão, rendição, nova perspectiva' },
  { name: 'A Morte', arcana: 'maior', number: 13, meaning: 'Transformação, fim de ciclos, renovação' },
  { name: 'A Temperança', arcana: 'maior', number: 14, meaning: 'Equilíbrio, moderação, paciência' },
  { name: 'O Diabo', arcana: 'maior', number: 15, meaning: 'Apego, materialismo, tentação' },
  { name: 'A Torre', arcana: 'maior', number: 16, meaning: 'Mudança súbita, revelação, liberação' },
  { name: 'A Estrela', arcana: 'maior', number: 17, meaning: 'Esperança, fé, renovação' },
  { name: 'A Lua', arcana: 'maior', number: 18, meaning: 'Ilusão, intuição, subconsciente' },
  { name: 'O Sol', arcana: 'maior', number: 19, meaning: 'Sucesso, vitalidade, positividade' },
  { name: 'O Julgamento', arcana: 'maior', number: 20, meaning: 'Julgamento, renascimento, perdão' },
  { name: 'O Mundo', arcana: 'maior', number: 21, meaning: 'Realização, completude, sucesso' },
];

const TAROT_DECK_EN: Omit<TarotCard, 'reversed' | 'position'>[] = [
  { name: 'The Fool', arcana: 'major', number: 0, meaning: 'New beginnings, adventure, spontaneity' },
  { name: 'The Magician', arcana: 'major', number: 1, meaning: 'Manifestation, personal power, action' },
  { name: 'The High Priestess', arcana: 'major', number: 2, meaning: 'Intuition, mystery, hidden knowledge' },
  { name: 'The Empress', arcana: 'major', number: 3, meaning: 'Abundance, nurture, creativity' },
  { name: 'The Emperor', arcana: 'major', number: 4, meaning: 'Authority, structure, control' },
  { name: 'The Hierophant', arcana: 'major', number: 5, meaning: 'Tradition, conformity, ethics' },
  { name: 'The Lovers', arcana: 'major', number: 6, meaning: 'Choices, union, relationships' },
  { name: 'The Chariot', arcana: 'major', number: 7, meaning: 'Direction, control, victory' },
  { name: 'Strength', arcana: 'major', number: 8, meaning: 'Courage, patience, compassion' },
  { name: 'The Hermit', arcana: 'major', number: 9, meaning: 'Introspection, inner search, solitude' },
  { name: 'Wheel of Fortune', arcana: 'major', number: 10, meaning: 'Cycles, fate, change' },
  { name: 'Justice', arcana: 'major', number: 11, meaning: 'Balance, truth, consequences' },
  { name: 'The Hanged Man', arcana: 'major', number: 12, meaning: 'Pause, surrender, new perspective' },
  { name: 'Death', arcana: 'major', number: 13, meaning: 'Transformation, endings, renewal' },
  { name: 'Temperance', arcana: 'major', number: 14, meaning: 'Balance, moderation, patience' },
  { name: 'The Devil', arcana: 'major', number: 15, meaning: 'Attachment, materialism, temptation' },
  { name: 'The Tower', arcana: 'major', number: 16, meaning: 'Sudden change, revelation, release' },
  { name: 'The Star', arcana: 'major', number: 17, meaning: 'Hope, faith, renewal' },
  { name: 'The Moon', arcana: 'major', number: 18, meaning: 'Illusion, intuition, the subconscious' },
  { name: 'The Sun', arcana: 'major', number: 19, meaning: 'Success, vitality, positivity' },
  { name: 'Judgement', arcana: 'major', number: 20, meaning: 'Reckoning, rebirth, forgiveness' },
  { name: 'The World', arcana: 'major', number: 21, meaning: 'Completion, fulfillment, success' },
];

type CategoryId = 'general' | 'love' | 'career' | 'spiritual' | 'financial';

function generateInterpretation(
  cards: TarotCard[],
  userQuestion: string,
  cat: CategoryId,
  spread: SpreadKey,
  lang: Lang,
): string {
  const pt = lang === 'pt';
  const contexts: Record<CategoryId, string> = {
    general: pt ? 'A energia atual sugere' : 'The current energy suggests',
    love: pt ? 'No campo amoroso, as cartas revelam' : 'In love and relationships, the cards show',
    career: pt ? 'Em sua jornada profissional, vejo' : 'On your professional path, I see',
    spiritual: pt ? 'Espiritualmente falando, o Tarô mostra' : 'Spiritually, the tarot points to',
    financial: pt ? 'Quanto às questões financeiras, percebo' : 'Regarding finances, I sense',
  };

  const transitions = pt
    ? ['Além disso,', 'Por outro lado,', 'É importante notar que', 'O futuro indica que', 'Lembre-se de que']
    : ['Also,', 'On the other hand,', 'It is worth noting that', 'Ahead,', 'Remember that'];

  let interpretation = `${contexts[cat]} `;

  cards.forEach((card, idx) => {
    const position =
      spread === '3-cards'
        ? (pt
            ? ['no passado', 'no presente', 'no futuro'][idx]
            : ['in the past', 'in the present', 'in the future'][idx]) ?? (pt ? `na posição ${idx + 1}` : `in position ${idx + 1}`)
        : pt
          ? `na posição ${idx + 1}`
          : `in position ${idx + 1}`;

    const rev = card.reversed ? (pt ? ' (invertida)' : ' (reversed)') : '';
    const verb = pt ? 'indica' : 'suggests';
    interpretation += `${idx > 0 ? `${transitions[idx % transitions.length]} ` : ''}${card.name}${rev} ${position} ${verb} ${card.meaning.toLowerCase()}. `;
  });

  const advice = pt
    ? `\n\nConselho: Entretenimento simbólico — não substitui aconselhamento profissional, médico ou jurídico. Reflita com calma sobre a sua pergunta: "${userQuestion.slice(0, 200)}${userQuestion.length > 200 ? '…' : ''}"`
    : `\n\nNote: Symbolic entertainment — not a substitute for professional, medical, or legal advice. Reflect calmly on your question: "${userQuestion.slice(0, 200)}${userQuestion.length > 200 ? '…' : ''}"`;

  interpretation += advice;
  return interpretation;
}

export function TarotReader() {
  const T = useT();
  const { lang } = useI18n();
  const deck = lang === 'pt' ? TAROT_DECK_PT : TAROT_DECK_EN;

  const SPREADS = useMemo(
    () =>
      ({
        '1-card': { name: T('mystic_tarot_spread_1_name'), cards: 1, description: T('mystic_tarot_spread_1_desc') },
        '3-cards': { name: T('mystic_tarot_spread_3_name'), cards: 3, description: T('mystic_tarot_spread_3_desc') },
        'celtic-cross': {
          name: T('mystic_tarot_spread_celtic_name'),
          cards: 10,
          description: T('mystic_tarot_spread_celtic_desc'),
        },
        love: { name: T('mystic_tarot_spread_love_name'), cards: 5, description: T('mystic_tarot_spread_love_desc') },
        career: {
          name: T('mystic_tarot_spread_career_name'),
          cards: 7,
          description: T('mystic_tarot_spread_career_desc'),
        },
      }) as Record<SpreadKey, { name: string; cards: number; description: string }>,
    [T],
  );

  const categories = useMemo(
    () =>
      [
        { id: 'general' as const, name: T('mystic_tarot_cat_general'), icon: Star },
        { id: 'love' as const, name: T('mystic_tarot_cat_love'), icon: Heart },
        { id: 'career' as const, name: T('mystic_tarot_cat_career'), icon: Briefcase },
        { id: 'spiritual' as const, name: T('mystic_tarot_cat_spiritual'), icon: Moon },
        { id: 'financial' as const, name: T('mystic_tarot_cat_financial'), icon: Sun },
      ],
    [T],
  );

  const [spread, setSpread] = useState<SpreadKey>('3-cards');
  const [question, setQuestion] = useState('');
  const [category, setCategory] = useState<CategoryId>('general');
  const [reading, setReading] = useState<{ cards: TarotCard[]; interpretation: string; timestamp: string } | null>(
    null,
  );
  const [isReading, setIsReading] = useState(false);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);

  const positionLabel = (idx: number) => {
    if (spread === '3-cards' && idx < 3) {
      return [T('mystic_tarot_past'), T('mystic_tarot_present'), T('mystic_tarot_future')][idx];
    }
    return T('mystic_tarot_position_n').replace('{n}', String(idx + 1));
  };

  const performReading = async () => {
    if (!question.trim()) {
      toast.error(T('mystic_tarot_err_empty_q'));
      return;
    }

    setIsReading(true);
    setFlippedCards([]);
    await new Promise((r) => setTimeout(r, 1500));

    const numCards = SPREADS[spread].cards;
    const selectedCards: TarotCard[] = [];
    const usedIndices = new Set<number>();

    while (selectedCards.length < numCards) {
      const index = Math.floor(Math.random() * deck.length);
      if (!usedIndices.has(index)) {
        usedIndices.add(index);
        const base = deck[index];
        selectedCards.push({
          ...base,
          reversed: Math.random() > 0.5,
          position: selectedCards.length,
        });
      }
    }

    const interpretation = generateInterpretation(selectedCards, question, category, spread, lang);

    setReading({
      cards: selectedCards,
      interpretation,
      timestamp: new Date().toISOString(),
    });
    setIsReading(false);
  };

  const flipCard = (index: number) => {
    if (!flippedCards.includes(index)) {
      setFlippedCards([...flippedCards, index]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-purple-950 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full mb-4 shadow-2xl shadow-purple-500/50">
            <Moon className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 mb-3">
            {T('mystic_tarot_page_title')}
          </h1>
          <p className="text-xl text-purple-300">{T('mystic_tarot_page_sub')}</p>
        </div>

        {!reading && (
          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            <div className="space-y-6">
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/30">
                <h3 className="text-lg font-bold text-white mb-4">{T('mystic_tarot_area_title')}</h3>
                <div className="grid grid-cols-2 gap-3">
                  {categories.map((cat) => {
                    const Icon = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          category === cat.id
                            ? 'bg-purple-600/50 border-purple-400 shadow-lg shadow-purple-500/50'
                            : 'bg-white/5 border-white/10 hover:border-purple-400/50'
                        }`}
                      >
                        <Icon className="w-6 h-6 text-purple-300 mb-2 mx-auto" />
                        <p className="text-white font-semibold text-sm">{cat.name}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/30">
                <h3 className="text-lg font-bold text-white mb-4">{T('mystic_tarot_spread_title')}</h3>
                <div className="space-y-3">
                  {(Object.keys(SPREADS) as SpreadKey[]).map((key) => {
                    const spreadInfo = SPREADS[key];
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSpread(key)}
                        className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                          spread === key
                            ? 'bg-pink-600/50 border-pink-400 shadow-lg shadow-pink-500/50'
                            : 'bg-white/5 border-white/10 hover:border-pink-400/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-white font-bold">{spreadInfo.name}</span>
                          <span className="text-purple-300 text-sm">
                            {T('mystic_tarot_cards_n').replace('{n}', String(spreadInfo.cards))}
                          </span>
                        </div>
                        <p className="text-sm text-purple-200">{spreadInfo.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/30">
                <h3 className="text-lg font-bold text-white mb-4">{T('mystic_tarot_question_title')}</h3>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder={T('mystic_tarot_question_ph')}
                  className="w-full h-40 bg-white/10 border border-purple-500/30 rounded-xl px-4 py-3 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
                <p className="text-sm text-purple-300 mt-3">💫 {T('mystic_tarot_question_note')}</p>
              </div>

              <button
                type="button"
                onClick={performReading}
                disabled={isReading || !question.trim()}
                className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 hover:from-purple-700 hover:via-pink-700 hover:to-purple-700 text-white font-bold py-6 px-6 rounded-2xl shadow-2xl shadow-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {isReading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    {T('mystic_tarot_consulting')}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-6 h-6" />
                    {T('mystic_tarot_do_reading')}
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {reading && (
          <div className="space-y-6">
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-purple-500/30">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white">{T('mystic_tarot_your_cards')}</h3>
                <button
                  type="button"
                  onClick={() => {
                    setReading(null);
                    setQuestion('');
                    setFlippedCards([]);
                  }}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                  {T('mystic_tarot_new_reading')}
                </button>
              </div>

              <div className="flex flex-wrap justify-center gap-6 mb-8">
                {reading.cards.map((card, idx) => (
                  <div key={idx} className="cursor-pointer tb-tarot-perspective" onClick={() => flipCard(idx)}>
                    <div
                      className={`relative w-32 h-48 tb-tarot-3d ${flippedCards.includes(idx) ? 'tb-tarot-flipped' : ''}`}
                    >
                      <div className="absolute inset-0 tb-tarot-backface">
                        <div className="w-full h-full bg-gradient-to-br from-purple-900 to-pink-900 rounded-xl border-4 border-yellow-400 flex items-center justify-center shadow-2xl">
                          <Moon className="w-16 h-16 text-yellow-400" />
                        </div>
                      </div>

                      <div className="absolute inset-0 tb-tarot-backface tb-tarot-face-back">
                        <div
                          className={`w-full h-full bg-gradient-to-br from-white to-purple-100 rounded-xl border-4 border-purple-600 p-3 shadow-2xl ${
                            card.reversed ? 'rotate-180' : ''
                          }`}
                        >
                          <div className="text-center h-full flex flex-col justify-between">
                            <p className="text-xs font-bold text-purple-900">{card.number}</p>
                            <div>
                              <Star className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                              <p className="text-sm font-bold text-purple-900 leading-tight">{card.name}</p>
                            </div>
                            <p className="text-xs text-purple-700">
                              {card.reversed ? T('mystic_tarot_reversed') : T('mystic_tarot_upright')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-center text-purple-300 text-sm mt-3">{positionLabel(idx)}</p>
                  </div>
                ))}
              </div>

              {flippedCards.length < reading.cards.length && (
                <p className="text-center text-purple-300 text-sm">👆 {T('mystic_tarot_tap_cards')}</p>
              )}
            </div>

            {flippedCards.length === reading.cards.length && (
              <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 backdrop-blur-xl rounded-2xl p-8 border border-purple-500/30">
                <div className="flex items-center gap-3 mb-6">
                  <Sparkles className="w-8 h-8 text-yellow-400" />
                  <h3 className="text-2xl font-bold text-white">{T('mystic_tarot_interpretation')}</h3>
                </div>

                <div className="bg-white/10 rounded-xl p-6 mb-6">
                  <p className="text-sm text-purple-300 mb-2">{T('mystic_tarot_q_label')}</p>
                  <p className="text-white font-semibold italic">&quot;{question}&quot;</p>
                </div>

                <div className="prose prose-invert max-w-none">
                  <p className="text-purple-100 text-lg leading-relaxed whitespace-pre-line">{reading.interpretation}</p>
                </div>

                <div className="mt-8 grid md:grid-cols-3 gap-4">
                  {reading.cards.map((card, idx) => (
                    <div key={idx} className="bg-white/5 rounded-xl p-4 border border-purple-500/20">
                      <p className="text-purple-300 text-sm mb-1">{positionLabel(idx)}</p>
                      <p className="text-white font-bold mb-2">
                        {card.name} {card.reversed && T('mystic_tarot_reversed_paren')}
                      </p>
                      <p className="text-purple-200 text-sm">{card.meaning}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
