// API Backend para Sistema de Tarô e Loterias - TrustBank
// Este arquivo deve ser integrado ao backend Node.js/Express existente

const express = require('express');
const router = express.Router();

// ==================== CONFIGURAÇÕES DO USUÁRIO ====================

// GET - Buscar configurações ativas do usuário
router.get('/api/user/:userId/mystic-lottery/config', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Buscar no banco de dados
    const config = await db.query(`
      SELECT 
        selected_mystic_modules,
        selected_lotteries,
        plan_type,
        additional_cost
      FROM user_mystic_lottery_config
      WHERE user_id = $1
    `, [userId]);

    res.json({
      success: true,
      data: config.rows[0] || {
        selected_mystic_modules: ['tarot', 'numerology', 'astrology'], // 3 padrão
        selected_lotteries: ['mega-sena', 'quina', 'lotofacil', 'powerball', 'euromillions'], // 5 padrão
        plan_type: 'basic',
        additional_cost: 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST - Atualizar configurações
router.post('/api/user/:userId/mystic-lottery/config', async (req, res) => {
  try {
    const { userId } = req.params;
    const { selected_mystic_modules, selected_lotteries } = req.body;

    // Validar quantidade
    if (selected_mystic_modules.length < 3) {
      return res.status(400).json({ 
        success: false, 
        error: 'Mínimo de 3 módulos místicos obrigatórios' 
      });
    }

    if (selected_lotteries.length < 5) {
      return res.status(400).json({ 
        success: false, 
        error: 'Mínimo de 5 loterias obrigatórias' 
      });
    }

    // Calcular custo adicional
    const mysticCost = calculateMysticCost(selected_mystic_modules);
    const lotteryCost = calculateLotteryCost(selected_lotteries);
    const totalCost = mysticCost + lotteryCost;

    // Salvar no banco
    await db.query(`
      INSERT INTO user_mystic_lottery_config 
      (user_id, selected_mystic_modules, selected_lotteries, additional_cost, updated_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        selected_mystic_modules = $2,
        selected_lotteries = $3,
        additional_cost = $4,
        updated_at = NOW()
    `, [userId, JSON.stringify(selected_mystic_modules), JSON.stringify(selected_lotteries), totalCost]);

    res.json({
      success: true,
      data: {
        additional_cost: totalCost,
        mystic_cost: mysticCost,
        lottery_cost: lotteryCost
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== GERADOR DE LOTERIAS ====================

// Configuração das loterias
const LOTTERIES_CONFIG = {
  'mega-sena': { total: 60, pick: 6, min: 6, max: 15, name: 'Mega-Sena' },
  'quina': { total: 80, pick: 5, min: 5, max: 15, name: 'Quina' },
  'lotofacil': { total: 25, pick: 15, min: 15, max: 20, name: 'Lotofácil' },
  'lotomania': { total: 100, pick: 50, min: 50, max: 50, name: 'Lotomania' },
  'powerball': { total: 69, pick: 5, bonus: 26, min: 5, max: 5, name: 'Powerball' },
  'euromillions': { total: 50, pick: 5, stars: 12, min: 5, max: 5, name: 'EuroMillions' }
};

// POST - Gerar números de loteria
router.post('/api/lottery/generate', async (req, res) => {
  try {
    const { lottery_id, quantity, ai_mode, user_id, client_id } = req.body;

    // Validar loteria
    const lotteryConfig = LOTTERIES_CONFIG[lottery_id];
    if (!lotteryConfig) {
      return res.status(400).json({ success: false, error: 'Loteria não encontrada' });
    }

    // Verificar se usuário tem acesso à loteria
    const hasAccess = await checkLotteryAccess(user_id, lottery_id);
    if (!hasAccess) {
      return res.status(403).json({ 
        success: false, 
        error: 'Você não tem acesso a esta loteria. Atualize seu plano.' 
      });
    }

    // Gerar números
    const games = [];
    for (let i = 0; i < quantity; i++) {
      const game = ai_mode === 'premium' 
        ? await generateNumbersWithPremiumAI(lotteryConfig, lottery_id)
        : generateNumbersBasic(lotteryConfig);
      
      games.push(game);
    }

    // Calcular custo
    const cost = ai_mode === 'premium' ? quantity * 5.0 : 0;

    // Salvar histórico
    await db.query(`
      INSERT INTO lottery_generation_history 
      (user_id, client_id, lottery_id, ai_mode, quantity, games, cost, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    `, [user_id, client_id, lottery_id, ai_mode, quantity, JSON.stringify(games), cost]);

    // Se for premium, debitar do saldo
    if (ai_mode === 'premium' && cost > 0) {
      await debitUserBalance(user_id, cost);
    }

    res.json({
      success: true,
      data: {
        games,
        cost,
        lottery_name: lotteryConfig.name,
        generated_at: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Função para gerar números básicos
function generateNumbersBasic(config) {
  const numbers = [];
  const usedNumbers = new Set();
  
  while (numbers.length < config.pick) {
    const num = Math.floor(Math.random() * config.total) + 1;
    if (!usedNumbers.has(num)) {
      usedNumbers.add(num);
      numbers.push(num);
    }
  }
  
  numbers.sort((a, b) => a - b);
  
  let result = { numbers };
  
  if (config.bonus) {
    result.bonus = Math.floor(Math.random() * config.bonus) + 1;
  }
  
  if (config.stars) {
    const stars = [];
    const usedStars = new Set();
    while (stars.length < 2) {
      const star = Math.floor(Math.random() * config.stars) + 1;
      if (!usedStars.has(star)) {
        usedStars.add(star);
        stars.push(star);
      }
    }
    result.stars = stars.sort((a, b) => a - b);
  }
  
  return result;
}

// Função para gerar números com IA Premium (simulado - integrar com Claude API)
async function generateNumbersWithPremiumAI(config, lotteryId) {
  // Buscar dados históricos (simulado)
  const historicalData = await getHistoricalData(lotteryId);
  
  // Análise de frequência
  const hotNumbers = analyzeHotNumbers(historicalData, config.total);
  const coldNumbers = analyzeColdNumbers(historicalData, config.total);
  
  // Gerar números balanceados
  const numbers = [];
  const usedNumbers = new Set();
  
  // 50% números quentes, 30% balanceados, 20% frios
  const hotCount = Math.ceil(config.pick * 0.5);
  const coldCount = Math.ceil(config.pick * 0.2);
  
  // Adicionar números quentes
  for (let i = 0; i < hotCount && numbers.length < config.pick; i++) {
    if (hotNumbers[i] && !usedNumbers.has(hotNumbers[i])) {
      usedNumbers.add(hotNumbers[i]);
      numbers.push(hotNumbers[i]);
    }
  }
  
  // Adicionar números frios
  for (let i = 0; i < coldCount && numbers.length < config.pick; i++) {
    if (coldNumbers[i] && !usedNumbers.has(coldNumbers[i])) {
      usedNumbers.add(coldNumbers[i]);
      numbers.push(coldNumbers[i]);
    }
  }
  
  // Completar com números aleatórios balanceados
  while (numbers.length < config.pick) {
    const num = Math.floor(Math.random() * config.total) + 1;
    if (!usedNumbers.has(num)) {
      usedNumbers.add(num);
      numbers.push(num);
    }
  }
  
  numbers.sort((a, b) => a - b);
  
  // Calcular padrões
  const evenCount = numbers.filter(n => n % 2 === 0).length;
  const oddCount = numbers.length - evenCount;
  const confidence = calculateConfidence(numbers, historicalData);
  
  let result = {
    numbers,
    confidence: Math.floor(confidence * 100),
    analysis: {
      hotNumbers: numbers.filter(n => hotNumbers.includes(n)),
      coldNumbers: numbers.filter(n => coldNumbers.includes(n)),
      pattern: `${evenCount} pares / ${oddCount} ímpares`,
      frequency: determineFrequency(numbers, historicalData)
    }
  };
  
  // Adicionar bônus/estrelas se necessário
  if (config.bonus) {
    result.bonus = Math.floor(Math.random() * config.bonus) + 1;
  }
  
  if (config.stars) {
    const stars = [];
    const usedStars = new Set();
    while (stars.length < 2) {
      const star = Math.floor(Math.random() * config.stars) + 1;
      if (!usedStars.has(star)) {
        usedStars.add(star);
        stars.push(star);
      }
    }
    result.stars = stars.sort((a, b) => a - b);
  }
  
  return result;
}

// ==================== LEITURA DE TARÔ ====================

const TAROT_DECK = [
  { id: 0, name: 'O Louco', arcana: 'maior', meaning: 'Novos começos, aventura, espontaneidade' },
  { id: 1, name: 'O Mago', arcana: 'maior', meaning: 'Manifestação, poder pessoal, ação' },
  { id: 2, name: 'A Sacerdotisa', arcana: 'maior', meaning: 'Intuição, mistério, conhecimento oculto' },
  // ... resto do baralho
];

// POST - Realizar leitura de Tarô
router.post('/api/tarot/reading', async (req, res) => {
  try {
    const { spread_type, question, category, user_id, client_id } = req.body;

    const spreadConfigs = {
      '1-card': { cards: 1, name: 'Carta do Dia' },
      '3-cards': { cards: 3, name: 'Passado-Presente-Futuro' },
      'celtic-cross': { cards: 10, name: 'Cruz Céltica' },
      'love': { cards: 5, name: 'Amor em V' },
      'career': { cards: 7, name: 'Caminho Profissional' }
    };

    const spreadConfig = spreadConfigs[spread_type];
    if (!spreadConfig) {
      return res.status(400).json({ success: false, error: 'Tipo de tiragem inválido' });
    }

    // Gerar cartas aleatórias
    const selectedCards = [];
    const usedIndices = new Set();

    while (selectedCards.length < spreadConfig.cards) {
      const index = Math.floor(Math.random() * TAROT_DECK.length);
      if (!usedIndices.has(index)) {
        usedIndices.add(index);
        const card = { 
          ...TAROT_DECK[index], 
          reversed: Math.random() > 0.5,
          position: selectedCards.length
        };
        selectedCards.push(card);
      }
    }

    // Gerar interpretação com Claude API (aqui você integraria com a API da Anthropic)
    const interpretation = await generateTarotInterpretation(selectedCards, question, category, spread_type);

    // Salvar no histórico
    await db.query(`
      INSERT INTO tarot_reading_history 
      (user_id, client_id, spread_type, question, category, cards, interpretation, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    `, [user_id, client_id, spread_type, question, category, JSON.stringify(selectedCards), interpretation]);

    res.json({
      success: true,
      data: {
        cards: selectedCards,
        interpretation,
        spread_name: spreadConfig.name,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Função para gerar interpretação de Tarô com IA
async function generateTarotInterpretation(cards, question, category, spreadType) {
  // Aqui você pode integrar com a API Claude da Anthropic
  // Por enquanto, retornando uma interpretação simulada
  
  const contexts = {
    general: 'A energia atual sugere',
    love: 'No campo amoroso, as cartas revelam',
    career: 'Em sua jornada profissional, vejo',
    spiritual: 'Espiritualmente falando, o Tarô mostra',
    financial: 'Quanto às questões financeiras, percebo'
  };

  let interpretation = `${contexts[category]} `;
  
  cards.forEach((card, idx) => {
    const position = spreadType === '3-cards' 
      ? ['no passado', 'no presente', 'no futuro'][idx]
      : `na posição ${idx + 1}`;
    
    interpretation += `${card.name}${card.reversed ? ' (invertida)' : ''} ${position} indica ${card.meaning.toLowerCase()}. `;
  });

  interpretation += `\n\nConselho: As energias presentes sugerem que você deve confiar em sua intuição e agir com sabedoria.`;

  return interpretation;
}

// ==================== FUNÇÕES AUXILIARES ====================

function calculateMysticCost(modules) {
  const prices = {
    'runes': 19.90,
    'iching': 19.90,
    'buzios': 19.90,
    'crystals': 24.90,
    'cards': 19.90,
    'palmistry': 19.90,
    'gypsy': 24.90
  };

  return modules.reduce((total, module) => {
    return total + (prices[module] || 0);
  }, 0);
}

function calculateLotteryCost(lotteries) {
  const freeLotteries = ['mega-sena', 'quina', 'lotofacil', 'lotomania', 'timemania'];
  return lotteries.filter(l => !freeLotteries.includes(l)).length * 15;
}

async function checkLotteryAccess(userId, lotteryId) {
  const config = await db.query(
    'SELECT selected_lotteries FROM user_mystic_lottery_config WHERE user_id = $1',
    [userId]
  );
  
  if (!config.rows[0]) return false;
  
  const selectedLotteries = JSON.parse(config.rows[0].selected_lotteries);
  return selectedLotteries.includes(lotteryId);
}

async function debitUserBalance(userId, amount) {
  await db.query(
    'UPDATE users SET balance = balance - $1 WHERE id = $2',
    [amount, userId]
  );
}

// Funções de análise de loteria (simuladas - você pode integrar dados reais)
async function getHistoricalData(lotteryId) {
  // Retornar dados históricos reais da loteria
  return [];
}

function analyzeHotNumbers(data, total) {
  // Análise de números mais sorteados
  return Array.from({length: 10}, (_, i) => Math.floor(Math.random() * total) + 1);
}

function analyzeColdNumbers(data, total) {
  // Análise de números menos sorteados
  return Array.from({length: 10}, (_, i) => Math.floor(Math.random() * total) + 1);
}

function calculateConfidence(numbers, data) {
  return 0.75 + Math.random() * 0.20; // 75-95%
}

function determineFrequency(numbers, data) {
  const frequencies = [
    'Alta frequência nos últimos 30 sorteios',
    'Frequência moderada com tendência crescente',
    'Padrão equilibrado entre quentes e frios',
    'Números com baixa repetição recente'
  ];
  return frequencies[Math.floor(Math.random() * frequencies.length)];
}

module.exports = router;
