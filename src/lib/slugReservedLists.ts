/**
 * Slugs reservados: só o admin pode registar (painel /slugs ou admin).
 * Inclui países (nome em slug), cidades conhecidas e termos bancários/financeiros.
 * Comparação usa só [a-z0-9] (hífens ignorados).
 */

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Países e territórios (inglês + alguns PT/ES comuns em slug). */
export const COUNTRY_SLUGS: string[] = [
  'afghanistan', 'albania', 'algeria', 'andorra', 'angola', 'argentina', 'armenia', 'australia', 'austria', 'azerbaijan',
  'bahamas', 'bahrain', 'bangladesh', 'barbados', 'belarus', 'belgium', 'belize', 'benin', 'bhutan', 'bolivia',
  'bosnia', 'botswana', 'brazil', 'brasil', 'brunei', 'bulgaria', 'burkinafaso', 'burundi',
  'cambodia', 'cameroon', 'canada', 'capeverde', 'centralafricanrepublic', 'chad', 'chile', 'china', 'colombia',
  'comoros', 'congo', 'costarica', 'croatia', 'cuba', 'cyprus', 'czechia', 'czechrepublic', 'denmark', 'djibouti',
  'dominica', 'dominicanrepublic', 'ecuador', 'egypt', 'elsalvador', 'equatorialguinea', 'eritrea', 'estonia', 'eswatini',
  'ethiopia', 'fiji', 'finland', 'france', 'gabon', 'gambia', 'georgia', 'germany', 'deutschland', 'ghana', 'greece',
  'grenada', 'guatemala', 'guinea', 'guineabissau', 'guyana', 'haiti', 'honduras', 'hungary', 'iceland', 'india',
  'indonesia', 'iran', 'iraq', 'ireland', 'israel', 'italy', 'italia', 'jamaica', 'japan', 'jordan', 'kazakhstan',
  'kenya', 'kiribati', 'kosovo', 'kuwait', 'kyrgyzstan', 'laos', 'latvia', 'lebanon', 'lesotho', 'liberia', 'libya',
  'liechtenstein', 'lithuania', 'luxembourg', 'madagascar', 'malawi', 'malaysia', 'maldives', 'mali', 'malta',
  'marshallislands', 'mauritania', 'mauritius', 'mexico', 'micronesia', 'moldova', 'monaco', 'mongolia', 'montenegro',
  'morocco', 'mozambique', 'myanmar', 'namibia', 'nauru', 'nepal', 'netherlands', 'holland', 'newzealand', 'nicaragua',
  'niger', 'nigeria', 'northkorea', 'northmacedonia', 'norway', 'oman', 'pakistan', 'palau', 'palestine', 'panama',
  'papuanewguinea', 'paraguay', 'peru', 'philippines', 'poland', 'polonia', 'portugal', 'qatar', 'romania', 'russia',
  'rwanda', 'samoa', 'sanmarino', 'saudiarabia', 'senegal', 'serbia', 'seychelles', 'sierraleone', 'singapore',
  'slovakia', 'slovenia', 'solomonislands', 'somalia', 'southafrica', 'southkorea', 'southsudan', 'spain', 'espana',
  'srilanka', 'sudan', 'suriname', 'sweden', 'switzerland', 'syria', 'taiwan', 'tajikistan', 'tanzania', 'thailand',
  'timorleste', 'togo', 'tonga', 'trinidad', 'tunisia', 'turkey', 'turkiye', 'turkmenistan', 'tuvalu', 'uganda',
  'ukraine', 'uae', 'unitedarabemirates', 'unitedkingdom', 'uk', 'greatbritain', 'britain', 'england', 'scotland', 'wales',
  'unitedstates', 'usa', 'us', 'uruguay', 'uzbekistan', 'vanuatu', 'vatican', 'venezuela', 'vietnam', 'vietnam',
  'yemen', 'zambia', 'zimbabwe', 'europeanunion', 'eu', 'europe', 'america', 'africa', 'asia', 'oceania', 'antarctica',
  'hongkong', 'macau', 'puertorico', 'greenland', 'bermuda', 'cayman', 'caymanislands', 'virginislands', 'aruba',
  'curacao', 'gibraltar', 'monaco', 'liechtenstein', 'faroe', 'jersey', 'guernsey', 'isleofman',
];

