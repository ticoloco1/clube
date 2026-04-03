'use client';

import { useState, useMemo } from 'react';
import { Settings, Sparkles, Globe, ChevronRight, Check, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useT, type MessageKey } from '@/lib/i18n';

const MYSTIC_MOD_KEYS: Record<string, MessageKey> = {
  tarot: 'mystic_mod_tarot',
  numerology: 'mystic_mod_numerology',
  astrology: 'mystic_mod_astrology',
  runes: 'mystic_mod_runes',
  iching: 'mystic_mod_iching',
  buzios: 'mystic_mod_buzios',
  crystals: 'mystic_mod_crystals',
  cards: 'mystic_mod_cards',
  palmistry: 'mystic_mod_palmistry',
  gypsy: 'mystic_mod_gypsy',
};

type MysticOption = { id: string; name: string; icon: string; included?: boolean; price?: number };
type LotteryOption = {
  id: string;
  name: string;
  country: string;
  numbers: string;
  included?: boolean;
  price?: number;
};

const MYSTIC_OPTIONS: MysticOption[] = [
  { id: 'tarot', name: 'Tarô', icon: '🔮', included: true },
  { id: 'numerology', name: 'Numerologia', icon: '🔢', included: true },
  { id: 'astrology', name: 'Astrologia', icon: '⭐', included: true },
  { id: 'runes', name: 'Runas', icon: 'ᚱ', price: 19.9 },
  { id: 'iching', name: 'I Ching', icon: '☯️', price: 19.9 },
  { id: 'buzios', name: 'Búzios', icon: '🐚', price: 19.9 },
  { id: 'crystals', name: 'Cristalomancia', icon: '💎', price: 24.9 },
  { id: 'cards', name: 'Cartomancia', icon: '🃏', price: 19.9 },
  { id: 'palmistry', name: 'Quiromancia', icon: '✋', price: 19.9 },
  { id: 'gypsy', name: 'Baralho Cigano', icon: '🌙', price: 24.9 },
];

const LOTTERY_OPTIONS: LotteryOption[] = [
  { id: 'mega-sena', name: 'Mega-Sena', country: '🇧🇷', numbers: '6 de 60', included: true },
  { id: 'quina', name: 'Quina', country: '🇧🇷', numbers: '5 de 80', included: true },
  { id: 'lotofacil', name: 'Lotofácil', country: '🇧🇷', numbers: '15 de 25', included: true },
  { id: 'lotomania', name: 'Lotomania', country: '🇧🇷', numbers: '50 de 100', included: true },
  { id: 'timemania', name: 'Timemania', country: '🇧🇷', numbers: '10 de 80', included: true },
  { id: 'dupla-sena', name: 'Dupla Sena', country: '🇧🇷', numbers: '6 de 50', price: 15 },
  { id: 'dia-de-sorte', name: 'Dia de Sorte', country: '🇧🇷', numbers: '7 de 31', price: 15 },
  { id: 'super-sete', name: 'Super Sete', country: '🇧🇷', numbers: '7 de 10', price: 15 },
  { id: 'powerball', name: 'Powerball', country: '🇺🇸', numbers: '5+1 de 69+26', price: 15 },
  { id: 'mega-millions', name: 'Mega Millions', country: '🇺🇸', numbers: '5+1 de 70+25', price: 15 },
  { id: 'cash4life', name: 'Cash4Life', country: '🇺🇸', numbers: '5+1 de 60+4', price: 15 },
  { id: 'euromillions', name: 'EuroMillions', country: '🇪🇺', numbers: '5+2 de 50+12', price: 15 },
  { id: 'eurojackpot', name: 'EuroJackpot', country: '🇪🇺', numbers: '5+2 de 50+12', price: 15 },
  { id: 'uk-lotto', name: 'UK National Lottery', country: '🇬🇧', numbers: '6 de 59', price: 15 },
  { id: 'el-gordo', name: 'El Gordo (Espanha)', country: '🇪🇸', numbers: '5+1 de 54+10', price: 15 },
  { id: 'oz-lotto', name: 'Oz Lotto', country: '🇦🇺', numbers: '7 de 47', price: 15 },
  { id: 'powerball-au', name: 'Powerball Australia', country: '🇦🇺', numbers: '7+1 de 35+20', price: 15 },
  { id: 'canada-lotto', name: 'Canada Lotto 6/49', country: '🇨🇦', numbers: '6 de 49', price: 15 },
  { id: 'superenalotto', name: 'SuperEnalotto', country: '🇮🇹', numbers: '6 de 90', price: 15 },
];

