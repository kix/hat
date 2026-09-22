import type { DictionaryEntry } from './dictionary';

export type ThematicPackId =
  | 'movies'
  | 'food'
  | 'geography'
  | 'gaming'
  | 'animals'
  | 'celebrities'
  | 'tech';

export interface ThematicPackMeta {
  id: ThematicPackId;
  emoji: string;
  titleKey: string;
  descKey: string;
}

export const THEMATIC_PACK_METAS: ThematicPackMeta[] = [
  {
    id: 'movies',
    emoji: '🎬',
    titleKey: 'pack.movies.title',
    descKey: 'pack.movies.desc',
  },
  {
    id: 'food',
    emoji: '🍕',
    titleKey: 'pack.food.title',
    descKey: 'pack.food.desc',
  },
  {
    id: 'geography',
    emoji: '🌍',
    titleKey: 'pack.geography.title',
    descKey: 'pack.geography.desc',
  },
  {
    id: 'gaming',
    emoji: '🎮',
    titleKey: 'pack.gaming.title',
    descKey: 'pack.gaming.desc',
  },
  {
    id: 'animals',
    emoji: '🦁',
    titleKey: 'pack.animals.title',
    descKey: 'pack.animals.desc',
  },
  {
    id: 'celebrities',
    emoji: '🎭',
    titleKey: 'pack.celebrities.title',
    descKey: 'pack.celebrities.desc',
  },
  {
    id: 'tech',
    emoji: '💻',
    titleKey: 'pack.tech.title',
    descKey: 'pack.tech.desc',
  },
];

const createEntries = (words: string[]): DictionaryEntry[] =>
  words.map((word) => ({
    word,
    difficulty: 'easy',
    frequency: 4.5,
    levenshtein_zipf_frequency: 4.5,
  }));

