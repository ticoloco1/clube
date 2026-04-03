// services/claudeAIService.js
// Serviço de Integração com Claude AI (Anthropic) para Tarô e Loterias

const Anthropic = require('@anthropic-ai/sdk');

class ClaudeAIService {
  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    this.model = 'claude-sonnet-4-20250514';
  }

  // ============================================
  // LEITURA DE TARÔ
  // ============================================

  async generateTarotReading(cards, question, category, spreadType) {
    const cardsDescription = cards.map((card, idx) => {
      const position = this.getPositionName(spreadType, idx);
      return `${idx + 1}. ${card.name}${card.reversed ? ' (Invertida)' : ''} - Posição: ${position}
         Significado: ${card.meaning}`;
    }).join('\n');

    const categoryContext = {
      general: 'uma consulta geral sobre a vida',
      love: 'questões do coração e relacionamentos',
      career: 'carreira e vida profissional',
      spiritual: 'desenvolvimento espiritual e autoconhecimento',
      financial: 'situação financeira e prosperidade'
    };

    const prompt = `Você é um experiente e sábio leitor de Tarô com décadas de experiência. Você tem uma conexão profunda com o simbolismo das cartas e oferece interpretações precisas e significativas.

CONTEXTO DA LEITURA:
- Categoria: ${categoryContext[category]}
- Tipo de Tiragem: ${this.getSpreadName(spreadType)}
- Pergunta do Consulente: "${question}"

CARTAS SELECIONADAS:
${cardsDescription}

INSTRUÇÕES:
1. Forneça uma interpretação profunda e personalizada que conecte as cartas entre si
2. Relacione diretamente com a pergunta feita
3. Use linguagem acessível mas respeitosa
4. Seja específico sobre as energias e mensagens de cada carta
5. Ofereça insights práticos e orientação construtiva
6. Termine com um conselho sábio e encorajador
7. Não use jargões excessivos ou linguagem muito esotérica
8. Seja empático e considere a vulnerabilidade do consulente

A leitura deve ter entre 300-500 palavras e ser dividida em:
- Visão Geral
- Análise por Posição/Carta
- Conselho Final

Escreva em português brasileiro com tom acolhedor e sábio.`;

    try {
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      return message.content[0].text;
    } catch (error) {
      console.error('Erro ao gerar leitura de Tarô:', error);
      throw new Error('Não foi possível gerar a interpretação. Tente novamente.');
    }
  }

  getSpreadName(spreadType) {
    const names = {
      '1-card': 'Carta do Dia',
      '3-cards': 'Passado-Presente-Futuro',
      'celtic-cross': 'Cruz Céltica',
      'love': 'Amor em V',
      'career': 'Caminho Profissional'
    };
    return names[spreadType] || spreadType;
  }

  getPositionName(spreadType, index) {
    const positions = {
      '1-card': ['Orientação do Dia'],
      '3-cards': ['Passado', 'Presente', 'Futuro'],
      'celtic-cross': [
        'Situação Atual',
        'Desafio Imediato',
        'Objetivo Consciente',
        'Base da Situação',
        'Passado Recente',
        'Futuro Próximo',
        'Você',
        'Ambiente Externo',
        'Esperanças e Medos',
        'Resultado Final'
      ],
      'love': [
        'Você',
        'Outra Pessoa',
        'A Relação',
        'Desafios',
        'Resultado'
      ],
      'career': [
        'Situação Atual',
        'Habilidades',
        'Desafios',
        'Oportunidades',
        'Ação Recomendada',
        'Curto Prazo',
        'Longo Prazo'
      ]
    };

    return positions[spreadType]?.[index] || `Posição ${index + 1}`;
  }

  // ============================================
  // ANÁLISE DE LOTERIA COM IA PREMIUM
  // ============================================

  async analyzeLotteryWithAI(lotteryConfig, lotteryId, historicalData = null) {
    const prompt = `Você é um especialista em análise estatística de loterias e matemática aplicada.

LOTERIA: ${lotteryConfig.name}
CONFIGURAÇÃO: Escolher ${lotteryConfig.pick} números de ${lotteryConfig.total}

DADOS HISTÓRICOS DISPONÍVEIS:
${historicalData ? JSON.stringify(historicalData.slice(0, 50), null, 2) : 'Dados históricos limitados'}

TAREFA:
Gere uma combinação de ${lotteryConfig.pick} números baseada em:

1. ANÁLISE DE FREQUÊNCIA:
   - Identifique números que aparecem com mais frequência
   - Identifique números que aparecem com menos frequência
   - Considere o equilíbrio entre "números quentes" e "números frios"

2. DISTRIBUIÇÃO MATEMÁTICA:
   - Balanceamento entre números pares e ímpares
   - Distribuição ao longo do range (baixos, médios, altos)
   - Evite sequências óbvias ou padrões muito regulares

3. PADRÕES ESTATÍSTICOS:
   - Intervalos entre números
   - Presença de números consecutivos (máximo 2)
   - Soma total dos números deve estar na faixa ideal

4. ESTRATÉGIA INTELIGENTE:
   - 50% números quentes (alta frequência)
   - 30% números balanceados (frequência média)
   - 20% números frios (baixa frequência mas com potencial)

RESPONDA NO FORMATO JSON:
{
  "numbers": [array de ${lotteryConfig.pick} números ordenados],
  "confidence": número entre 75 e 95 (porcentagem de confiança),
  "analysis": {
    "hotNumbers": [números quentes incluídos],
    "coldNumbers": [números frios incluídos],
    "pattern": "descrição do padrão (ex: '4 pares / 2 ímpares')",
    "distribution": "descrição da distribuição (ex: 'Bem distribuído: 2 baixos, 2 médios, 2 altos')",
    "frequency": "análise da frequência geral",
    "reasoning": "breve explicação da estratégia usada (1-2 frases)"
  }
}`;

    try {
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const responseText = message.content[0].text;
      
      // Extrair JSON da resposta
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Resposta da IA não contém JSON válido');
      }

      const result = JSON.parse(jsonMatch[0]);

      // Validar números gerados
      this.validateGeneratedNumbers(result.numbers, lotteryConfig);

      return result;
    } catch (error) {
      console.error('Erro na análise de loteria com IA:', error);
      // Fallback para geração básica
      return this.generateBasicNumbers(lotteryConfig);
    }
  }

  validateGeneratedNumbers(numbers, config) {
    // Validar quantidade
    if (numbers.length !== config.pick) {
      throw new Error(`Quantidade incorreta de números: ${numbers.length} (esperado: ${config.pick})`);
    }

    // Validar range
    for (const num of numbers) {
      if (num < 1 || num > config.total) {
        throw new Error(`Número fora do range: ${num} (range: 1-${config.total})`);
      }
    }

    // Validar duplicatas
    const unique = new Set(numbers);
    if (unique.size !== numbers.length) {
      throw new Error('Números duplicados detectados');
    }

    return true;
  }

  generateBasicNumbers(config) {
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

    const evenCount = numbers.filter(n => n % 2 === 0).length;
    const oddCount = numbers.length - evenCount;

    return {
      numbers,
      confidence: Math.floor(Math.random() * 15) + 75,
      analysis: {
        hotNumbers: [],
        coldNumbers: [],
        pattern: `${evenCount} pares / ${oddCount} ímpares`,
        distribution: 'Distribuição aleatória',
        frequency: 'Análise básica',
        reasoning: 'Geração padrão sem análise histórica'
      }
    };
  }

  // ============================================
  // NUMEROLOGIA
  // ============================================

  async generateNumerologyReading(name, birthDate, question = null) {
    const prompt = `Você é um numerólogo experiente especializado em Numerologia Pitagórica.

DADOS DO CONSULENTE:
- Nome Completo: ${name}
- Data de Nascimento: ${birthDate}
${question ? `- Pergunta Específica: ${question}` : ''}

INSTRUÇÕES:
Calcule e interprete:

1. NÚMERO DO DESTINO (Life Path Number)
   - Soma da data de nascimento
   - Significado e características

2. NÚMERO DA EXPRESSÃO (Expression Number)
   - Baseado no nome completo
   - Talentos e potenciais

3. NÚMERO DA ALMA (Soul Urge Number)
   - Vogais do nome
   - Desejos internos

4. NÚMERO DA PERSONALIDADE (Personality Number)
   - Consoantes do nome
   - Como é percebido pelos outros

5. ANO PESSOAL ATUAL
   - Ciclo atual (2026)
   - Energias e oportunidades

Para cada número:
- Mostre o cálculo
- Explique o significado
- Dê insights práticos
- Relacione com a pergunta se houver

Seja específico, prático e encorajador. Use português brasileiro.
A leitura deve ter 400-600 palavras.`;

    try {
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 2500,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      return message.content[0].text;
    } catch (error) {
      console.error('Erro ao gerar leitura de Numerologia:', error);
      throw new Error('Não foi possível gerar a leitura numerológica.');
    }
  }

  // ============================================
  // ASTROLOGIA
  // ============================================

  async generateAstrologyReading(birthDate, birthTime, birthPlace, question = null) {
    const prompt = `Você é um astrólogo profissional com conhecimento profundo em Astrologia Ocidental.

DADOS NATAIS:
- Data de Nascimento: ${birthDate}
- Hora de Nascimento: ${birthTime}
- Local de Nascimento: ${birthPlace}
${question ? `- Pergunta: ${question}` : ''}

INSTRUÇÕES:
Forneça uma leitura astrológica que inclua:

1. SIGNO SOLAR
   - Características principais
   - Pontos fortes e desafios

2. SIGNO LUNAR
   - Mundo emocional
   - Necessidades internas

3. ASCENDENTE
   - Primeira impressão
   - Caminho de vida

4. TRÂNSITOS ATUAIS (Abril 2026)
   - Principais influências planetárias
   - Oportunidades e desafios

5. ORIENTAÇÃO PERSONALIZADA
   - Conselhos práticos
   - Áreas de foco

Seja específico e prático. Use português brasileiro.
Leitura: 500-700 palavras.`;

    try {
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 3000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      return message.content[0].text;
    } catch (error) {
      console.error('Erro ao gerar leitura de Astrologia:', error);
      throw new Error('Não foi possível gerar a leitura astrológica.');
    }
  }

  // ============================================
  // ANÁLISE DE MÚLTIPLAS GERAÇÕES
  // ============================================

  async optimizeMultipleGames(lotteryConfig, quantity, historicalData) {
    const prompt = `Você é um especialista em otimização de múltiplas apostas de loteria.

TAREFA: Gerar ${quantity} jogos DIFERENTES para ${lotteryConfig.name}

OBJETIVO:
- Maximizar cobertura de números
- Minimizar sobreposição entre jogos
- Manter qualidade estatística em cada jogo
- Cada jogo deve ter ${lotteryConfig.pick} números de ${lotteryConfig.total}

ESTRATÉGIA:
1. Distribua números quentes entre os jogos
2. Varie os padrões (pares/ímpares, distribuição)
3. Evite repetir os mesmos números em todos os jogos
4. Mantenha cada jogo estatisticamente sólido

RESPONDA COM ARRAY JSON:
[
  {
    "numbers": [números do jogo 1],
    "confidence": número,
    "pattern": "descrição"
  },
  ...
]`;

    try {
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 3000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const responseText = message.content[0].text;
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      
      if (!jsonMatch) {
        throw new Error('Resposta inválida da IA');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Erro na otimização de múltiplos jogos:', error);
      // Fallback: gerar jogos básicos
      return Array.from({ length: quantity }, () => 
        this.generateBasicNumbers(lotteryConfig)
      );
    }
  }
}

module.exports = new ClaudeAIService();
