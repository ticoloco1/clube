import React, { useState } from 'react';
import { Sparkles, TrendingUp, Zap, BarChart3, Brain, Loader2, Download, Share2 } from 'lucide-react';

const LotteryGenerator = () => {
  const [selectedLottery, setSelectedLottery] = useState('mega-sena');
  const [aiMode, setAiMode] = useState('normal');
  const [quantity, setQuantity] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState(null);

  const lotteries = {
    'mega-sena': { name: 'Mega-Sena', total: 60, pick: 6, min: 6, max: 15 },
    'quina': { name: 'Quina', total: 80, pick: 5, min: 5, max: 15 },
    'lotofacil': { name: 'Lotofácil', total: 25, pick: 15, min: 15, max: 20 },
    'powerball': { name: 'Powerball', total: 69, pick: 5, bonus: 26, min: 5, max: 5 },
    'euromillions': { name: 'EuroMillions', total: 50, pick: 5, stars: 12, min: 5, max: 5 }
  };

  const currentLottery = lotteries[selectedLottery];

  // Simulação de geração de números com IA
  const generateNumbers = async () => {
    setGenerating(true);
    
    // Simula chamada à API
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const games = [];
    for (let i = 0; i < quantity; i++) {
      const numbers = [];
      const usedNumbers = new Set();
      
      while (numbers.length < currentLottery.pick) {
        const num = Math.floor(Math.random() * currentLottery.total) + 1;
        if (!usedNumbers.has(num)) {
          usedNumbers.add(num);
          numbers.push(num);
        }
      }
      
      numbers.sort((a, b) => a - b);
      
      let bonus = null;
      if (currentLottery.bonus) {
        bonus = Math.floor(Math.random() * currentLottery.bonus) + 1;
      }
      
      let stars = null;
      if (currentLottery.stars) {
        stars = [];
        const usedStars = new Set();
        while (stars.length < 2) {
          const star = Math.floor(Math.random() * currentLottery.stars) + 1;
          if (!usedStars.has(star)) {
            usedStars.add(star);
            stars.push(star);
          }
        }
        stars.sort((a, b) => a - b);
      }
      
      games.push({
        id: i + 1,
        numbers,
        bonus,
        stars,
        confidence: aiMode === 'premium' 
          ? Math.floor(Math.random() * 20) + 80 
          : Math.floor(Math.random() * 30) + 50,
        analysis: aiMode === 'premium' ? {
          hotNumbers: numbers.slice(0, 3),
          pattern: ['Sequência balanceada', 'Números quentes incluídos', 'Distribuição par/ímpar otimizada'][Math.floor(Math.random() * 3)],
          frequency: 'Alta frequência nos últimos 30 sorteios'
        } : null
      });
    }
    
    setResults(games);
    setGenerating(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full mb-4 shadow-lg">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
            Gerador de Números <span className="text-yellow-400">com IA</span>
          </h1>
          <p className="text-xl text-purple-200">
            Tecnologia de ponta para suas apostas
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Configurações */}
          <div className="lg:col-span-1 space-y-6">
            {/* Seleção de Loteria */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Escolha a Loteria
              </h3>
              <select
                value={selectedLottery}
                onChange={(e) => setSelectedLottery(e.target.value)}
                className="w-full bg-white/10 border border-white/30 rounded-xl px-4 py-3 text-white font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {Object.entries(lotteries).map(([key, lottery]) => (
                  <option key={key} value={key} className="bg-purple-900">
                    {lottery.name}
                  </option>
                ))}
              </select>
              <div className="mt-4 p-4 bg-purple-600/30 rounded-xl">
                <p className="text-sm text-purple-200 mb-1">Formato</p>
                <p className="text-white font-bold">
                  {currentLottery.pick} números de {currentLottery.total}
                  {currentLottery.bonus && ` + 1 de ${currentLottery.bonus}`}
                  {currentLottery.stars && ` + 2 estrelas de ${currentLottery.stars}`}
                </p>
              </div>
            </div>

            {/* Modo de IA */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Brain className="w-5 h-5" />
                Modo de IA
              </h3>
              <div className="space-y-3">
                <button
                  onClick={() => setAiMode('normal')}
                  className={`w-full p-4 rounded-xl border-2 transition-all ${
                    aiMode === 'normal'
                      ? 'bg-blue-600/50 border-blue-400 shadow-lg shadow-blue-500/50'
                      : 'bg-white/5 border-white/20 hover:border-blue-400/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-bold">IA Normal</span>
                    <Zap className="w-5 h-5 text-blue-400" />
                  </div>
                  <p className="text-sm text-purple-200 text-left">
                    Geração rápida e eficiente
                  </p>
                  <p className="text-xs text-green-400 text-left mt-2">GRÁTIS</p>
                </button>

                <button
                  onClick={() => setAiMode('premium')}
                  className={`w-full p-4 rounded-xl border-2 transition-all ${
                    aiMode === 'premium'
                      ? 'bg-gradient-to-r from-yellow-600/50 to-orange-600/50 border-yellow-400 shadow-lg shadow-yellow-500/50'
                      : 'bg-white/5 border-white/20 hover:border-yellow-400/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-bold">IA Premium</span>
                    <Sparkles className="w-5 h-5 text-yellow-400" />
                  </div>
                  <p className="text-sm text-purple-200 text-left mb-2">
                    Análise avançada com estatísticas
                  </p>
                  <ul className="text-xs text-purple-200 text-left space-y-1">
                    <li>✓ Análise de frequência</li>
                    <li>✓ Padrões históricos</li>
                    <li>✓ Números quentes/frios</li>
                    <li>✓ Score de confiança</li>
                  </ul>
                  <p className="text-xs text-yellow-400 text-left mt-2 font-semibold">R$ 5,00 por jogo</p>
                </button>
              </div>
            </div>

            {/* Quantidade */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h3 className="text-lg font-bold text-white mb-4">Quantidade de Jogos</h3>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-12 h-12 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xl"
                >
                  −
                </button>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.min(20, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="flex-1 bg-white/10 border border-white/30 rounded-xl px-4 py-3 text-center text-2xl font-bold text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  onClick={() => setQuantity(Math.min(20, quantity + 1))}
                  className="w-12 h-12 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xl"
                >
                  +
                </button>
              </div>
              <p className="text-sm text-purple-200 text-center mt-3">Máximo: 20 jogos</p>
            </div>

            {/* Botão Gerar */}
            <button
              onClick={generateNumbers}
              disabled={generating}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-5 px-6 rounded-2xl shadow-xl shadow-green-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {generating ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Sparkles className="w-6 h-6" />
                  Gerar Números
                </>
              )}
            </button>

            {aiMode === 'premium' && quantity > 0 && (
              <div className="bg-gradient-to-r from-yellow-600/30 to-orange-600/30 backdrop-blur-lg rounded-xl p-4 border border-yellow-400/50">
                <p className="text-yellow-200 text-sm mb-2">Custo estimado:</p>
                <p className="text-white text-2xl font-bold">
                  R$ {(quantity * 5).toFixed(2)}
                </p>
              </div>
            )}
          </div>

          {/* Resultados */}
          <div className="lg:col-span-2">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 min-h-[600px]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-6 h-6" />
                  Seus Números
                </h3>
                {results && (
                  <div className="flex gap-2">
                    <button className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all">
                      <Download className="w-5 h-5 text-white" />
                    </button>
                    <button className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all">
                      <Share2 className="w-5 h-5 text-white" />
                    </button>
                  </div>
                )}
              </div>

              {!results && !generating && (
                <div className="flex flex-col items-center justify-center h-[500px] text-center">
                  <div className="w-32 h-32 bg-gradient-to-br from-purple-600/30 to-pink-600/30 rounded-full flex items-center justify-center mb-6">
                    <Sparkles className="w-16 h-16 text-purple-300" />
                  </div>
                  <h4 className="text-2xl font-bold text-white mb-3">Pronto para começar?</h4>
                  <p className="text-purple-200 max-w-md">
                    Configure suas preferências e clique em "Gerar Números" para receber suas combinações com inteligência artificial.
                  </p>
                </div>
              )}

              {generating && (
                <div className="flex flex-col items-center justify-center h-[500px]">
                  <Loader2 className="w-16 h-16 text-purple-400 animate-spin mb-6" />
                  <h4 className="text-2xl font-bold text-white mb-3">Analisando padrões...</h4>
                  <p className="text-purple-200">Nossa IA está processando os melhores números para você</p>
                </div>
              )}

              {results && (
                <div className="space-y-4 max-h-[540px] overflow-y-auto pr-2">
                  {results.map((game) => (
                    <div
                      key={game.id}
                      className="bg-gradient-to-r from-purple-600/30 to-pink-600/30 rounded-xl p-5 border border-white/20"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-white font-bold">Jogo #{game.id}</span>
                        {aiMode === 'premium' && (
                          <div className="flex items-center gap-2 bg-yellow-500/20 px-3 py-1 rounded-full">
                            <Sparkles className="w-4 h-4 text-yellow-400" />
                            <span className="text-yellow-400 text-sm font-bold">
                              {game.confidence}% confiança
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-3 mb-4">
                        {game.numbers.map((num, idx) => (
                          <div
                            key={idx}
                            className="w-14 h-14 bg-gradient-to-br from-green-400 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg"
                          >
                            <span className="text-white text-xl font-bold">{num}</span>
                          </div>
                        ))}
                        {game.bonus && (
                          <>
                            <div className="w-14 h-14 flex items-center justify-center">
                              <span className="text-purple-300 text-2xl font-bold">+</span>
                            </div>
                            <div className="w-14 h-14 bg-gradient-to-br from-red-400 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                              <span className="text-white text-xl font-bold">{game.bonus}</span>
                            </div>
                          </>
                        )}
                        {game.stars && (
                          <>
                            <div className="w-14 h-14 flex items-center justify-center">
                              <span className="text-purple-300 text-2xl">⭐</span>
                            </div>
                            {game.stars.map((star, idx) => (
                              <div
                                key={idx}
                                className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-orange-600 rounded-xl flex items-center justify-center shadow-lg"
                              >
                                <span className="text-white text-xl font-bold">{star}</span>
                              </div>
                            ))}
                          </>
                        )}
                      </div>

                      {game.analysis && (
                        <div className="bg-purple-900/50 rounded-lg p-4 space-y-2">
                          <p className="text-sm text-purple-200">
                            <strong className="text-white">Padrão:</strong> {game.analysis.pattern}
                          </p>
                          <p className="text-sm text-purple-200">
                            <strong className="text-white">Números Quentes:</strong>{' '}
                            {game.analysis.hotNumbers.join(', ')}
                          </p>
                          <p className="text-sm text-purple-200">
                            <strong className="text-white">Análise:</strong> {game.analysis.frequency}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LotteryGenerator;