export const thematicPacksRu: Record<ThematicPackId, DictionaryEntry[]> = {
  movies: createEntries([
    'гарри поттер', 'терминатор', 'матрица', 'аватар', 'титаник', 'интерстеллар',
    'властелин колец', 'шрек', 'джокер', 'пираты карибского моря', 'звездные войны',
    'криминальное чтиво', 'бойцовский клуб', 'форрест гамп', 'назад в будущее',
    'один дома', 'парк юрского периода', 'гладиатор', 'король лев', 'крестный отец',
    'джеймс бонд', 'бэтмен', 'человек-паук', 'мстители', 'железный человек',
    'чужой', 'хищник', 'молчание ягнят', 'начало', 'ходячие мертвецы',
    'игра престолов', 'острые козырьки', 'во все тяжкие', 'черное зеркало', 'ривердейл',
    'оскар', 'попкорн', 'режиссер', 'каскадер', 'дублер', 'сценарий', 'кинопремьера',
    'тизер', 'трейлер', 'спецэффекты', 'кинотеатр', 'кинофестиваль', 'хоррор', 'блокбастер',
    'документалка', 'триллер', 'вестерн', 'аниме', 'мультфильм', 'ситком', 'сериал',
    'киностудия', 'супергерой', 'злодей', 'озвучка', 'саундтрек', 'хлопушка', 'хромакей',
    'голливуд', 'красная дорожка', 'сиквел', 'приквел', 'спин-офф', 'ремейк',
    'ганнибал', 'тарантино', 'нолан', 'спилберг', 'ди каприо', 'мэрилин монро', 'дэдпул',
    'хатико', 'зеленая миля', 'побег из шоушенка', 'ла-ла ленд', 'дюна', 'оппенгеймер',
    'барби', 'готэм', 'хогвартс', 'миньоны', 'кунг-фу панда', 'рапунцель', 'холодное сердце',
  ]),

  food: createEntries([
    'пицца', 'бургер', 'суши', 'роллы', 'круассан', 'капкейк', 'тирамису', 'чизкейк',
    'эспрессо', 'капучино', 'латте', 'борщ', 'пельмени', 'шаурма', 'блины', 'сырники',
    'паста', 'спагетти', 'лазанья', 'авокадо', 'манго', 'ананас', 'кокос', 'гранат',
    'мохито', 'лимонад', 'смузи', 'фондю', 'рамен', 'том ям', 'гуакамоле', 'фалафель',
    'вафли', 'пончик', 'эклер', 'макарун', 'пахлава', 'шашлык', 'стейк', 'хачапури',
    'хинкали', 'чебурек', 'тако', 'буррито', 'начос', 'паэлья', 'ризотто', 'тартар',
    'карпаччо', 'оливье', 'селедка под шубой', 'холодец', 'драники', 'вареники', 'паштет',
    'омар', 'креветки', 'устрицы', 'мидии', 'кальмар', 'пармезан', 'моцарелла', 'камамбер',
    'дорблю', 'багет', 'чиабатта', 'фокачча', 'картошка фри', 'наггетсы', 'маршмеллоу',
    'горячий шоколад', 'карамель', 'фисташки', 'миндаль', 'кешью', 'фундук', 'трюфель',
    'имбирь', 'корица', 'базилик', 'розмарин', 'соус песто', 'васаби', 'барбекю',
  ]),

  geography: createEntries([
    'париж', 'лондон', 'токио', 'нью-йорк', 'рим', 'берлин', 'пекин', 'сидней',
    'москва', 'санкт-петербург', 'стамбул', 'дубай', 'венеция', 'барселона', 'рио-де-жанейро',
    'эверест', 'сахара', 'ниагарский водопад', 'колизей', 'эйфелева башня', 'лувр',
    'великая китайская стена', 'пирамиды гизы', 'тадж-махал', 'биг бен', 'статуя свободы',
    'озеро байкал', 'вулкан фудзи', 'гранд-каньон', 'амазонка', 'нил', 'альпы',
    'айсберг', 'сафари', 'чемодан', 'загранпаспорт', 'аэропорт', 'стюардесса', 'пляж',
    'пальма', 'коралловый риф', 'карнавал', 'оазис', 'джунгли', 'северное сияние', 'фьорд',
    'гейзер', 'каньон', 'ледник', 'пустыня', 'экватор', 'мегаполис', 'небоскреб', 'остров',
    'полуостров', 'архипелаг', 'водопад', 'гренландия', 'антарктида', 'мадагаскар', 'гавайи',
    'мальдивы', 'сейшелы', 'бали', 'исландия', 'норвегия', 'швейцария', 'мексика', 'бразилия',
    'египет', 'греция', 'португалия', 'нидерланды', 'япония', 'канада', 'австралия',
  ]),

  gaming: createEntries([
    'майнкрафт', 'ведьмак', 'дота', 'покемон', 'джойстик', 'геймпад', 'киберспорт',
    'косплей', 'пасхалка', 'стример', 'читкод', 'пиксель', 'босс', 'лутбокс',
    'кс го', 'варкрафт', 'гта', 'скайрим', 'дарк соулс', 'киберпанк', 'ассасин',
    'марио', 'соник', 'зельда', 'тетрис', 'пакман', 'мортал комбат', 'роблокс',
    'фортнайт', 'амонг ас', 'геншин импакт', 'лига легенд', 'овервотч', 'старкрафт',
    'виртуальная реальность', 'шлем vr', 'плейстейшн', 'иксбокс', 'нинтендо', 'стим',
    'спидран', 'квест', 'геймовер', 'респаун', 'бафф', 'нерф', 'хилка', 'инвентарь',
    'крафт', 'прокачка', 'опыт', 'достижение', 'ачивка', 'лаг', 'баг', 'фриз',
    'геймер', 'летсплей', 'дискорд', 'клан', 'гильдия', 'рейд', 'танковать', 'дамаг',
    'стелс', 'аватарка', 'нпс', 'диалог', 'катсцена', 'геймплей', 'читтер', 'скриншот',
  ]),

  animals: createEntries([
    'хамелеон', 'утконос', 'панда', 'фламинго', 'ленивец', 'кенгуру', 'альпака',
    'жираф', 'коала', 'колибри', 'дельфин', 'косатка', 'синий кит', 'белый медведь',
    'пингвин', 'лев', 'тигр', 'леопард', 'гепард', 'пантера', 'носорог', 'бегемот',
    'слон', 'зебра', 'крокодил', 'аллигатор', 'черепаха', 'игуана', 'варан', 'геккон',
    'орел', 'ястреб', 'сова', 'филин', 'попугай', 'пеликан', 'тукан', 'страус', 'павлин',
    'лебедь', 'акула', 'рыба-клоун', 'скат', 'осьминог', 'кальмар', 'медуза', 'морской конек',
    'краб', 'лобстер', 'сурикат', 'дикобраз', 'енот', 'барсук', 'выдра', 'бобр', 'хорек',
    'ежик', 'белка', 'бурундук', 'лиса', 'волк', 'бурый медведь', 'рысь', 'лама',
    'верблюд', 'шимпанзе', 'горилла', 'орангутан', 'лемур', 'летучая мышь',
    'бабочка', 'божья коровка', 'стрекоза', 'светлячок', 'богомол', 'скорпион', 'тарантул',
  ]),

  celebrities: createEntries([
    'альберт эйнштейн', 'леонардо да винчи', 'исаак ньютон', 'никола тесла', 'стив джобс',
    'илон маск', 'билл гейтс', 'марк цукерберг', 'вольфганг моцарт', 'людвиг ван бетховен',
    'уильям шекспир', 'александр пушкин', 'лев толстой', 'пабло пикассо', 'винсент ван гог',
    'сальвадор дали', 'майкл джексон', 'элвис пресли', 'фредди меркьюри', 'джон леннон',
    'мэрилин монро', 'чарли чаплин', 'арнольд шварценеггер', 'сильвестр сталлоне', 'киану ривз',
    'том хэнкс', 'джонни депп', 'брэд питт', 'леонардо ди каприо', 'анджелина джоли',
    'криштиану роналду', 'лионель месси', 'майкл джордан', 'мухаммед али', 'майк тайсон',
    'юрий гагарин', 'нил армстронг', 'юлий цезарь', 'клеопатра', 'наполеон бонапарт',
    'шерлок холмс', 'доктор ватсон', 'граф дракула', 'франкенштейн', 'робин гуд',
    'гарри гудини', 'агата кристи', 'стивен кинг', 'уолт дисней', 'мадонна',
  ]),

  tech: createEntries([
    'нейросеть', 'искусственный интеллект', 'робот', 'алгоритм', 'блокчейн', 'криптовалюта',
    'биткоин', 'сервер', 'база данных', 'облачное хранилище', 'кибербезопасность', 'хакер',
    'файрвол', 'процессор', 'видеокарта', 'материнская плата', 'смартфон', 'планшет',
    'ноутбук', 'умный дом', 'умные часы', 'электромобиль', 'беспилотник', 'квадрокоптер',
    '3d-принтер', 'виртуальная реальность', 'дополненная реальность', 'квантовый компьютер',
    'спутник', 'интернет вещей', 'вай-фай', 'блютуз', 'браузер', 'поисковик', 'приложение',
    'чат-бот', 'микросхема', 'сенсорный экран', 'программист', 'баг', 'код', 'коммит',
    'репозиторий', 'стартап', 'интерфейс', 'пиксель', 'оптоволокно', 'батарея', 'зарядка',
  ]),
};

