(() => {
  const STORAGE_KEY = 'portfolio-language';
  const supported = ['kz', 'en', 'ru'];

  const ui = {
    kz: {
      pageTitle: 'Arman Karaman — Motion Designer • 3D • AI визуалдар',
      brandTagline: 'Motion design, 3D, AI визуалдар',
      navMotion: 'Motion', navStills: 'Статика', nav3d: '3D', navAbout: 'Мен туралы', navContact: 'Байланыс',
      motionHeading: 'Motion', stillsHeading: 'Статика', modelsHeading: '3D модельдер',
      aboutHeading: 'Мен туралы',
      aboutP1: 'Мен Алматыда, Қазақстанда тұратын Motion Designer және 3D Artist маманымын.',
      aboutP2: 'Motion design, 3D, AI көмегімен жасалатын визуалдар және коммерциялық контент бағыттарында жұмыс істеймін. Дизайн, анимация және визуалды сторителлингті біріктіремін.',
      aboutP3: 'KPMG, Tetra Pak, Sergek Group компанияларында және жылжымайтын мүлік жобаларында жұмыс істедім. Негізгі назарым — сапалы визуал, түсінікті коммуникация және өндіріске дайын нәтиже.',
      education: 'Білім', educationMinzuSchool: 'Minzu University of China', educationMinzuProgram: 'Қытай тілі бағдарламасы · 2008–2009', educationSchool: 'University of Science and Technology Beijing (USTB)', educationDegree: 'Арт-дизайн мамандығы бойынша бакалавр дәрежесі · 2009–2013',
      languages: 'Тілдер', languagesList: 'Қазақ · Орыс · Ағылшын · Қытай',
      experience: 'Тәжірибе',
      roleMotion: 'Motion дизайнер', role3dMotion: '3D Motion дизайнер', roleDesignDev: 'Дизайн әзірлеуші / үйлестіруші', roleSenior: 'Аға графикалық / motion дизайнер', roleGraphic3d: 'Графикалық дизайнер / 3D техникалық дизайнер', present: 'Қазір',
      contact: 'Байланыс', contactIntro: 'Жоба, ынтымақтастық немесе басқа сұрақтар бойынша:', name: 'Аты', email: 'Email', message: 'Хабарлама', send: 'Жіберу',
      inquirySubject: 'Портфолио бойынша жаңа сұрау', follow: 'Әлеуметтік желілер:',
      brandBackTop: 'Arman Karaman — басты бетке оралу', languageSelector: 'Тіл', motionProjectsLabel: 'Motion жобалары', staticProjectsLabel: 'Статикалық жобалар', modelsLabel: '3D модельдер',
      projects: 'жоба', models: 'модель', viewProject: 'Жобаны көру ↗', viewModel: 'Модельді көру', openSketchfab: 'Sketchfab-та ашу ↗',
      openProject: 'Жобаны көру', previousProject: 'Алдыңғы жоба', nextProject: 'Келесі жоба', previousItem: 'Алдыңғы элемент', nextItem: 'Келесі элемент', showProject: 'Көрсету: {title}', openCard: 'Ашу: {title}',
      previewPlaceholder: 'Превью кейін қосылады', pdfDocument: 'PDF құжаты', openPdf: 'PDF ашу', pdfFallback: 'Бұл құжатты көру үшін PDF ашыңыз.', mediaUnavailable: 'Медиа қолжетімсіз — файл кейін қосылады', preview3dUnavailable: '3D превью қолжетімсіз',
      mainVideo: 'Негізгі видео', video: 'Видео', interactiveModel: '{title} — интерактивті 3D модель', mediaLabel: '{title}, медиа {number}', close: 'Жабу'
    },
    en: {
      pageTitle: 'Arman Karaman — Motion Designer • 3D • AI Visuals',
      brandTagline: 'Motion design, 3D, AI Visuals',
      navMotion: 'Motion', navStills: 'Stills', nav3d: '3D', navAbout: 'About', navContact: 'Contact',
      motionHeading: 'Motion', stillsHeading: 'Stills', modelsHeading: '3D Models',
      aboutHeading: 'About',
      aboutP1: "I'm a Motion Designer and 3D Artist based in Almaty, Kazakhstan.",
      aboutP2: 'I work across motion design, 3D, AI-assisted visuals and commercial content, combining design, animation and visual storytelling.',
      aboutP3: 'My background includes work with KPMG, Tetra Pak, Sergek Group and real estate projects, with a focus on polished visuals, clear communication and production-ready execution.',
      education: 'Education', educationMinzuSchool: 'Minzu University of China', educationMinzuProgram: 'Chinese Language Program · 2008–2009', educationSchool: 'University of Science and Technology Beijing (USTB)', educationDegree: 'Bachelor’s Degree in Art Design · 2009–2013',
      languages: 'Languages', languagesList: 'Kazakh · Russian · English · Chinese',
      experience: 'Experience',
      roleMotion: 'Motion Designer', role3dMotion: '3D Motion Designer', roleDesignDev: 'Design Developer / Coordinator', roleSenior: 'Senior Graphic / Motion Designer', roleGraphic3d: 'Graphic Designer / 3D Technical Designer', present: 'Present',
      contact: 'Contact', contactIntro: 'For commissions, collaborations or inquiries:', name: 'Name', email: 'Email', message: 'Message', send: 'Send message',
      inquirySubject: 'New portfolio inquiry', follow: 'Follow:',
      brandBackTop: 'Arman Karaman — back to top', languageSelector: 'Language', motionProjectsLabel: 'Motion projects', staticProjectsLabel: 'Static projects', modelsLabel: '3D models',
      projects: 'projects', models: 'models', viewProject: 'View project ↗', viewModel: 'View model', openSketchfab: 'Open on Sketchfab ↗',
      openProject: 'View project', previousProject: 'Previous project', nextProject: 'Next project', previousItem: 'Previous item', nextItem: 'Next item', showProject: 'Show {title}', openCard: 'Open {title}',
      previewPlaceholder: 'Preview placeholder — image to be added', pdfDocument: 'PDF document', openPdf: 'Open PDF', pdfFallback: 'Use Open PDF to view this document.', mediaUnavailable: 'Media unavailable — file to be added', preview3dUnavailable: '3D preview unavailable',
      mainVideo: 'Main video', video: 'Video', interactiveModel: '{title} — interactive 3D model', mediaLabel: '{title}, media {number}', close: 'Close'
    },
    ru: {
      pageTitle: 'Arman Karaman — Motion Designer • 3D • AI-визуалы',
      brandTagline: 'Motion design, 3D, AI-визуалы',
      navMotion: 'Motion', navStills: 'Статика', nav3d: '3D', navAbout: 'Обо мне', navContact: 'Контакты',
      motionHeading: 'Motion', stillsHeading: 'Статика', modelsHeading: '3D модели',
      aboutHeading: 'Обо мне',
      aboutP1: 'Я Motion Designer и 3D Artist из Алматы, Казахстан.',
      aboutP2: 'Работаю с motion design, 3D, AI-визуалами и коммерческим контентом, объединяя дизайн, анимацию и визуальный сторителлинг.',
      aboutP3: 'Работал с KPMG, Tetra Pak, Sergek Group и проектами в сфере недвижимости. Основной фокус — качественный визуал, понятная коммуникация и готовый к продакшену результат.',
      education: 'Образование', educationMinzuSchool: 'Minzu University of China', educationMinzuProgram: 'Программа китайского языка · 2008–2009', educationSchool: 'University of Science and Technology Beijing (USTB)', educationDegree: 'Степень бакалавра по специальности «Арт-дизайн» · 2009–2013',
      languages: 'Языки', languagesList: 'Казахский · Русский · Английский · Китайский',
      experience: 'Опыт',
      roleMotion: 'Моушн-дизайнер', role3dMotion: '3D-моушн-дизайнер', roleDesignDev: 'Дизайн-разработчик / координатор', roleSenior: 'Старший графический / моушн-дизайнер', roleGraphic3d: 'Графический дизайнер / 3D-технический дизайнер', present: 'Наст. время',
      contact: 'Контакты', contactIntro: 'По вопросам проектов, сотрудничества и другим запросам:', name: 'Имя', email: 'Email', message: 'Сообщение', send: 'Отправить',
      inquirySubject: 'Новый запрос с портфолио', follow: 'Соцсети:',
      brandBackTop: 'Arman Karaman — вернуться наверх', languageSelector: 'Язык', motionProjectsLabel: 'Motion-проекты', staticProjectsLabel: 'Статические проекты', modelsLabel: '3D-модели',
      projects: 'проектов', models: 'моделей', viewProject: 'Смотреть проект ↗', viewModel: 'Смотреть модель', openSketchfab: 'Открыть на Sketchfab ↗',
      openProject: 'Смотреть проект', previousProject: 'Предыдущий проект', nextProject: 'Следующий проект', previousItem: 'Предыдущий элемент', nextItem: 'Следующий элемент', showProject: 'Показать: {title}', openCard: 'Открыть: {title}',
      previewPlaceholder: 'Превью будет добавлено позже', pdfDocument: 'PDF-документ', openPdf: 'Открыть PDF', pdfFallback: 'Откройте PDF, чтобы посмотреть документ.', mediaUnavailable: 'Медиа недоступно — файл будет добавлен позже', preview3dUnavailable: '3D-превью недоступно',
      mainVideo: 'Главное видео', video: 'Видео', interactiveModel: '{title} — интерактивная 3D-модель', mediaLabel: '{title}, медиа {number}', close: 'Закрыть'
    }
  };

  const projectTranslations = {
    project01: {
      kz: {category: 'AI визуалдар', description: 'Taulan Residential Complex үшін жасалған коммерциялық motion контент. Жұмыс атмосфера мен премиум ұсынуға басымдық бере отырып, AI көмегімен жасалған архитектуралық визуалдарды, анимацияны және композитингті біріктіреді.'},
      ru: {category: 'AI-визуалы', description: 'Коммерческий motion-контент для Taulan Residential Complex. Работа объединяет архитектурные AI-визуалы, анимацию и композитинг с акцентом на атмосферу и премиальную подачу.'}
    },
    project02: {
      kz: {category: '3D', description: 'Қазақстанның Ұлттық валюта күніне арналған 3D motion жұмыс. Анимация мен брендтік визуал элементтер мерекенің мазмұнын ықшам әрі тартымды түрде жеткізеді.'},
      ru: {category: '3D', description: '3D motion-ролик ко Дню национальной валюты Казахстана. Анимация и фирменные визуальные элементы помогают лаконично и выразительно раскрыть тему.'}
    },
    project03: {
      kz: {category: 'AI визуалдар', description: 'Sergek Group компаниясының HR-коммуникация науқанына арналған motion контент. Жұмыс кейіпкер анимациясын, 3D визуалдарды және брендтік дизайн элементтерін біріктіреді.'},
      ru: {category: 'AI-визуалы', description: 'Motion-контент для HR-коммуникационной кампании Sergek Group. Работа объединяет анимацию персонажа, 3D-визуалы и элементы фирменного дизайна.'}
    },
    project04: {
      kz: {category: 'Motion Design', description: 'Sergek компаниясының smart city коммуникациясына арналған 3D motion design. Анимация, абстрактілі визуализация және брендтік орта цифрлық инфрақұрылымды түсінікті көрсетуге көмектеседі.'},
      ru: {category: 'Motion Design', description: '3D motion design для коммуникации smart-city решений Sergek. Анимация, абстрактная визуализация и фирменные пространства помогают понятно представить цифровую инфраструктуру.'}
    },
    project05: {
      kz: {category: 'Коммерциялық жоба', description: 'Hyundai Mufasa көлігін қалалық ортада көрсететін коммерциялық 3D motion контент. Жұмыс көлік анимациясына, атмосфералық ұсынуға және сапалы композитингке бағытталған.'},
      ru: {category: 'Коммерческий проект', description: 'Коммерческий 3D motion-контент с Hyundai Mufasa в городской среде. Работа сосредоточена на анимации автомобиля, атмосферной подаче и аккуратном композитинге.'}
    },
    project06: {
      kz: {category: 'Motion Design', description: 'Әртүрлі жобалар мен жеке эксперименттерден жиналған моушн-дизайн жұмыстарының топтамасы. Мұнда анимация, композитинг, типографика және 3D біріктірілген.'},
      ru: {category: 'Motion Design', description: 'Подборка работ по моушн-дизайну из разных проектов и личных экспериментов, объединяющая анимацию, композитинг, типографику и 3D.'}
    },
    still01: {
      kz: {description: 'Sergek Patrol System тұжырымдамасын таныстыратын 3D статикалық визуалдар сериясы. Стильденген орта мен технологияға бағытталған композициялар жобаны анық әрі түсінікті көрсетеді.'},
      ru: {description: 'Серия статичных 3D-визуалов, представляющая концепцию Sergek Patrol System. Стилизованные пространства и технологичные композиции помогают ясно раскрыть проект.'}
    },
    still02: {
      kz: {description: 'Sergek Group үшін күрделі big data және қалалық технология ұғымдарын анық әрі түсінікті жеткізуге арналған 3D визуалдар сериясы. Жұмыс минималистік ортаны, деректерге негізделген абстрактілі элементтерді және брендтік визуал тілді біріктіреді.'},
      ru: {description: 'Серия 3D-визуалов для Sergek Group, которая помогает понятно и доступно рассказать о сложных концепциях big data и городских технологий. Работа объединяет минималистичные пространства, абстрактные элементы на основе данных и фирменный визуальный язык.'}
    },
    still03: {
      kz: {description: 'Digital District Police жобасына арналған 3D визуализация. Тұжырымдама цифрлық қоғамдық қауіпсіздік жүйелерін стильденген орта, кейіпкерлер және технологияға бағытталған композициялар арқылы қарапайым визуалды оқиғаға айналдырады.'},
      ru: {description: '3D-визуализация для проекта Digital District Police. Концепция превращает цифровые системы общественной безопасности в понятный визуальный сюжет с помощью стилизованных пространств, персонажей и технологичных композиций.'}
    },
    still04: {
      kz: {description: 'KPMG Kazakhstan компаниясының нақты жұмыссыздық деңгейі туралы зерттеуіне арналған презентация дизайны. Визуал жүйе күрделі аналитикалық тақырыпты түсінуді жеңілдету үшін редакциялық типографиканы, деректерге негізделген макеттерді және ұстамды корпоративтік графиканы біріктіреді.'},
      ru: {description: 'Дизайн презентации для исследования KPMG Kazakhstan о реальном уровне безработицы. Визуальная система объединяет редакционную типографику, основанные на данных макеты и сдержанную корпоративную графику, облегчая восприятие сложной аналитической темы.'}
    },
    still05: {
      kz: {description: 'KPMG консалтингтік табыс тарихына арналған корпоративтік презентация дизайны. Жоба анық визуалды иерархия құруға және бизнес-контентті KPMG брендіне сай құрылымды, кәсіби презентацияға айналдыруға бағытталды.'},
      ru: {description: 'Дизайн корпоративной презентации об успешном консалтинговом проекте KPMG. Основной задачей было выстроить ясную визуальную иерархию и превратить бизнес-контент в структурированную, профессиональную презентацию в стиле бренда KPMG.'}
    },
    still06: {
      kz: {description: 'Tetra Pak жобаларына арналған қаптама макеттерін әзірлеу және үйлестіру. Менің рөліме макеттерді бейімдеу, техникалық тексеру, өндіріске дейінгі бақылау және бірнеше қаптама нұсқасы бойынша дизайн талаптарын өндірістік сипаттамалармен үйлестіру кірді.'},
      ru: {description: 'Разработка и координация макетов упаковки для проектов Tetra Pak. Моя роль включала адаптацию макетов, техническую проверку, предпроизводственный контроль и согласование требований дизайна с производственными спецификациями для нескольких вариантов упаковки.'}
    }
  };

  const generic3d = {
    kz: 'Интерактивті 3D модель.',
    en: 'Interactive 3D model.',
    ru: 'Интерактивная 3D-модель.'
  };
  const generic3dCharacter = {
    kz: 'Интерактивті 3D кейіпкер моделі.',
    en: 'Interactive 3D character model.',
    ru: 'Интерактивная 3D-модель персонажа.'
  };

  let language = (() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return supported.includes(saved) ? saved : 'en';
    } catch { return 'en'; }
  })();

  function format(value, vars = {}) {
    return String(value ?? '').replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '');
  }

  function t(key, vars) {
    return format(ui[language]?.[key] ?? ui.en[key] ?? key, vars);
  }

  function projectField(project, field) {
    if (!project) return '';
    if (field === 'title') return project.title ?? '';
    const translation = language === 'en' ? undefined : projectTranslations[project.id]?.[language]?.[field];
    if (translation !== undefined) return translation;
    if (project.sketchfab && field === 'description') {
      const isCharacter = /character model/i.test(project.description || '');
      return isCharacter ? generic3dCharacter[language] : generic3d[language];
    }
    if (project.category === 'Stills' && field === 'category') return t('stillsHeading');
    return project[field] ?? '';
  }

  function count(kind, amount) {
    if (kind === 'models') {
      if (language === 'kz') return `${amount} модель`;
      if (language === 'ru') return `${amount} моделей`;
      return `${amount} ${amount === 1 ? 'model' : 'models'}`;
    }
    if (language === 'kz') return `${amount} жоба`;
    if (language === 'ru') return `${amount} проектов`;
    return `${amount} ${amount === 1 ? 'project' : 'projects'}`;
  }

  function applyStatic(root = document) {
    root.querySelectorAll('[data-i18n]').forEach(node => { node.textContent = t(node.dataset.i18n); });
    root.querySelectorAll('[data-i18n-aria-label]').forEach(node => { node.setAttribute('aria-label', t(node.dataset.i18nAriaLabel)); });
    root.querySelectorAll('[data-i18n-value]').forEach(node => { node.value = t(node.dataset.i18nValue); });
    document.documentElement.lang = language === 'kz' ? 'kk' : language;
    root.querySelectorAll('[data-lang]').forEach(button => {
      const active = button.dataset.lang === language;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function setLanguage(next) {
    if (!supported.includes(next)) return;
    language = next;
    try { localStorage.setItem(STORAGE_KEY, language); } catch {}
    applyStatic();
    document.dispatchEvent(new CustomEvent('portfolio:languagechange', {detail: {language}}));
  }

  document.addEventListener('DOMContentLoaded', () => {
    applyStatic();
    document.querySelectorAll('[data-lang]').forEach(button => button.addEventListener('click', () => setLanguage(button.dataset.lang)));
  });

  window.portfolioI18n = {
    get language() { return language; },
    t,
    projectField,
    count,
    setLanguage,
    applyStatic
  };
})();
