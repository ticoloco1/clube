import React, { useState } from 'react';
import { Sparkles, Moon, Sun, Star, Heart, Briefcase, RefreshCw, Loader2 } from 'lucide-react';

const TarotReader = () => {
  const [spread, setSpread] = useState('3-cards');
  const [question, setQuestion] = useState('');
  const [category, setCategory] = useState('general');
  const [reading, setReading] = useState(null);
  const [isReading, setIsReading] = useState(false);
  const [flippedCards, setFlippedCards] = useState([]);

  const spreads = {
    '1-card': { name: 'Carta do Dia', cards: 1, description: 'Orientação rápida para hoje' },
    '3-cards': { name: 'Passado-Presente-Futuro', cards: 3, description: 'Visão temporal completa' },
    'celtic-cross': { name: 'Cruz Céltica', cards: 10, description: 'Leitura profunda e completa' },
    'love': { name: 'Amor em V', cards: 5, description: 'Especial para questões amorosas' },
    'career': { name: 'Caminho Profissional', cards: 7, description: 'Guia para decisões de carreira' }
  };

  const tarotDeck = [
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
    { name: 'O Mundo', arcana: 'maior', number: 21, meaning: 'Realização, completude, sucesso' }
  ];

  const performReading = async () => {
    if (!question.trim()) {
      alert('Por favor, faça uma pergunta para o Tarô');
      return;
    }

    setIsReading(true);
    setFlippedCards([]);
    
    // Simula o tempo de leitura
    await new Promise(resolve => setTimeout(resolve, 2000));

    const numCards = spreads[spread].cards;
    const selectedCards = [];
    const usedIndices = new Set();

    while (selectedCards.length < numCards) {
      const index = Math.floor(Math.random() * tarotDeck.length);
      if (!usedIndices.has(index)) {
        usedIndices.add(index);
        const card = { 
          ...tarotDeck[index], 
          reversed: Math.random() > 0.5,
          position: selectedCards.length
        };
        selectedCards.push(card);
      }
    }

    // Gera interpretação com IA (simulado)
    const interpretation = generateInterpretation(selectedCards, question, category);

    setReading({
      cards: selectedCards,
      interpretation,
      timestamp: new Date().toISOString()
    });
    setIsReading(false);
  };

  const generateInterpretation = (cards, userQuestion, cat) => {
    const contexts = {
      general: 'A energia atual sugere',
      love: 'No campo amoroso, as cartas revelam',
      career: 'Em sua jornada profissional, vejo',
      spiritual: 'Espiritualmente falando, o Tarô mostra',
      financial: 'Quanto às questões financeiras, percebo'
    };

    const transitions = [
      'Além disso,',
      'Por outro lado,',
      'É importante notar que',
      'O futuro indica que',
      'Lembre-se de que'
    ];

    let interpretation = `${contexts[cat]} `;
    
    cards.forEach((card, idx) => {
      const position = spread === '3-cards' 
        ? ['no passado', 'no presente', 'no futuro'][idx]
        : `na posição ${idx + 1}`;
      
      interpretation += `${idx > 0 ? transitions[idx % transitions.length] : ''} ${card.name}${card.reversed ? ' (invertida)' : ''} ${position} indica ${card.meaning.toLowerCase()}. `;
    });

    interpretation += `\n\nConselho: As energias presentes sugerem que você deve confiar em sua intuição e agir com sabedoria. O universo está conspirando a seu favor.`;

    return interpretation;
  };

  const flipCard = (index) => {
    if (!flippedCards.includes(index)) {
      setFlippedCards([...flippedCards, index]);
    }
  };

  const categories = [
    { id: 'general', name: 'Geral', icon: Star },
    { id: 'love', name: 'Amor', icon: Heart },
    { id: 'career', name: 'Carreira', icon: Briefcase },
    { id: 'spiritual', name: 'Espiritual', icon: Moon },
    { id: 'financial', name: 'Financeiro', icon: Sun }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-purple-950 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header Místico */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full mb-4 shadow-2xl shadow-purple-500/50">
            <Moon className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 mb-3">
            Leitura de Tarô
          </h1>
          <p className="text-xl text-purple-300">
            Descubra os mistérios do seu destino
          </p>
        </div>

        {/* Configuração */}
        {!reading && (
          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            {/* Coluna Esquerda */}
            <div className="space-y-6">
              {/* Categoria */}
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/30">
                <h3 className="text-lg font-bold text-white mb-4">Área da Consulta</h3>
                <div className="grid grid-cols-2 gap-3">
                  {categories.map((cat) => {
                    const Icon = cat.icon;
                    return (
                      <button
                        key={cat.id}
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

              {/* Tipo de Tiragem */}
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/30">
                <h3 className="text-lg font-bold text-white mb-4">Tipo de Tiragem</h3>
                <div className="space-y-3">
                  {Object.entries(spreads).map(([key, spreadInfo]) => (
                    <button
                      key={key}
                      onClick={() => setSpread(key)}
                      className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                        spread === key
                          ? 'bg-pink-600/50 border-pink-400 shadow-lg shadow-pink-500/50'
                          : 'bg-white/5 border-white/10 hover:border-pink-400/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white font-bold">{spreadInfo.name}</span>
                        <span className="text-purple-300 text-sm">{spreadInfo.cards} cartas</span>
                      </div>
                      <p className="text-sm text-purple-200">{spreadInfo.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Coluna Direita */}
            <div className="space-y-6">
              {/* Pergunta */}
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/30">
                <h3 className="text-lg font-bold text-white mb-4">Sua Pergunta</h3>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Faça sua pergunta ao Tarô com clareza e intenção..."
                  className="w-full h-40 bg-white/10 border border-purple-500/30 rounded-xl px-4 py-3 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
                <p className="text-sm text-purple-300 mt-3">
                  💫 Dica: Seja específico e concentre-se em sua intenção
                </p>
              </div>

              {/* Botão Consultar */}
              <button
                onClick={performReading}
                disabled={isReading || !question.trim()}
                className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 hover:from-purple-700 hover:via-pink-700 hover:to-purple-700 text-white font-bold py-6 px-6 rounded-2xl shadow-2xl shadow-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {isReading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Consultando as cartas...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-6 h-6" />
                    Realizar Leitura
                  </>
                )}
              </button>

              {/* Info */}
              <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 backdrop-blur-xl rounded-xl p-4 border border-purple-500/20">
                <p className="text-sm text-purple-200">
                  ✨ <strong className="text-white">Como funciona:</strong> Concentre-se em sua pergunta, 
                  escolha o tipo de tiragem e deixe a energia do Tarô guiar você para as respostas que procura.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Resultado da Leitura */}
        {reading && (
          <div className="space-y-6">
            {/* Cartas */}
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-purple-500/30">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white">Suas Cartas</h3>
                <button
                  onClick={() => {
                    setReading(null);
                    setQuestion('');
                    setFlippedCards([]);
                  }}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                  Nova Leitura
                </button>
              </div>

              <div className="flex flex-wrap justify-center gap-6 mb-8">
                {reading.cards.map((card, idx) => (
                  <div
                    key={idx}
                    onClick={() => flipCard(idx)}
                    className="cursor-pointer perspective-1000"
                  >
                    <div className={`relative w-32 h-48 transition-all duration-700 transform-style-3d ${
                      flippedCards.includes(idx) ? 'rotate-y-180' : ''
                    }`}>
                      {/* Verso */}
                      <div className="absolute inset-0 backface-hidden">
                        <div className="w-full h-full bg-gradient-to-br from-purple-900 to-pink-900 rounded-xl border-4 border-yellow-400 flex items-center justify-center shadow-2xl">
                          <Moon className="w-16 h-16 text-yellow-400" />
                        </div>
                      </div>
                      
                      {/* Frente */}
                      <div className="absolute inset-0 backface-hidden rotate-y-180">
                        <div className={`w-full h-full bg-gradient-to-br from-white to-purple-100 rounded-xl border-4 border-purple-600 p-3 shadow-2xl ${
                          card.reversed ? 'rotate-180' : ''
                        }`}>
                          <div className="text-center h-full flex flex-col justify-between">
                            <p className="text-xs font-bold text-purple-900">{card.number}</p>
                            <div>
                              <Star className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                              <p className="text-sm font-bold text-purple-900 leading-tight">
                                {card.name}
                              </p>
                            </div>
                            <p className="text-xs text-purple-700">
                              {card.reversed ? 'Invertida' : 'Normal'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-center text-purple-300 text-sm mt-3">
                      {spread === '3-cards' 
                        ? ['Passado', 'Presente', 'Futuro'][idx]
                        : `Posição ${idx + 1}`}
                    </p>
                  </div>
                ))}
              </div>

              {flippedCards.length < reading.cards.length && (
                <p className="text-center text-purple-300 text-sm">
                  👆 Clique nas cartas para revelá-las
                </p>
              )}
            </div>

            {/* Interpretação */}
            {flippedCards.length === reading.cards.length && (
              <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 backdrop-blur-xl rounded-2xl p-8 border border-purple-500/30">
                <div className="flex items-center gap-3 mb-6">
                  <Sparkles className="w-8 h-8 text-yellow-400" />
                  <h3 className="text-2xl font-bold text-white">Interpretação</h3>
                </div>
                
                <div className="bg-white/10 rounded-xl p-6 mb-6">
                  <p className="text-sm text-purple-300 mb-2">Sua pergunta:</p>
                  <p className="text-white font-semibold italic">"{question}"</p>
                </div>

                <div className="prose prose-invert max-w-none">
                  <p className="text-purple-100 text-lg leading-relaxed whitespace-pre-line">
                    {reading.interpretation}
                  </p>
                </div>

                <div className="mt-8 grid md:grid-cols-3 gap-4">
                  {reading.cards.map((card, idx) => (
                    <div key={idx} className="bg-white/5 rounded-xl p-4 border border-purple-500/20">
                      <p className="text-purple-300 text-sm mb-1">
                        {spread === '3-cards' 
                          ? ['Passado', 'Presente', 'Futuro'][idx]
                          : `Posição ${idx + 1}`}
                      </p>
                      <p className="text-white font-bold mb-2">
                        {card.name} {card.reversed && '(Invertida)'}
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

      <style jsx>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}</style>
    </div>
  );
};

export default TarotReader;
