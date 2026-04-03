import React, { useState } from 'react';
import { Settings, Sparkles, DollarSign, Globe, ChevronRight, Check, Lock } from 'lucide-react';

const AdminMysticLottery = () => {
  const [activeTab, setActiveTab] = useState('mystic');
  const [selectedMystic, setSelectedMystic] = useState(['tarot', 'numerology', 'astrology']);
  const [selectedLotteries, setSelectedLotteries] = useState(['mega-sena', 'quina', 'lotofacil', 'powerball', 'euromillions']);

  // Opções de Artes Místicas (10 total, 3 incluídas)
  const mysticOptions = [
    { id: 'tarot', name: 'Tarô', icon: '🔮', included: true },
    { id: 'numerology', name: 'Numerologia', icon: '🔢', included: true },
    { id: 'astrology', name: 'Astrologia', icon: '⭐', included: true },
    { id: 'runes', name: 'Runas', icon: 'ᚱ', price: 19.90 },
    { id: 'iching', name: 'I Ching', icon: '☯️', price: 19.90 },
    { id: 'buzios', name: 'Búzios', icon: '🐚', price: 19.90 },
    { id: 'crystals', name: 'Cristalomancia', icon: '💎', price: 24.90 },
    { id: 'cards', name: 'Cartomancia', icon: '🃏', price: 19.90 },
    { id: 'palmistry', name: 'Quiromancia', icon: '✋', price: 19.90 },
    { id: 'gypsy', name: 'Baralho Cigano', icon: '🌙', price: 24.90 }
  ];

  // Loterias do Mundo (40+ opções, 5 gratuitas)
  const lotteryOptions = [
    // Brasil (5 gratuitas)
    { id: 'mega-sena', name: 'Mega-Sena', country: '🇧🇷', numbers: '6 de 60', included: true },
    { id: 'quina', name: 'Quina', country: '🇧🇷', numbers: '5 de 80', included: true },
    { id: 'lotofacil', name: 'Lotofácil', country: '🇧🇷', numbers: '15 de 25', included: true },
    { id: 'lotomania', name: 'Lotomania', country: '🇧🇷', numbers: '50 de 100', included: true },
    { id: 'timemania', name: 'Timemania', country: '🇧🇷', numbers: '10 de 80', included: true },
    
    // Brasil - Pagas
    { id: 'dupla-sena', name: 'Dupla Sena', country: '🇧🇷', numbers: '6 de 50', price: 15 },
    { id: 'dia-de-sorte', name: 'Dia de Sorte', country: '🇧🇷', numbers: '7 de 31', price: 15 },
    { id: 'super-sete', name: 'Super Sete', country: '🇧🇷', numbers: '7 de 10', price: 15 },
    
    // EUA
    { id: 'powerball', name: 'Powerball', country: '🇺🇸', numbers: '5+1 de 69+26', price: 15 },
    { id: 'mega-millions', name: 'Mega Millions', country: '🇺🇸', numbers: '5+1 de 70+25', price: 15 },
    { id: 'cash4life', name: 'Cash4Life', country: '🇺🇸', numbers: '5+1 de 60+4', price: 15 },
    
    // Europa
    { id: 'euromillions', name: 'EuroMillions', country: '🇪🇺', numbers: '5+2 de 50+12', price: 15 },
    { id: 'eurojackpot', name: 'EuroJackpot', country: '🇪🇺', numbers: '5+2 de 50+12', price: 15 },
    { id: 'uk-lotto', name: 'UK National Lottery', country: '🇬🇧', numbers: '6 de 59', price: 15 },
    { id: 'el-gordo', name: 'El Gordo (Espanha)', country: '🇪🇸', numbers: '5+1 de 54+10', price: 15 },
    
    // Austrália
    { id: 'oz-lotto', name: 'Oz Lotto', country: '🇦🇺', numbers: '7 de 47', price: 15 },
    { id: 'powerball-au', name: 'Powerball Australia', country: '🇦🇺', numbers: '7+1 de 35+20', price: 15 },
    
    // Outros
    { id: 'canada-lotto', name: 'Canada Lotto 6/49', country: '🇨🇦', numbers: '6 de 49', price: 15 },
    { id: 'superenalotto', name: 'SuperEnalotto', country: '🇮🇹', numbers: '6 de 90', price: 15 }
  ];

  const toggleMystic = (id) => {
    if (selectedMystic.includes(id)) {
      // Não pode desmarcar se for included (mínimo 3)
      const item = mysticOptions.find(m => m.id === id);
      if (!item.included || selectedMystic.length > 3) {
        setSelectedMystic(selectedMystic.filter(m => m !== id));
      }
    } else {
      setSelectedMystic([...selectedMystic, id]);
    }
  };

  const toggleLottery = (id) => {
    if (selectedLotteries.includes(id)) {
      const item = lotteryOptions.find(l => l.id === id);
      if (!item.included || selectedLotteries.length > 5) {
        setSelectedLotteries(selectedLotteries.filter(l => l !== id));
      }
    } else {
      setSelectedLotteries([...selectedLotteries, id]);
    }
  };

  const calculateMysticCost = () => {
    return selectedMystic.reduce((total, id) => {
      const item = mysticOptions.find(m => m.id === id);
      return total + (item?.price || 0);
    }, 0);
  };

  const calculateLotteryCost = () => {
    return selectedLotteries.reduce((total, id) => {
      const item = lotteryOptions.find(l => l.id === id);
      return total + (item?.price || 0);
    }, 0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Módulos Místicos & Loterias</h1>
              <p className="text-purple-200">Configure os serviços disponíveis no seu minisite</p>
            </div>
            <Settings className="w-10 h-10 text-purple-300" />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('mystic')}
            className={`flex-1 py-4 px-6 rounded-xl font-semibold transition-all ${
              activeTab === 'mystic'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/50'
                : 'bg-white/10 text-purple-200 hover:bg-white/20'
            }`}
          >
            <Sparkles className="inline mr-2 w-5 h-5" />
            Artes Místicas
          </button>
          <button
            onClick={() => setActiveTab('lottery')}
            className={`flex-1 py-4 px-6 rounded-xl font-semibold transition-all ${
              activeTab === 'lottery'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/50'
                : 'bg-white/10 text-purple-200 hover:bg-white/20'
            }`}
          >
            <Globe className="inline mr-2 w-5 h-5" />
            Loterias Mundiais
          </button>
        </div>

        {/* Artes Místicas */}
        {activeTab === 'mystic' && (
          <div>
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Artes Místicas</h2>
                  <p className="text-purple-200">3 incluídas no plano • {selectedMystic.length} selecionadas</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-purple-200">Custo adicional/mês</p>
                  <p className="text-3xl font-bold text-green-400">
                    R$ {calculateMysticCost().toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mysticOptions.map((option) => {
                  const isSelected = selectedMystic.includes(option.id);
                  const isIncluded = option.included;
                  
                  return (
                    <button
                      key={option.id}
                      onClick={() => toggleMystic(option.id)}
                      className={`p-5 rounded-xl border-2 transition-all ${
                        isSelected
                          ? 'bg-purple-600/30 border-purple-400 shadow-lg shadow-purple-500/30'
                          : 'bg-white/5 border-white/10 hover:border-purple-400/50'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <span className="text-4xl">{option.icon}</span>
                        {isSelected && <Check className="w-6 h-6 text-green-400" />}
                        {!isSelected && !isIncluded && <Lock className="w-6 h-6 text-gray-400" />}
                      </div>
                      <h3 className="text-lg font-bold text-white mb-1">{option.name}</h3>
                      <p className={`text-sm ${isIncluded ? 'text-green-400' : 'text-purple-300'}`}>
                        {isIncluded ? '✓ Incluído no plano' : `R$ ${option.price}/mês`}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Loterias */}
        {activeTab === 'lottery' && (
          <div>
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Loterias Mundiais</h2>
                  <p className="text-purple-200">5 incluídas no plano • {selectedLotteries.length} selecionadas</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-purple-200">Custo adicional/mês</p>
                  <p className="text-3xl font-bold text-green-400">
                    US$ {calculateLotteryCost().toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Brasil */}
              <div className="mb-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                  🇧🇷 Brasil
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {lotteryOptions.filter(l => l.country === '🇧🇷').map((lottery) => {
                    const isSelected = selectedLotteries.includes(lottery.id);
                    const isIncluded = lottery.included;
                    
                    return (
                      <button
                        key={lottery.id}
                        onClick={() => toggleLottery(lottery.id)}
                        className={`p-5 rounded-xl border-2 transition-all text-left ${
                          isSelected
                            ? 'bg-green-600/30 border-green-400 shadow-lg shadow-green-500/30'
                            : 'bg-white/5 border-white/10 hover:border-green-400/50'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-3xl">{lottery.country}</span>
                          {isSelected && <Check className="w-6 h-6 text-green-400" />}
                          {!isSelected && !isIncluded && <Lock className="w-6 h-6 text-gray-400" />}
                        </div>
                        <h4 className="text-lg font-bold text-white mb-1">{lottery.name}</h4>
                        <p className="text-sm text-gray-300 mb-2">{lottery.numbers}</p>
                        <p className={`text-sm font-semibold ${isIncluded ? 'text-green-400' : 'text-yellow-400'}`}>
                          {isIncluded ? '✓ Incluído' : `US$ ${lottery.price}/mês`}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* EUA */}
              <div className="mb-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                  🇺🇸 Estados Unidos
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {lotteryOptions.filter(l => l.country === '🇺🇸').map((lottery) => {
                    const isSelected = selectedLotteries.includes(lottery.id);
                    
                    return (
                      <button
                        key={lottery.id}
                        onClick={() => toggleLottery(lottery.id)}
                        className={`p-5 rounded-xl border-2 transition-all text-left ${
                          isSelected
                            ? 'bg-blue-600/30 border-blue-400 shadow-lg shadow-blue-500/30'
                            : 'bg-white/5 border-white/10 hover:border-blue-400/50'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-3xl">{lottery.country}</span>
                          {isSelected && <Check className="w-6 h-6 text-green-400" />}
                          {!isSelected && <Lock className="w-6 h-6 text-gray-400" />}
                        </div>
                        <h4 className="text-lg font-bold text-white mb-1">{lottery.name}</h4>
                        <p className="text-sm text-gray-300 mb-2">{lottery.numbers}</p>
                        <p className="text-sm font-semibold text-yellow-400">
                          US$ {lottery.price}/mês
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Europa */}
              <div className="mb-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                  🇪🇺 Europa
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {lotteryOptions.filter(l => ['🇪🇺', '🇬🇧', '🇪🇸', '🇮🇹'].includes(l.country)).map((lottery) => {
                    const isSelected = selectedLotteries.includes(lottery.id);
                    
                    return (
                      <button
                        key={lottery.id}
                        onClick={() => toggleLottery(lottery.id)}
                        className={`p-5 rounded-xl border-2 transition-all text-left ${
                          isSelected
                            ? 'bg-purple-600/30 border-purple-400 shadow-lg shadow-purple-500/30'
                            : 'bg-white/5 border-white/10 hover:border-purple-400/50'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-3xl">{lottery.country}</span>
                          {isSelected && <Check className="w-6 h-6 text-green-400" />}
                          {!isSelected && <Lock className="w-6 h-6 text-gray-400" />}
                        </div>
                        <h4 className="text-lg font-bold text-white mb-1">{lottery.name}</h4>
                        <p className="text-sm text-gray-300 mb-2">{lottery.numbers}</p>
                        <p className="text-sm font-semibold text-yellow-400">
                          US$ {lottery.price}/mês
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Outros */}
              <div>
                <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                  🌎 Outros Países
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {lotteryOptions.filter(l => ['🇦🇺', '🇨🇦'].includes(l.country)).map((lottery) => {
                    const isSelected = selectedLotteries.includes(lottery.id);
                    
                    return (
                      <button
                        key={lottery.id}
                        onClick={() => toggleLottery(lottery.id)}
                        className={`p-5 rounded-xl border-2 transition-all text-left ${
                          isSelected
                            ? 'bg-orange-600/30 border-orange-400 shadow-lg shadow-orange-500/30'
                            : 'bg-white/5 border-white/10 hover:border-orange-400/50'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-3xl">{lottery.country}</span>
                          {isSelected && <Check className="w-6 h-6 text-green-400" />}
                          {!isSelected && <Lock className="w-6 h-6 text-gray-400" />}
                        </div>
                        <h4 className="text-lg font-bold text-white mb-1">{lottery.name}</h4>
                        <p className="text-sm text-gray-300 mb-2">{lottery.numbers}</p>
                        <p className="text-sm font-semibold text-yellow-400">
                          US$ {lottery.price}/mês
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Resumo e Ação */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">Custo Total Mensal</h3>
              <p className="text-purple-100">
                {selectedMystic.length} artes místicas • {selectedLotteries.length} loterias
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-purple-100 mb-1">Total</p>
              <p className="text-4xl font-bold text-white">
                R$ {(calculateMysticCost() + calculateLotteryCost() * 5.5).toFixed(2)}
              </p>
              <p className="text-sm text-purple-200 mt-1">
                + plano base
              </p>
            </div>
          </div>
          <button className="w-full mt-6 bg-white text-purple-600 font-bold py-4 px-6 rounded-xl hover:bg-purple-50 transition-all flex items-center justify-center gap-2">
            Salvar Configurações
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminMysticLottery;