export const thematicPacksEn: Record<ThematicPackId, DictionaryEntry[]> = {
  movies: createEntries([
    'harry potter', 'terminator', 'matrix', 'avatar', 'titanic', 'interstellar',
    'lord of the rings', 'shrek', 'joker', 'pirates of the caribbean', 'star wars',
    'pulp fiction', 'fight club', 'forrest gump', 'back to the future', 'home alone',
    'jurassic park', 'gladiator', 'lion king', 'godfather', 'james bond', 'batman',
    'spider-man', 'avengers', 'iron man', 'alien', 'predator', 'silence of the lambs',
    'inception', 'walking dead', 'game of thrones', 'peaky blinders', 'breaking bad',
    'black mirror', 'stranger things', 'oscar', 'popcorn', 'director', 'stuntman',
    'screenplay', 'premiere', 'teaser', 'trailer', 'special effects', 'cinema',
    'film festival', 'horror', 'blockbuster', 'documentary', 'thriller', 'western',
    'anime', 'cartoon', 'sitcom', 'series', 'superhero', 'villain', 'soundtrack',
    'hollywood', 'red carpet', 'sequel', 'prequel', 'spin-off', 'remake', 'deadpool',
    'dune', 'oppenheimer', 'barbie', 'gotham', 'hogwarts', 'minions', 'frozen',
  ]),

  food: createEntries([
    'pizza', 'burger', 'sushi', 'croissant', 'cupcake', 'tiramisu', 'cheesecake',
    'espresso', 'cappuccino', 'latte', 'pancakes', 'waffles', 'donut', 'pasta',
    'spaghetti', 'lasagna', 'avocado', 'mango', 'pineapple', 'coconut', 'pomegranate',
    'mojito', 'lemonade', 'smoothie', 'fondue', 'ramen', 'guacamole', 'falafel',
    'eclair', 'macaron', 'steak', 'barbecue', 'tacos', 'burrito', 'nachos', 'paella',
    'risotto', 'tartare', 'carpaccio', 'lobster', 'shrimp', 'oysters', 'mussels',
    'squid', 'parmesan', 'mozzarella', 'camembert', 'baguette', 'ciabatta', 'french fries',
    'marshmallow', 'hot chocolate', 'caramel', 'pistachio', 'almond', 'cashew', 'hazelnut',
    'truffle', 'ginger', 'cinnamon', 'basil', 'rosemary', 'pesto', 'wasabi',
  ]),

  geography: createEntries([
    'paris', 'london', 'tokyo', 'new york', 'rome', 'berlin', 'beijing', 'sydney',
    'moscow', 'istanbul', 'dubai', 'venice', 'barcelona', 'rio de janeiro',
    'mount everest', 'sahara desert', 'niagara falls', 'colosseum', 'eiffel tower', 'louvre',
    'great wall of china', 'giza pyramids', 'taj mahal', 'big ben', 'statue of liberty',
    'mount fuji', 'grand canyon', 'amazon river', 'nile river', 'alps', 'iceberg',
    'safari', 'suitcase', 'passport', 'airport', 'flight attendant', 'beach',
    'palm tree', 'coral reef', 'carnival', 'oasis', 'jungle', 'northern lights', 'fjord',
    'geyser', 'glacier', 'equator', 'skyscraper', 'island', 'archipelago', 'waterfall',
    'greenland', 'antarctica', 'madagascar', 'hawaii', 'maldives', 'iceland', 'switzerland',
  ]),

  gaming: createEntries([
    'minecraft', 'witcher', 'dota', 'pokemon', 'gamepad', 'joystick', 'esports',
    'cosplay', 'easter egg', 'streamer', 'cheat code', 'pixel', 'boss fight', 'loot box',
    'counter strike', 'warcraft', 'gta', 'skyrim', 'dark souls', 'cyberpunk', 'assassins creed',
    'mario', 'sonic', 'zelda', 'tetris', 'pacman', 'mortal combat', 'roblox',
    'fortnite', 'among us', 'genshin impact', 'league of legends', 'overwatch', 'starcraft',
    'virtual reality', 'vr headset', 'playstation', 'xbox', 'nintendo switch', 'steam',
    'speedrun', 'quest', 'game over', 'respawn', 'buff', 'nerf', 'health potion', 'inventory',
    'crafting', 'level up', 'experience point', 'achievement', 'lag', 'glitch',
    'gamer', 'discord', 'guild', 'raid', 'stealth', 'avatar', 'npc', 'cutscene', 'gameplay',
  ]),

  animals: createEntries([
    'chameleon', 'platypus', 'panda', 'flamingo', 'sloth', 'kangaroo', 'alpaca',
    'giraffe', 'koala', 'hummingbird', 'dolphin', 'killer whale', 'blue whale', 'polar bear',
    'penguin', 'lion', 'tiger', 'leopard', 'cheetah', 'panther', 'rhino', 'hippo',
    'elephant', 'zebra', 'crocodile', 'alligator', 'turtle', 'iguana', 'gecko',
    'eagle', 'hawk', 'owl', 'parrot', 'pelican', 'toucan', 'ostrich', 'peacock',
    'swan', 'shark', 'clownfish', 'stingray', 'octopus', 'squid', 'jellyfish', 'seahorse',
    'crab', 'lobster', 'meerkat', 'porcupine', 'raccoon', 'badger', 'otter', 'beaver',
    'hedgehog', 'squirrel', 'fox', 'wolf', 'brown bear', 'lynx', 'llama', 'camel',
    'chimpanzee', 'gorilla', 'orangutan', 'lemur', 'bat', 'butterfly', 'ladybug', 'dragonfly',
  ]),

  celebrities: createEntries([
    'albert einstein', 'leonardo da vinci', 'isaac newton', 'nikola tesla', 'steve jobs',
    'elon musk', 'bill gates', 'mark zuckerberg', 'wolfgang mozart', 'ludwig van beethoven',
    'william shakespeare', 'pablo picasso', 'vincent van gogh', 'salvador dali',
    'michael jackson', 'elvis presley', 'freddie mercury', 'john lennon',
    'marilyn monroe', 'charlie chaplin', 'arnold schwarzenegger', 'sylvester stallone',
    'keanu reeves', 'tom hanks', 'johnny depp', 'brad pitt', 'leonardo dicaprio',
    'angelina jolie', 'cristiano ronaldo', 'lionel messi', 'michael jordan', 'muhammad ali',
    'mike tyson', 'yuri gagarin', 'neil armstrong', 'julius caesar', 'cleopatra',
    'napoleon bonaparte', 'sherlock holmes', 'count dracula', 'frankenstein', 'robin hood',
    'harry houdini', 'agatha christie', 'stephen king', 'walt disney', 'madonna',
  ]),

  tech: createEntries([
    'neural network', 'artificial intelligence', 'robot', 'algorithm', 'blockchain',
    'cryptocurrency', 'bitcoin', 'server', 'database', 'cloud computing', 'cybersecurity',
    'hacker', 'firewall', 'processor', 'graphics card', 'motherboard', 'smartphone',
    'tablet', 'laptop', 'smart home', 'smartwatch', 'electric car', 'drone', '3d printer',
    'virtual reality', 'augmented reality', 'quantum computer', 'satellite',
    'internet of things', 'wi-fi', 'bluetooth', 'web browser', 'search engine',
    'mobile app', 'chatbot', 'microchip', 'touchscreen', 'software developer',
    'code', 'bug', 'commit', 'git repository', 'startup', 'user interface', 'pixel', 'fiber optic',
  ]),
};

export function getThematicPackEntries(
  packId: ThematicPackId,
  lang: 'ru' | 'en' = 'ru'
): DictionaryEntry[] {
  const map = lang === 'en' ? thematicPacksEn : thematicPacksRu;
  return map[packId] ?? [];
}