export function AdminMysticLottery() {
  const T = useT();
  const [activeTab, setActiveTab] = useState<'mystic' | 'lottery'>('mystic');
  const [selectedMystic, setSelectedMystic] = useState<string[]>(['tarot', 'numerology', 'astrology']);
  const [selectedLotteries, setSelectedLotteries] = useState<string[]>([
    'mega-sena',
    'quina',
    'lotofacil',
    'powerball',
    'euromillions',
  ]);

  const toggleMystic = (id: string) => {
    if (selectedMystic.includes(id)) {
      const item = MYSTIC_OPTIONS.find((m) => m.id === id);
      if (!item?.included || selectedMystic.length > 3) {
        setSelectedMystic(selectedMystic.filter((m) => m !== id));
      }
    } else {
      setSelectedMystic([...selectedMystic, id]);
    }
  };

  const toggleLottery = (id: string) => {
    if (selectedLotteries.includes(id)) {
      const item = LOTTERY_OPTIONS.find((l) => l.id === id);
      if (!item?.included || selectedLotteries.length > 5) {
        setSelectedLotteries(selectedLotteries.filter((l) => l !== id));
      }
    } else {
      setSelectedLotteries([...selectedLotteries, id]);
    }
  };

  const calculateMysticCost = () =>
    selectedMystic.reduce((total, id) => {
      const item = MYSTIC_OPTIONS.find((m) => m.id === id);
      return total + (item?.price || 0);
    }, 0);

  const calculateLotteryCost = () =>
    selectedLotteries.reduce((total, id) => {
      const item = LOTTERY_OPTIONS.find((l) => l.id === id);
      return total + (item?.price || 0);
    }, 0);

  const lotterySections = useMemo(
    () =>
      [
        { titleKey: 'mystic_admin_section_br' as const, filter: (l: LotteryOption) => l.country === '🇧🇷' },
        { titleKey: 'mystic_admin_section_us' as const, filter: (l: LotteryOption) => l.country === '🇺🇸' },
        {
          titleKey: 'mystic_admin_section_eu' as const,
          filter: (l: LotteryOption) => ['🇪🇺', '🇬🇧', '🇪🇸', '🇮🇹'].includes(l.country),
        },
        { titleKey: 'mystic_admin_section_other' as const, filter: (l: LotteryOption) => ['🇦🇺', '🇨🇦'].includes(l.country) },
      ],
    [],
  );

  const handleSave = () => {
    if (selectedMystic.length < 3) {
      toast.error(T('mystic_admin_err_mystic_min'));
      return;
    }
    if (selectedLotteries.length < 5) {
      toast.error(T('mystic_admin_err_lottery_min'));
      return;
    }
    toast.success(T('mystic_admin_toast_saved'));
    try {
      localStorage.setItem(
        'tb_mystic_lottery_prefs',
        JSON.stringify({ selectedMystic, selectedLotteries, at: Date.now() }),
      );
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="min-h-[60vh] bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-6 rounded-2xl border border-white/10">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">{T('mystic_admin_title')}</h2>
              <p className="text-purple-200 text-sm">{T('mystic_admin_sub')}</p>
            </div>
            <Settings className="w-10 h-10 text-purple-300 shrink-0 hidden sm:block" />
          </div>
        </div>

        <div className="flex gap-2 md:gap-4 mb-6">
          <button
            type="button"
            onClick={() => setActiveTab('mystic')}
            className={`flex-1 py-3 md:py-4 px-4 rounded-xl font-semibold transition-all text-sm md:text-base ${
              activeTab === 'mystic'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/50'
                : 'bg-white/10 text-purple-200 hover:bg-white/20'
            }`}
          >
            <Sparkles className="inline mr-2 w-4 h-4 md:w-5 md:h-5 align-middle" />
            {T('mystic_admin_tab_mystic')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('lottery')}
            className={`flex-1 py-3 md:py-4 px-4 rounded-xl font-semibold transition-all text-sm md:text-base ${
              activeTab === 'lottery'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/50'
                : 'bg-white/10 text-purple-200 hover:bg-white/20'
            }`}
          >
            <Globe className="inline mr-2 w-4 h-4 md:w-5 md:h-5 align-middle" />
            {T('mystic_admin_tab_lottery')}
          </button>
        </div>

        {activeTab === 'mystic' && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-2">
              <div>
                <h3 className="text-xl font-bold text-white mb-1">{T('mystic_admin_mystic_heading')}</h3>
                <p className="text-purple-200 text-sm">
                  {T('mystic_admin_included_count').replace('{n}', String(selectedMystic.length))}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-sm text-purple-200">{T('mystic_admin_extra_cost')}</p>
                <p className="text-2xl font-bold text-green-400">US$ {calculateMysticCost().toFixed(2)}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {MYSTIC_OPTIONS.map((option) => {
                const isSelected = selectedMystic.includes(option.id);
                const isIncluded = option.included;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => toggleMystic(option.id)}
                    className={`p-5 rounded-xl border-2 transition-all text-left ${
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
                    <h3 className="text-lg font-bold text-white mb-1">
                      {MYSTIC_MOD_KEYS[option.id] ? T(MYSTIC_MOD_KEYS[option.id]) : option.name}
                    </h3>
                    <p className={`text-sm ${isIncluded ? 'text-green-400' : 'text-purple-300'}`}>
                      {isIncluded ? T('mystic_admin_plan_included') : T('mystic_admin_plan_addon').replace('{price}', String(option.price))}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'lottery' && (
          <div className="space-y-6">
            {lotterySections.map((section) => (
              <div key={section.titleKey} className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                <h3 className="text-xl font-bold text-white mb-4">{T(section.titleKey)}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {LOTTERY_OPTIONS.filter(section.filter).map((lottery) => {
                    const isSelected = selectedLotteries.includes(lottery.id);
                    const isIncluded = lottery.included;
                    return (
                      <button
                        key={lottery.id}
                        type="button"
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
                          {isIncluded
                            ? T('mystic_admin_included_short')
                            : T('mystic_admin_plan_addon').replace('{price}', String(lottery.price))}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-6 shadow-xl mt-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-white mb-2">{T('mystic_admin_summary')}</h3>
              <p className="text-purple-100 text-sm">
                {T('mystic_admin_summary_line')
                  .replace('{m}', String(selectedMystic.length))
                  .replace('{l}', String(selectedLotteries.length))}
              </p>
            </div>
            <div className="text-left md:text-right">
              <p className="text-sm text-purple-100 mb-1">{T('mystic_admin_example_extra')}</p>
              <p className="text-3xl font-bold text-white">
                {(calculateMysticCost() + calculateLotteryCost()).toFixed(2)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSave}
            className="w-full mt-6 bg-white text-purple-600 font-bold py-4 px-6 rounded-xl hover:bg-purple-50 transition-all flex items-center justify-center gap-2"
          >
            {T('mystic_admin_save')}
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