/** Cidades (slug comum); expandir conforme necessário. */
export const CITY_SLUGS: string[] = [
  'newyork', 'losangeles', 'chicago', 'houston', 'phoenix', 'philadelphia', 'sanantonio', 'sandiego', 'dallas', 'miami',
  'boston', 'seattle', 'atlanta', 'denver', 'washington', 'detroit', 'lasvegas', 'portland', 'austin', 'nashville',
  'london', 'manchester', 'birmingham', 'glasgow', 'liverpool', 'edinburgh', 'dublin', 'paris', 'lyon', 'marseille',
  'berlin', 'munich', 'hamburg', 'frankfurt', 'amsterdam', 'rotterdam', 'brussels', 'zurich', 'geneva', 'vienna',
  'rome', 'milan', 'madrid', 'barcelona', 'valencia', 'lisbon', 'lisboa', 'porto', 'coimbra', 'braga', 'faro',
  'saopaulo', 'riodejaneiro', 'brasilia', 'salvador', 'fortaleza', 'belohorizonte', 'manaus', 'curitiba', 'recife',
  'portoalegre', 'goiania', 'belem', 'natal', 'maceio', 'campinas', 'santos', 'florianopolis', 'vitoria',
  'bogota', 'medellin', 'cali', 'lima', 'santiago', 'buenosaires', 'cordoba', 'montevideo', 'asuncion', 'lapaz',
  'caracas', 'quito', 'guayaquil', 'havana', 'kingston', 'panamacity', 'mexicocity', 'guadalajara', 'monterrey',
  'toronto', 'vancouver', 'montreal', 'calgary', 'ottawa', 'tokyo', 'osaka', 'kyoto', 'yokohama', 'nagoya',
  'seoul', 'busan', 'beijing', 'shanghai', 'guangzhou', 'shenzhen', 'hongkong', 'taipei', 'singapore', 'bangkok',
  'jakarta', 'manila', 'hanoi', 'kualalumpur', 'delhi', 'mumbai', 'bangalore', 'kolkata', 'chennai', 'dubai', 'abudhabi',
  'doha', 'riyadh', 'jeddah', 'telaviv', 'jerusalem', 'cairo', 'casablanca', 'lagos', 'nairobi', 'johannesburg',
  'capetown', 'sydney', 'melbourne', 'brisbane', 'perth', 'auckland', 'wellington', 'moscow', 'stpetersburg', 'kiev',
  'warsaw', 'prague', 'budapest', 'bucharest', 'athens', 'istanbul', 'ankara', 'tehran', 'baghdad', 'kabul',
];

/** Termos banco / finanças / pagamentos (PT/EN) — slug exato após normalizar. */
export const BANKING_SLUGS: string[] = [
  'bank', 'banks', 'banking', 'banco', 'bancos', 'banque', 'banques', 'finance', 'finances', 'financial', 'financas',
  'financiamento', 'credit', 'credito', 'creditcard', 'cartao', 'cartoes', 'debit', 'debito', 'loan', 'emprestimo',
  'emprestimos', 'mortgage', 'hipoteca', 'invest', 'invests', 'investment', 'investments', 'investimento', 'investimentos',
  'trader', 'trading', 'trade', 'forex', 'stock', 'stocks', 'acoes', 'bolsa', 'crypto', 'cryptocurrency', 'bitcoin',
  'ethereum', 'usdt', 'usdc', 'stablecoin', 'defi', 'nft', 'nfts', 'wallet', 'wallets', 'carteira', 'pix', 'ted', 'doc',
  'swift', 'iban', 'bic', 'routing', 'clearing', 'custody', 'custodia', 'escrow', 'deposit', 'deposito', 'withdrawal',
  'saque', 'transfer', 'transferencia', 'wire', 'payment', 'pagamento', 'pagamentos', 'pay', 'payout', 'checkout',
  'gateway', 'processor', 'merchant', 'fintech', 'neobank', 'openbanking', 'psd2', 'kyc', 'aml', 'compliance',
  'regulator', 'centralbank', 'bancocentral', 'fed', 'ecb', 'bis', 'imf', 'fmi', 'treasury', 'tesouro', 'irs', 'irsusa',
  'paypal', 'stripe', 'visa', 'mastercard', 'amex', 'discover', 'nubank', 'inter', 'c6bank', 'picpay', 'mercadopago',
  'klarna', 'affirm', 'revolut', 'wise', 'n26', 'chime', 'sofi', 'robinhood', 'etrade', 'fidelity', 'schwab', 'vanguard',
  'blackrock', 'goldman', 'morgan', 'jpmorgan', 'chase', 'citibank', 'hsbc', 'barclays', 'santander', 'bbva', 'itau',
  'bradesco', 'caixa', 'bancodobrasil', 'safra', 'btg', 'xp', 'rico', 'clear', 'modal', 'genial', 'intermedium',
  'trust', 'trusted', 'fiduciary', 'fiduciario', 'securities', 'titulos', 'bonds', 'bond', 'yield', 'dividend', 'ipo',
  'underwriting', 'insurance', 'seguro', 'seguros', 'reinsurance', 'pension', 'previdencia', '401k', 'ira', 'hedge',
  'hedgefund', 'privatebank', 'privatebanking', 'wealth', 'patrimonio', 'asset', 'assets', 'liability', 'balance',
  'ledger', 'accounting', 'contabilidade', 'audit', 'auditoria', 'tax', 'imposto', 'impostos', 'laundering', 'lavagem',
  'sanctions', 'sancoes', 'ofac', 'fintrac', 'fca', 'sec', 'cvm', 'bacen', 'bcb',
];

export const PLATFORM_BRAND_SLUGS: string[] = ['trustbank', 'zicobank', 'trustbankxyz', 'trustbankofficial'];

function buildSet(lists: string[]): Set<string> {
  const s = new Set<string>();
  for (const x of lists) {
    const n = norm(x);
    if (n) s.add(n);
  }
  return s;
}

const RESERVED = buildSet([...COUNTRY_SLUGS, ...CITY_SLUGS, ...BANKING_SLUGS, ...PLATFORM_BRAND_SLUGS]);

/** Palavras “fortes” 8+ caracteres (marca/genérico financeiro) — mesmo critério admin-only. */
export const STRONG_LONG_SLUGS: string[] = [
  'investments', 'investimentos', 'cryptocurrency', 'cryptocurrencies', 'blockchain', 'stablecoins', 'mastercard',
  'millionaire', 'billionaire', 'millionario', 'bilionario', 'fundmanager', 'wealthmanagement',
];

for (const x of STRONG_LONG_SLUGS) {
  const n = norm(x);
  if (n) RESERVED.add(n);
}

export function getReservedSlugSet(): Set<string> {
  return RESERVED;
}
