(() => {
  const STORAGE_KEY = 'portfolio-language';
  const supported = ['kz', 'en', 'ru'];

  const ui = {
    kz: {
      brandTagline: 'Motion design, 3D, AI визуалдар',
      navMotion: 'Motion', navStills: 'Статика', nav3d: '3D', navAbout: 'Мен туралы', navContact: 'Байланыс',
      motionHeading: '01 / Motion', stillsHeading: '02 / Статика', modelsHeading: '03 / 3D модельдер',
      aboutHeading: 'Мен туралы',
      aboutP1: 'Мен Алматыда, Қазақстанда тұратын Motion Designer және 3D Artist маманымын.',
      aboutP2: 'Motion design, 3D, AI көмегімен жасалатын визуалдар және коммерциялық контент бағыттарында жұмыс істеймін. Дизайн, анимация және визуалды сторителлингті біріктіремін.',
      aboutP3: 'KPMG, Tetra Pak, Sergek Group компанияларында және жылжымайтын мүлік жобаларында жұмыс істедім. Негізгі назарым — сапалы визуал, түсінікті коммуникация және өндіріске дайын нәтиже.',
      experience: 'Тәжірибе',
      roleMotion: 'Motion Designer', role3dMotion: '3D Motion Designer', roleDesignDev: 'Design Developer / Coordinator', roleSenior: 'Senior Graphic / Motion Designer', roleGraphic3d: 'Graphic Designer / 3D Constructor', present: 'Қазір',
      contact: 'Байланыс', contactIntro: 'Жоба, ынтымақтастық немесе басқа сұрақтар бойынша:', name: 'Аты', email: 'Email', message: 'Хабарлама', send: 'Жіберу',
      formNote: 'FormSubmit арқылы жіберіледі. Жіберуді растау сұралуы мүмкін.', follow: 'Әлеуметтік желілер:',
      projects: 'жоба', models: 'модель', viewProject: 'Жобаны көру ↗', viewModel: 'Модельді көру', openSketchfab: 'Sketchfab-та ашу ↗',
      openProject: 'Жобаны көру', previousProject: 'Алдыңғы жоба', nextProject: 'Келесі жоба', showProject: 'Көрсету: {title}', openCard: 'Ашу: {title}',
      previewPlaceholder: 'Превью кейін қосылады', pdfDocument: 'PDF құжаты', openPdf: 'PDF ашу', pdfFallback: 'Бұл құжатты көру үшін PDF ашыңыз.', mediaUnavailable: 'Медиа қолжетімсіз — файл кейін қосылады', preview3dUnavailable: '3D превью қолжетімсіз',
      mainVideo: 'Негізгі видео', video: 'Видео', interactiveModel: '{title} — интерактивті 3D модель', mediaLabel: '{title}, медиа {number}', close: 'Жабу'
    },
    en: {
      brandTagline: 'Motion design, 3D, AI Visuals',
      navMotion: 'Motion', navStills: 'Stills', nav3d: '3D', navAbout: 'About', navContact: 'Contact',
      motionHeading: '01 / Motion', stillsHeading: '02 / Stills', modelsHeading: '03 / 3D Models',
      aboutHeading: 'About',
      aboutP1: "I'm a Motion Designer and 3D Artist based in Almaty, Kazakhstan.",
      aboutP2: 'I work across motion design, 3D, AI-assisted visuals and commercial content, combining design, animation and visual storytelling.',
      aboutP3: 'My background includes work with KPMG, Tetra Pak, Sergek Group and real estate projects, with a focus on polished visuals, clear communication and production-ready execution.',
      experience: 'Experience',
      roleMotion: 'Motion Designer', role3dMotion: '3D Motion Designer', roleDesignDev: 'Design Developer / Coordinator', roleSenior: 'Senior Graphic / Motion Designer', roleGraphic3d: 'Graphic Designer / 3D Constructor', present: 'Present',
      contact: 'Contact', contactIntro: 'For commissions, collaborations or inquiries:', name: 'Name', email: 'Email', message: 'Message', send: 'Send message',
      formNote: 'Sent via FormSubmit. You may be asked to verify your submission.', follow: 'Follow:',
      projects: 'projects', models: 'models', viewProject: 'View project ↗', viewModel: 'View model', openSketchfab: 'Open on Sketchfab ↗',
      openProject: 'View project', previousProject: 'Previous project', nextProject: 'Next project', showProject: 'Show {title}', openCard: 'Open {title}',
      previewPlaceholder: 'Preview placeholder — image to be added', pdfDocument: 'PDF document', openPdf: 'Open PDF', pdfFallback: 'Use Open PDF to view this document.', mediaUnavailable: 'Media unavailable — file to be added', preview3dUnavailable: '3D preview unavailable',
      mainVideo: 'Main video', video: 'Video', interactiveModel: '{title} — interactive 3D model', mediaLabel: '{title}, media {number}', close: 'Close'
    },
    ru: {
      brandTagline: 'Motion design, 3D, AI-визуалы',
      navMotion: 'Motion', navStills: 'Статика', nav3d: '3D', navAbout: 'Обо мне', navContact: 'Контакты',
      motionHeading: '01 / Motion', stillsHeading: '02 / Статика', modelsHeading: '03 / 3D модели',
      aboutHeading: 'Обо мне',
      aboutP1: 'Я Motion Designer и 3D Artist из Алматы, Казахстан.',
      aboutP2: 'Работаю с motion design, 3D, AI-визуалами и коммерческим контентом, объединяя дизайн, анимацию и визуальный сторителлинг.',
      aboutP3: 'Работал с KPMG, Tetra Pak, Sergek Group и проектами в сфере недвижимости. Основной фокус — качественный визуал, понятная коммуникация и готовый к продакшену результат.',
      experience: 'Опыт',
      roleMotion: 'Motion Designer', role3dMotion: '3D Motion Designer', roleDesignDev: 'Design Developer / Coordinator', roleSenior: 'Senior Graphic / Motion Designer', roleGraphic3d: 'Graphic Designer / 3D Constructor', present: 'Наст. время',
      contact: 'Контакты', contactIntro: 'По вопросам проектов, сотрудничества и другим запросам:', name: 'Имя', email: 'Email', message: 'Сообщение', send: 'Отправить',
      formNote: 'Отправка через FormSubmit. Может потребоваться подтверждение.', follow: 'Соцсети:',
      projects: 'проектов', models: 'моделей', viewProject: 'Смотреть проект ↗', viewModel: 'Смотреть модель', openSketchfab: 'Открыть на Sketchfab ↗',
      openProject: 'Смотреть проект', previousProject: 'Предыдущий проект', nextProject: 'Следующий проект', showProject: 'Показать: {title}', openCard: 'Открыть: {title}',
      previewPlaceholder: 'Превью будет добавлено позже', pdfDocument: 'PDF-документ', openPdf: 'Открыть PDF', pdfFallback: 'Откройте PDF, чтобы посмотреть документ.', mediaUnavailable: 'Медиа недоступно — файл будет добавлен позже', preview3dUnavailable: '3D-превью недоступно',
      mainVideo: 'Главное видео', video: 'Видео', interactiveModel: '{title} — интерактивная 3D-модель', mediaLabel: '{title}, медиа {number}', close: 'Закрыть'
    }
  };

  const projectText = {
    project01: {
      kz: {category: 'AI визуалдар', description: 'Taulan тұрғын үй кешеніне арналған AI көмегімен жасалған архитектуралық визуалдар мен motion design. Негізгі акцент — атмосфера, өмір салты және премиум презентация.'},
      ru: {category: 'AI-визуалы', description: 'Архитектурные AI-визуалы и motion design для жилого комплекса Taulan с акцентом на атмосферу, образ жизни и премиальную подачу.'}
    },
    project02: {
      kz: {title: 'Ұлттық валюта күні', category: '3D', description: 'Қазақстанның Ұлттық валюта күніне арналған 3D motion жұмыс.'},
      ru: {title: 'День национальной валюты', category: '3D', description: '3D motion-ролик ко Дню национальной валюты Казахстана.'}
    },
    project03: {
      kz: {category: 'AI визуалдар', description: 'Sergek Group HR-коммуникация науқанына арналған кейіпкер анимациясы және motion design.'},
      ru: {category: 'AI-визуалы', description: 'Анимация персонажа и motion design для HR-коммуникационной кампании Sergek Group.'}
    },
    project04: {
      kz: {category: 'Motion Design', description: 'Sergek-тің smart city технологиялары мен цифрлық инфрақұрылымын көрсететін motion graphics.'},
      ru: {category: 'Motion Design', description: 'Motion graphics о технологиях smart city и цифровой инфраструктуре Sergek.'}
    },
    project05: {
      kz: {category: 'Коммерциялық жоба', description: 'Hyundai Mufasa көлігіне арналған қалалық ортадағы 3D коммерциялық анимация.'},
      ru: {category: 'Коммерческий проект', description: 'Коммерческая 3D-анимация Hyundai Mufasa в городской среде.'}
    },
    project06: {
      kz: {category: 'Motion Design', description: 'Жаһандық ауқым мен кәсіби қызметтерге арналған корпоративтік бренд-презентация үшін жасалған motion design.'},
      ru: {category: 'Motion Design', description: 'Motion design для корпоративной бренд-презентации с акцентом на глобальный охват и профессиональные услуги.'}
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
      return supported.includes(saved) ? saved : 'kz';
    } catch { return 'kz'; }
  })();

  function format(value, vars = {}) {
    return String(value ?? '').replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '');
  }

  function t(key, vars) {
    return format(ui[language]?.[key] ?? ui.en[key] ?? key, vars);
  }

  function projectField(project, field) {
    if (!project) return '';
    if (project.id && projectText[project.id]?.[language]?.[field] !== undefined) return projectText[project.id][language][field];
    if (project.sketchfab && field === 'description') {
      const isCharacter = /character model/i.test(project.description || '');
      return isCharacter ? generic3dCharacter[language] : generic3d[language];
    }
    if (project.autoMedia && field === 'title') {
      const match = /^Still\s+(\d+)$/i.exec(project.title || '');
      if (match) return language === 'kz' ? `Статика ${match[1]}` : language === 'ru' ? `Статика ${match[1]}` : project.title;
    }
    if (project.autoMedia && field === 'category') return language === 'en' ? 'Stills' : 'Статика';
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
