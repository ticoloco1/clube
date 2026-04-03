/**
 * Nomes próprios comuns (uma palavra, normalizados a-z0-9) — PT, EN, ES, DE, FR, IT,
 * BR, pinyin chinês comum, romaji JP, transliterações árabe/hindi/russo, etc.
 * Slugs 1–7 caracteres na lista → preço nome (ver slugPolicy).
 * A lista pode crescer; não é exaustiva (milhões de combinações no mundo).
 */

function toKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function buildSet(lines: string[]): Set<string> {
  const out = new Set<string>();
  for (const line of lines) {
    for (const raw of line.split(/[\s,|]+/)) {
      const k = toKey(raw);
      if (k.length >= 1 && k.length <= 7) out.add(k);
    }
  }
  return out;
}

/** Blocos por região/cultura (expandir aqui). */
const NAME_LINES: string[] = [
  // ── Inglês (EUA/UK) muito comum ──
  `james john robert michael william david richard joseph thomas charles christopher daniel
   matthew anthony mark donald steven paul andrew joshua kenneth kevin brian george timothy ronald
   jason edward jeffrey ryan jacob gary nicholas eric jonathan stephen larry justin scott brandon
   benjamin samuel gregory frank raymond alexander patrick jack dennis jerry tyler aaron jose
   henry adam douglas nathan zachary kyle noah ethan jeremy walter christian keith roger terry
   austin sean gerald carl harold dylan arthur lawrence jordan wayne alan juan carlos ralph
   roy eugene louis philip bobby johnny logan mary patricia jennifer linda barbara elizabeth
   susan jessica sarah karen nancy betty margaret sandra ashley kimberly emily donna michelle
   dorothy carol amanda melissa deborah stephanie rebecca laura sharon cynthia amy kathleen
   angela shirley anna brenda emma pamela nicole helen samantha katherine christine debra rachel
   carolyn janet virginia maria heather diane julie joyce victoria kelly christina joan evelyn
   judith megan cheryl andrea hannah jacqueline martha gloria teresa ann sara madison frances
   janice jean abigail sophia alice jeanice kathryn ruby isabella evelyn grace chloe camila
   riley aria scarlett layla penelope nora lillian addison ellie brooklyn harper avery cameron
   riley quinn skylar ivy willow naomi elena valentina luna nova winter summer autumn april
   june rose lily daisy holly jade ruby pearl opal amber coral sky rain river forest dale
   kelly morgan taylor casey jamie jesse alex avery rowan reese blake drew jordan`,

  // ── Brasil / Portugal ──
  `joao jose carlos antonio francisco paulo pedro lucas luiz marcos gabriel rafael daniel
   marcelo felipe bruno eduardo gustavo rodrigo fernando ricardo andre alexandre thiago vinicius
   igor leonardo mateus diego renato fabio sergio julio claudio roberto mauricio rogerio geraldo
   maria ana francisca antonia adriana juliana fernanda patricia aline vanessa beatriz larissa
   gabriela amanda bruna camila jessica natalia leticia clarice isabela laura carolina bianca
   luciana daniela priscila tatiane simone viviane eliane silvana sandra monica regina lucia
   helena beatriz ines catia sofia matilde teresa luis miguel tiago goncalo afonso duarte
   henrique nuno diogo braga inacio xavier manuel vasco artur martim david samuel tomé rui`,

  // ── Espanha / América Latina ──
  `miguel angel javier alejandro diego carlos juan jose luis francisco antonio manuel pedro
   pablo fernando sergio jorge alberto raul daniel david enrique ricardo roberto eduardo
   maria carmen isabel laura elena patricia lucia cristina monica raquel andrea silvia
   sofia martina valentina lucia emma noa carla alba irene andrea paula elsa nadia lola
   carlos luis miguel jesus salvador guadalupe rosa esperanza carmen dolores pilar mercedes
   josefa rosario concepcion beatriz alicia victoria gloria esther teresa angela monica
   andrea sofia valentina isabella camila valeria daniela gabriela fernanda luciana martina`,

  // ── Alemanha / Áustria / Suíça DE ──
  `hans peter michael thomas andreas wolfgang klaus juergen dieter helmut werner manfred
   stefan uwe frank ralf bernd matthias sebastian florian lukas felix jonas maximilian simon
   anna maria elisabeth ursula monika petra sabine andrea susanne claudia birgit stefanie
   julia laura sarah lisa katharina hannah lena leonie emma mia sophie marie charlotte
   greta lena frieda heidi ingrid brigitte karin gisela ute helga irmgard gerda elfriede`,

  // ── França / Bélgica / Québec ──
  `pierre jean paul jacques michel andre philippe alain bernard daniel patrick nicolas thomas
   julien antoine maxime alexandre louis henri francois olivier remi mathieu romain lucas leo
   marie nathalie isabelle catherine sylvie martine christine valerie stephanie julie camille
   lea chloe manon sarah ines clara emma jade lola alice rose juliette louise anne sophie
   jeanne colette denise yvette monique brigitte veronique celine elodie amelie margot`,

  // ── Itália ──
  `francesco alessandro andrea luca marco matteo giuseppe lorenzo davide antonio simone
   gabriele riccardo stefano fabio paolo giovanni mario enrico daniele filippo edoardo
   elena giulia francesca chiara sara valentina alessia martina federica elisa giorgia
   beatrice camilla ludovica noemi viola greta alice bianca carlotta emma sofia aurora`,

  // ── Polónia / República Checa / Hungria (latinizado) ──
  `piotr pawel krzysztof andrzej tomasz marek michal jan stanislaw zbigniew lukasz adam
   anna maria katarzyna magdalena agnieszka barbara ewa joanna aleksandra zofia julia
   natalia lena maja zuzanna hanna amelia oliwia weronika kinga nikola lara nina pola`,

  // ── Países nórdicos / Países Baixos ──
  `erik lars sven bjorn ola niels jens finn mads henrik ole kari anne liv silje nora emma
   lars erik johan anders per nils gustav viggo freja astrid ingrid sigrid linnea ebba
   daan sem lucas finn levi noah milan luuk jesse thijs bas tim bram max sam evi sophie
   emma tess lisa eva sarah anna fleur noor liv isa nina lynn roos maud julia`,

  // ── Russo / Ucraniano (transliteração latina) ──
  `alexander dmitry sergey andrey alexey mikhail nikolai vladimir ivan pavel roman maxim
   artem kirill denis oleg igor yuri boris vadim stanislav konstantin valentin ruslan timur
   elena olga tatyana natalia irina svetlana marina yulia anastasia daria polina sofia
   maria anna viktoria kristina veronika alina karina oxana galina ludmila zhanna alisa`,

  // ── Árabe / Turco / Irão (comum em slug latino) ──
  `mohammed ahmad ali hassan hussein omar khalid yusuf ibrahim karim tariq malik rami samir
   amir bilal farid jamal nadir salim zaki zain omar leila fatima aisha zahra maryam noor
   yasmin hana layla nadia samira rana dina lina rima sara hala mona nora rita lara mira
   mehmet mustafa emre burak can kerem arda deniz onur serkan tolga yasin emin kaan baran
   ayse fatma zeynep elif selin melis dilara ebru gizem ceren pinar burcu sevgi yeliz`,

  // ── Índia / sul da Ásia (romanização comum) ──
  `rahul arjun vikram rohit amit raj karan dev anil sunil suresh ravi sanjay ajay nikhil
   priya anita kavita neha pooja divya shreya meera anjali kiran simran rina sonia deepa
   aarav vihaan advik aryan devansh reyansh kabir shaurya vivaan rudra arnav parth yash
   aadhya ananya diya ishita myra navya pihu riya sara tara veera zara kavya mishka`,

  // ── China (pinyin curto, muito comum) ──
  `wei li wang zhang liu chen yang huang zhao wu zhou xu sun ma zhu hu guo lin he luo
   song tang han cao xie feng yu ren jiang bai cai cheng dai deng ding dong du fan fang
   fei fu gao ge gong gu hai han hao hong hua jia jian jie jin jing jun kai kang le lei
   lian liang ling long mei meng min ming ning pan peng ping qi qian qiang qin qing rong
   shan shao shen shi shu shuang song tao ting tong wei wen xia xian xin xing xiong xu
   xuan xue yan yang yao ye yi yin ying yong you yuan yue yun zeng zhai zhan zhao zhen
   zhi zhong zhou zhu zi zong bo ling yan hui min jun tao ying jing lei peng yong zhi`,

  // ── Japão / Coreia (romaji curto) ──
  `yuki hiro kenji takeshi satoshi daiki ryota kenta shohei yuta haruki ren sora kaito
   sakura hana yui aoi mio rin nao mao ami emi eri kana miku nana rina saya yuna mao
   minseo jihoon seojun hyunwoo junho minjun seungmin taeyang wooyoung chanwoo donghyun
   soyoung minji yuna jisoo suzy nayeon dahyun chaeyoung momo sana mina tzuyu jihyo`,

  // ── Curtos internacionais (só primeiros nomes reconhecíveis) ──
  `li lei bo di na lu kai an ai mei ling wei min jun tao yan hui fang lin ping ling
   max leo ben tom sam amy eve ann may kay jay roy rex ted val sal meg bel cel pam peg
   sue tess troy wes zed ace ash ivy joy kim lux neo rei rui ari aya sky rain river
   june april august winter summer autumn dawn cruz duke
   blue grey gray jett jax jex zane zayn zed kane kade cade cash dash gage jace jase
   lane lance miles myles niles rhys reid reed dean sean shawn troy trey trent grant`,

  // ── Extras PT/EN/ES curtos ──
  `bia gui biel davi enzo theo arthur bento noah henrique davi lucca theo murilo arthur
   heitor caua enzo anthony benicio oliver lorenzo benjamin henry theodore jackson owen
   luke jack henry oliver james oliver liam noah oliver elijah lucas mason logan ezra`,
];

const WORLD_FIRST_NAME_KEYS: Set<string> = buildSet(NAME_LINES);

export function isWorldFirstNameSlug(raw: string): boolean {
  const k = toKey(raw);
  if (k.length < 1 || k.length > 7) return false;
  return WORLD_FIRST_NAME_KEYS.has(k);
}

/** Quantidade aproximada (útil para admin/debug). */
export function worldFirstNameCount(): number {
  return WORLD_FIRST_NAME_KEYS.size;
}
