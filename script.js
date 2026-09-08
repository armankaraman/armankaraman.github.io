document.addEventListener('DOMContentLoaded', () => {
  const i18n = window.portfolioI18n;
  const tr = (key, vars) => i18n?.t(key, vars) ?? key;
  const projectText = (project, field) => i18n?.projectField(project, field) ?? project?.[field] ?? '';
  const header = document.querySelector('.site-header');
  const measureHeader = () => document.documentElement.style.setProperty('--header-height', `${header.offsetHeight}px`);
  measureHeader();
  new ResizeObserver(measureHeader).observe(header);
  const portrait = document.querySelector('.about-portrait');
  if (portrait) {
    const portraitObserver = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        portrait.classList.add('is-visible');
        portraitObserver.disconnect();
      }
    });
    portraitObserver.observe(portrait);
  }
  const lightbox = document.getElementById('lightbox');
  const lbMedia = lightbox.querySelector('.lightbox-media');
  const closeButton = lightbox.querySelector('.close');
  const galleries = [];
  let savedScroll, opener, bodyStyle, modalOpen = false;
  let galleryDiscovery;
  const discoveredGalleries = new Map();
  const mediaExistence = new Map();
  async function fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (options.signal?.aborted) controller.abort();
    else options.signal?.addEventListener('abort', abort, {once: true});
    const timer = setTimeout(abort, 10000);
    try { return await fetch(url, {...options, signal: controller.signal}); }
    finally {
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', abort);
    }
  }
  function releaseMedia(container) {
    container.querySelectorAll('video').forEach(video => {
      video.pause();
      // Cancel unfinished downloads and release decoders before removing nodes.
      video.removeAttribute('src');
      video.load();
    });
  }
  async function discoverGallery(project, signal) {
    if (discoveredGalleries.has(project.id)) return discoveredGalleries.get(project.id);
    const found = [];
    const extensions = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif', 'mp4', 'webm', 'pdf'];
    // Number additional files consecutively from 2; the first missing number ends the list.
    for (let number = 2; !signal.aborted; number++) {
      const matches = await Promise.all(extensions.map(async extension => {
        const src = `assets/${project.id}-${number}.${extension}`;
        if (mediaExistence.has(src)) return mediaExistence.get(src) ? src : null;
        const response = await fetchWithTimeout(src, {method: 'HEAD', signal});
        if (response.status === 404) { mediaExistence.set(src, false); return null; }
        if (!response.ok) throw new Error('Could not inspect project media');
        const exists = !response.headers.get('content-type')?.includes('text/html');
        mediaExistence.set(src, exists);
        return exists ? src : null;
      }));
      const files = matches.filter(Boolean);
      if (!files.length) {
        discoveredGalleries.set(project.id, found);
        return found;
      }
      found.push(...files);
    }
    return found;
  }
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    node.className = cls;
    if (text) node.textContent = text;
    return node;
  };
  // A bare filename means a file in assets; existing paths and URLs still work.
  const assetPath = name => name && !/[/:\\]/.test(name) ? `assets/${name}` : name;
  const mediaData = item => {
    if (!item) return item;
    const data = typeof item === 'string'
      ? {src: item, type: /\.(mp4|webm)(?:[?#]|$)/i.test(item) ? 'video' : /\.pdf(?:[?#]|$)/i.test(item) ? 'pdf' : 'image'}
      : {...item};
    return {...data, src: assetPath(data.src), poster: assetPath(data.poster)};
  };
  function makeMedia(item, title, preview = false, deferPreviewImage = false) {
    const data = mediaData(item);
    if (!data?.src) return el('div', 'media-placeholder', tr('previewPlaceholder'));
    if (data.type === 'pdf') {
      if (preview) return el('div', 'media-placeholder', tr('pdfDocument'));
      const wrapper = el('div', 'pdf-media');
      const link = el('a', 'pdf-link', tr('openPdf'));
      link.href = data.src;
      link.target = '_blank';
      link.rel = 'noopener';
      const viewer = el('object', 'pdf-viewer');
      viewer.type = 'application/pdf';
      viewer.data = data.src;
      viewer.setAttribute('aria-label', `${title} PDF`);
      viewer.append(el('p', '', tr('pdfFallback')));
      wrapper.append(link, viewer);
      return wrapper;
    }
    const video = data.type === 'video';
    const variant = typeof mediaVariants !== 'undefined' ? mediaVariants[data.src] : null;
    const node = el(video ? 'video' : 'img', '');
    if (video) {
      node.muted = node.defaultMuted = node.playsInline = node.loop = true;
      node.controls = !preview;
      node.preload = preview ? 'none' : 'metadata';
      if (data.poster || variant?.poster) node.poster = data.poster || variant.poster;
    } else {
      node.alt = data.alt ?? title;
      node.loading = preview ? 'lazy' : 'eager';
      node.decoding = 'async';
    }
    if (preview && video) {
      node.dataset.src = variant?.preview || data.src;
    } else {
      const resolvedSrc = preview && variant?.preview ? variant.preview : data.src;
      if (preview && !video && deferPreviewImage) node.dataset.src = resolvedSrc;
      else node.src = resolvedSrc;
    }
    node.addEventListener('error', () => {
      if (variant?.preview && node.getAttribute('src') === variant.preview) {
        node.src = data.src;
        if (video && node.dataset.playing === 'true') node.play().catch(() => { node.dataset.playing = 'false'; });
      } else node.replaceWith(el('div', 'media-placeholder', tr('mediaUnavailable')));
    });
    return node;
  }
  function createGallery(id, items, modelGallery = false) {
    const previewJobs = [];
    const stage = document.getElementById(id);
    const section = stage.closest('.scroll-gallery');
    const headingCount = section.querySelector('.gallery-heading p');
    const updateHeadingCount = () => { headingCount.textContent = i18n?.count(modelGallery ? 'models' : 'projects', items.length) ?? `${items.length}`; };
    updateHeadingCount();
    const pagination = el('div', 'gallery-pagination');
    const dots = items.map((project, index) => {
      const dot = el('button', 'gallery-dot');
      dot.type = 'button';
      dot.setAttribute('aria-label', tr('showProject', {title: projectText(project, 'title')}));
      dot.addEventListener('click', () => {
        galleries.find(gallery => gallery.section === section).selectedIndex = index;
        scheduleUpdate();
      });
      pagination.append(dot);
      return dot;
    });
    const previous = el('button', 'gallery-arrow', '\u2190');
    const next = el('button', 'gallery-arrow', '\u2192');
    for (const [button, direction, labelKey] of [[previous, -1, 'previousProject'], [next, 1, 'nextProject']]) {
      button.type = 'button';
      button.setAttribute('aria-label', tr(labelKey));
      button.addEventListener('click', () => stepGallery(galleries.find(gallery => gallery.section === section), direction));
    }
    section.querySelector('.gallery-footer').append(previous, pagination, next);
    const cards = items.map((project, index) => {
      const card = el('button', 'perspective-card');
      card.type = 'button';
      card.setAttribute('aria-label', tr('openCard', {title: projectText(project, 'title')}));
      const visual = el('div', 'card-preview');
      if (modelGallery && !project.preview) {
        visual.append(el('div', 'media-placeholder', tr('preview3dUnavailable')));
        previewJobs.push(() => fetchWithTimeout(`https://sketchfab.com/oembed?url=${encodeURIComponent(project.sketchfab)}&format=json`)
          .then(response => { if (!response.ok) throw new Error('Preview unavailable'); return response.json(); })
          .then(data => { if (data.thumbnail_url) visual.replaceChildren(makeMedia(data.thumbnail_url, projectText(project, 'title'), true)); }).catch(() => {}));
      } else {
        const deferPreviewImage = id !== 'projects';
        visual.append(makeMedia(modelGallery ? project.preview : project.media, projectText(project, 'title'), true, deferPreviewImage));
      }
      const copy = el('div', 'card-copy');
      copy.append(el('h3', '', projectText(project, 'title')), el('p', 'card-category', projectText(project, 'category')), el('p', 'card-description', projectText(project, 'description')), el('span', 'project-open', tr('viewProject')));
      card.append(visual, copy);
      if (modelGallery) {
        copy.querySelector('.card-category').textContent = '3D';
        copy.querySelector('.project-open').textContent = tr('viewModel');
      }
      let resolveMain;
      if (!modelGallery && project.autoMedia && !project.media) {
        let pending;
        resolveMain = () => pending ||= (async () => {
          const extensions = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif', 'pdf', 'mp4', 'webm'];
          let failed = false;
          for (const extension of extensions) {
            const src = `assets/${project.id}.${extension}`;
            try {
              const response = await fetchWithTimeout(src, {method: 'HEAD'});
              if (!response.ok || response.headers.get('content-type')?.includes('text/html')) continue;
              project.media = src;
              visual.replaceChildren(makeMedia(src, projectText(project, 'title'), true));
              const gallery = galleries.find(item => item.stage === stage);
              gallery.videos[index] = visual.querySelector('video');
              gallery.lastInView = undefined;
              scheduleUpdate();
              return;
            } catch { failed = true; }
          }
          if (failed) pending = null;
        })();
        previewJobs.push(resolveMain);
      }
      card.addEventListener('click', async () => {
        if (card.dataset.loading === 'true') return;
        card.dataset.loading = 'true';
        card.setAttribute('aria-busy', 'true');
        try {
          await resolveMain?.();
          if (!modalOpen) openGallery(project, card);
        } finally {
          delete card.dataset.loading;
          card.removeAttribute('aria-busy');
        }
      });
      stage.append(card);
      return card;
    });
    const refreshLanguage = () => {
      updateHeadingCount();
      cards.forEach((card, index) => {
        const project = items[index];
        card.setAttribute('aria-label', tr('openCard', {title: projectText(project, 'title')}));
        dots[index].setAttribute('aria-label', tr('showProject', {title: projectText(project, 'title')}));
        card.querySelector('.card-copy h3').textContent = projectText(project, 'title');
        card.querySelector('.card-category').textContent = modelGallery ? '3D' : projectText(project, 'category');
        card.querySelector('.card-description').textContent = projectText(project, 'description');
        card.querySelector('.project-open').textContent = modelGallery ? tr('viewModel') : tr('viewProject');
      });
      previous.setAttribute('aria-label', tr('previousProject'));
      next.setAttribute('aria-label', tr('nextProject'));
    };
    galleries.push({section, stage, cards, dots, previous, next, selectedIndex: Math.min(2, items.length - 1), videos: cards.map(card => card.querySelector('video')), items, modelGallery, refreshLanguage});

    // Motion is the first visible section, so its previews stay immediate.
    // Stills / explicit 3D image previews do not get a src until their section is close to view.
    const deferredImages = [...stage.querySelectorAll('img[data-src]:not([src])')];
    if (deferredImages.length) {
      const activateImages = () => deferredImages.forEach(image => {
        if (!image.src && image.dataset.src) image.src = image.dataset.src;
      });
      const imageObserver = new IntersectionObserver(entries => {
        if (!entries.some(entry => entry.isIntersecting)) return;
        imageObserver.disconnect();
        activateImages();
      }, {rootMargin: '20% 0px'});
      imageObserver.observe(section);
    }

    if (previewJobs.length) {
      const observer = new IntersectionObserver(entries => {
        if (!entries.some(entry => entry.isIntersecting)) return;
        observer.disconnect();
        const worker = async () => { while (previewJobs.length) await previewJobs.shift()(); };
        worker(); worker();
      }, {rootMargin: '35% 0px'});
      observer.observe(section);
    }
  }
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let lastFrame = 0;
  let layoutDirty = true;
  function updateGalleries(now = performance.now()) {
    if (modalOpen) return;
    if (document.hidden) {
      galleries.forEach(({videos}) => videos.forEach(video => {
        if (video) { video.pause(); video.dataset.playing = 'false'; }
      }));
      lastFrame = 0;
      return;
    }
    const elapsed = Math.min(50, lastFrame ? now - lastFrame : 16.7);
    lastFrame = now;
    const blend = 1 - Math.exp(-elapsed / 150);
    let moving = false;
    // Read geometry for every section before writing transforms: no layout thrashing.
    if (layoutDirty) {
      galleries.forEach(gallery => {
        const {section, stage, cards} = gallery;
        gallery.layout = {top: section.offsetTop,
          stageTop: stage.getBoundingClientRect().top - section.getBoundingClientRect().top, stageHeight: stage.offsetHeight,
          width: cards[0].offsetWidth, stageWidth: stage.clientWidth};
        gallery.lastProgress = undefined;
      });
      layoutDirty = false;
    }
    galleries.forEach(gallery => {
      const {section, cards, dots, videos} = gallery;
      const {top, stageTop, stageHeight, width, stageWidth} = gallery.layout;
      const stageY = top - scrollY + stageTop;
      const rect = {top: stageY, bottom: stageY + stageHeight};
      const target = gallery.selectedIndex;
      if (gallery.target !== target) {
        gallery.previous.disabled = target === 0;
        gallery.next.disabled = target === cards.length - 1;
        gallery.target = target;
      }
      const outside = rect.bottom <= 0 || rect.top >= innerHeight;
      if (gallery.progress === undefined || reducedMotion.matches || outside) gallery.progress = target;
      else gallery.progress += (target - gallery.progress) * blend;
      if (Math.abs(target - gallery.progress) < 0.0005) gallery.progress = target;
      else moving = true;
      const progress = gallery.progress;
      const active = Math.round(progress);
      const activeChanged = gallery.lastActive !== active;
      const inView = rect.bottom > 0 && rect.top < innerHeight && !document.hidden;
      if (gallery.lastProgress === progress && gallery.lastInView === inView) return;
      gallery.lastProgress = progress;
      gallery.lastInView = inView;
      const gap = innerWidth <= 640 ? 12 : 26;
      cards.forEach((card, index) => {
        const distance = index - progress;
        const x = distance * (width + gap);
        const depth = -100 * (Math.sqrt(distance * distance + 0.16) - 0.4);
        const angle = 28 * Math.tanh(distance * 1.35);
        const scale = 0.86 + 0.24 * Math.exp(-3 * distance * distance);
        card.style.transform = `translate3d(${x}px,0,${depth}px) rotateY(${angle}deg) scale(${scale})`;
        const zIndex = String(10 - Math.round(Math.abs(distance)));
        if (card.style.zIndex !== zIndex) card.style.zIndex = zIndex;
        if (activeChanged) card.classList.toggle('is-active', index === active);
        const visible = Math.abs(x) < stageWidth / 2 + width;
        const visibility = visible ? 'visible' : 'hidden';
        if (card.style.visibility !== visibility) card.style.visibility = visibility;
        if (card.tabIndex !== (visible ? 0 : -1)) card.tabIndex = visible ? 0 : -1;
        const video = videos[index];
        if (video) {
          const shouldPlay = inView && visible && !reducedMotion.matches && !navigator.connection?.saveData;
          if (shouldPlay && video.dataset.playing !== 'true') {
            if (!video.hasAttribute('src')) video.src = video.dataset.src;
            video.dataset.playing = 'true';
            video.play().catch(() => { video.dataset.playing = 'false'; });
          } else if (!shouldPlay) {
            video.pause();
            video.dataset.playing = 'false';
          }
        }
        if (activeChanged) dots[index].setAttribute('aria-current', index === active ? 'true' : 'false');
      });
      if (activeChanged) {
        section.dataset.activeIndex = active;
        gallery.lastActive = active;
      }
    });
    if (moving) scheduleUpdate();
    else lastFrame = 0;
  }
  function openGallery(project, trigger) {
    galleryDiscovery?.abort();
    galleryDiscovery = new AbortController();
    const discoverySignal = galleryDiscovery.signal;
    opener = trigger;
    activeProject = project;
    savedScroll = scrollY;
    bodyStyle = document.body.getAttribute('style');
    modalOpen = true;
    document.querySelectorAll('.perspective-card video').forEach(video => { video.pause(); video.dataset.playing = 'false'; });
    lbMedia.replaceChildren();
    const items = [project.media, ...(project.gallery || [])].filter(Boolean);
    const active = el('div', 'lightbox-active-media');
    const navigation = el('div', 'lightbox-gallery');
    let selectedMediaIndex = -1;
    lbMedia.append(active);
    function select(index) {
      if (!items.length) return;
      const nextIndex = clamp(index, 0, items.length - 1);
      if (nextIndex === selectedMediaIndex) return;
      selectedMediaIndex = nextIndex;
      releaseMedia(active);
      active.replaceChildren(makeMedia(items[selectedMediaIndex], projectText(project, 'title')));
      active.querySelector('video')?.play().catch(() => {});
      [...navigation.children].forEach((button, i) => button.setAttribute('aria-pressed', String(i === selectedMediaIndex)));
    }
    lightbox.stepMedia = direction => select(selectedMediaIndex + direction);
    function appendPreview(item, index) {
      const data = mediaData(item);
      const button = el('button', 'lightbox-gallery-item');
      button.type = 'button';
      button.setAttribute('aria-label', tr('mediaLabel', {title: projectText(project, 'title'), number: index + 1}));
      button.setAttribute('aria-pressed', String(index === 0));
      const variant = typeof mediaVariants !== 'undefined' ? mediaVariants[data.src] : null;
      const thumbnail = makeMedia(variant?.poster ? {src: variant.poster, type: 'image'} : data, projectText(project, 'title'), true);
      if (thumbnail.tagName === 'IMG') thumbnail.alt = '';
      if (thumbnail.tagName === 'VIDEO') { thumbnail.preload = 'metadata'; thumbnail.src = thumbnail.dataset.src; }
      button.append(thumbnail);
      if (data.type === 'video') button.append(el('span', 'thumbnail-label', index === 0 ? tr('mainVideo') : tr('video')));
      button.addEventListener('click', () => select(index));
      navigation.append(button);
    }
    if (project.sketchfab) {
      const viewer = el('iframe', 'sketchfab-viewer');
      viewer.title = tr('interactiveModel', {title: projectText(project, 'title')});
      viewer.allow = 'autoplay; fullscreen; xr-spatial-tracking';
      viewer.allowFullscreen = true;
      const embedUrl = new URL(project.sketchfab);
      embedUrl.searchParams.set('autostart', '1');
      viewer.src = embedUrl.href;
      active.append(viewer);
    } else if (items.length) {
      if (items.length > 1) {
        items.forEach(appendPreview);
        lbMedia.append(navigation);
      }
      select(0);
    } else active.append(makeMedia(null, projectText(project, 'title')));
    for (const [selector, value] of Object.entries({'.lightbox-category': projectText(project, 'category') || (project.sketchfab ? '3D' : ''), '.lightbox-title': projectText(project, 'title'), '.lightbox-year': project.year, '.lightbox-description': projectText(project, 'description')})) lightbox.querySelector(selector).textContent = value || '';
    const link = lightbox.querySelector('.lightbox-link');
    let externalLink = project.link;
    if (project.sketchfab) {
      const modelUrl = new URL(project.sketchfab);
      modelUrl.pathname = modelUrl.pathname.replace(/\/embed\/?$/, '');
      modelUrl.search = '';
      externalLink = modelUrl.href;
    }
    link.textContent = project.sketchfab ? tr('openSketchfab') : tr('openProject');
    link.classList.toggle('is-visible', Boolean(externalLink));
    if (externalLink) link.href = externalLink;
    else link.removeAttribute('href');
    lightbox.inert = false;
    lightbox.setAttribute('aria-hidden', 'false');
    Object.assign(document.body.style, {position: 'fixed', top: `-${savedScroll}px`, width: '100%', overflow: 'hidden'});
    document.querySelector('main').inert = document.querySelector('header').inert = true;
    lightbox.scrollTop = 0;
    closeButton.focus({preventScroll: true});
    if (project.discoverMedia === true) {
      discoverGallery(project, discoverySignal).then(files => {
        if (discoverySignal.aborted || !modalOpen) return;
        const existing = new Set(items.map(item => mediaData(item).src));
        const additions = files.filter(src => !existing.has(src));
        if (!additions.length) return;
        if (!navigation.children.length) items.forEach(appendPreview);
        additions.forEach(src => { items.push(src); appendPreview(src, items.length - 1); });
        if (!navigation.isConnected) lbMedia.append(navigation);
      }).catch(() => { /* Explicit gallery files remain available if discovery fails. */ });
    }
  }
  function closeGallery() {
    if (!modalOpen) return;
    galleryDiscovery?.abort();
    releaseMedia(lbMedia);
    lbMedia.replaceChildren();
    lightbox.setAttribute('aria-hidden', 'true');
    lightbox.inert = true;
    if (bodyStyle === null) document.body.removeAttribute('style');
    else document.body.setAttribute('style', bodyStyle);
    document.querySelector('main').inert = document.querySelector('header').inert = false;
    window.scrollTo({top: savedScroll, behavior: 'instant'});
    modalOpen = false;
    activeProject = null;
    delete lightbox.stepMedia;
    galleries.forEach(gallery => { gallery.lastInView = undefined; });
    opener?.focus({preventScroll: true});
    updateGalleries();
  }
  let activeProject = null;
  createGallery('projects', projects);
  createGallery('static-projects', staticProjects);
  createGallery('three-d-projects', threeDProjects, true);
  function stepGallery(gallery, direction) {
    if (modalOpen) return;
    gallery.selectedIndex = clamp(gallery.selectedIndex + direction, 0, gallery.cards.length - 1);
    scheduleUpdate();
  }
  let drag = null;
  let suppressClickUntil = 0;
  galleries.forEach(gallery => {
    gallery.stage.addEventListener('dragstart', event => event.preventDefault());
    gallery.stage.addEventListener('pointerdown', event => {
      if (modalOpen || !event.isPrimary || event.button !== 0) return;
      drag = {gallery, id: event.pointerId, x: event.clientX, y: event.clientY, horizontal: false};
    });
  });
  function activeViewportGallery() {
    const viewportCenter = innerHeight / 2;
    return galleries
      .map(gallery => ({gallery, rect: gallery.section.getBoundingClientRect()}))
      .filter(({rect}) => rect.bottom > 0 && rect.top < innerHeight)
      .sort((a, b) => Math.abs((a.rect.top + a.rect.bottom) / 2 - viewportCenter) - Math.abs((b.rect.top + b.rect.bottom) / 2 - viewportCenter))[0]?.gallery;
  }
  function isEditableTarget(target) {
    return target instanceof Element && Boolean(target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])'));
  }
  document.addEventListener('keydown', event => {
    if (modalOpen || !['ArrowLeft', 'ArrowRight'].includes(event.key) || isEditableTarget(event.target)) return;
    const gallery = activeViewportGallery();
    if (!gallery) return;
    event.preventDefault();
    stepGallery(gallery, event.key === 'ArrowRight' ? 1 : -1);
  });
  window.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.horizontal && Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) { drag = null; return; }
    if (!drag.horizontal && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
      drag.horizontal = true;
      drag.gallery.stage.setPointerCapture(event.pointerId);
      drag.gallery.stage.classList.add('is-dragging');
    }
    if (drag.horizontal) suppressClickUntil = performance.now() + 500;
  }, {passive: true});
  function finishDrag(event) {
    if (!drag || event.pointerId !== drag.id) return;
    const {gallery, horizontal, x, id} = drag;
    drag = null;
    gallery.stage.classList.remove('is-dragging');
    if (gallery.stage.hasPointerCapture(id)) gallery.stage.releasePointerCapture(id);
    if (horizontal) {
      suppressClickUntil = performance.now() + 500;
      if (event.type === 'pointerup' && Math.abs(event.clientX - x) >= 30) stepGallery(gallery, event.clientX < x ? 1 : -1);
    }
  }
  window.addEventListener('pointerup', finishDrag);
  window.addEventListener('pointercancel', finishDrag);
  let sectionSwipe = null;
  const mobileInput = matchMedia('(max-width: 640px), (pointer: coarse)');
  const sections = [...document.querySelectorAll('main > .section')];
  function sectionAtViewport() {
    const center = scrollY + innerHeight / 2;
    return sections.reduce((closest, section) => {
      const distance = Math.abs(section.offsetTop + section.offsetHeight / 2 - center);
      return !closest || distance < closest.distance ? {section, distance} : closest;
    }, null)?.section;
  }
  function moveToAdjacentSection(direction) {
    const current = sectionAtViewport();
    const index = sections.indexOf(current);
    const next = sections[index + direction];
    if (!next) return;
    next.scrollIntoView({behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start'});
  }
  document.addEventListener('pointerdown', event => {
    if (!mobileInput.matches || modalOpen || !event.isPrimary || event.pointerType === 'mouse' || isEditableTarget(event.target)) return;
    sectionSwipe = {x: event.clientX, y: event.clientY};
  }, {passive: true});
  document.addEventListener('pointerup', event => {
    if (!sectionSwipe || !event.isPrimary) return;
    const {x, y} = sectionSwipe;
    sectionSwipe = null;
    const dx = event.clientX - x;
    const dy = event.clientY - y;
    if (Math.abs(dy) < 40 || Math.abs(dy) <= Math.abs(dx) * 1.2) return;
    moveToAdjacentSection(dy < 0 ? 1 : -1);
  }, {passive: true});
  document.addEventListener('pointercancel', () => { sectionSwipe = null; }, {passive: true});
  document.addEventListener('click', event => {
    if (performance.now() < suppressClickUntil && event.target.closest('.perspective-stage')) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);
  // Native scrolling keeps wheel and trackpad input responsive.
  let queued = false;
  function scheduleUpdate() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(now => { queued = false; updateGalleries(now); });
  }
  window.addEventListener('scroll', scheduleUpdate, {passive: true});
  const invalidateLayout = () => { layoutDirty = true; scheduleUpdate(); };
  window.addEventListener('resize', invalidateLayout);
  const layoutObserver = new ResizeObserver(invalidateLayout);
  galleries.forEach(({stage, section}) => { layoutObserver.observe(stage); layoutObserver.observe(section); });
  document.addEventListener('visibilitychange', () => {
    galleries.forEach(gallery => { gallery.lastInView = undefined; });
    if (document.hidden) updateGalleries(); else scheduleUpdate();
  });
  // Retry browser-blocked autoplay on a gesture and after BFCache restoration.
  const retryPreviews = () => {
    galleries.forEach(gallery => { gallery.lastInView = undefined; });
    scheduleUpdate();
  };
  window.addEventListener('pageshow', retryPreviews);
  document.addEventListener('pointerup', retryPreviews, {passive: true});
  reducedMotion.addEventListener('change', retryPreviews);
  document.addEventListener('portfolio:languagechange', () => {
    galleries.forEach(gallery => gallery.refreshLanguage?.());
    closeButton.setAttribute('aria-label', tr('close'));
    if (modalOpen && activeProject) {
      lightbox.querySelector('.lightbox-category').textContent = projectText(activeProject, 'category') || (activeProject.sketchfab ? '3D' : '');
      lightbox.querySelector('.lightbox-title').textContent = projectText(activeProject, 'title');
      lightbox.querySelector('.lightbox-description').textContent = projectText(activeProject, 'description');
      const link = lightbox.querySelector('.lightbox-link');
      link.textContent = activeProject.sketchfab ? tr('openSketchfab') : tr('openProject');
      const iframe = lightbox.querySelector('.sketchfab-viewer');
      if (iframe) iframe.title = tr('interactiveModel', {title: projectText(activeProject, 'title')});
      lightbox.querySelectorAll('.lightbox-gallery-item').forEach((button, index) => {
        button.setAttribute('aria-label', tr('mediaLabel', {title: projectText(activeProject, 'title'), number: index + 1}));
        const label = button.querySelector('.thumbnail-label');
        if (label) label.textContent = index === 0 ? tr('mainVideo') : tr('video');
      });
    }
  });
  closeButton.addEventListener('click', closeGallery);
  lightbox.addEventListener('click', event => { if (event.target === lightbox) closeGallery(); });
  document.addEventListener('keydown', event => {
    if (!modalOpen) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeGallery();
      return;
    }
    if ((event.key === 'ArrowLeft' || event.key === 'ArrowRight') && !isEditableTarget(event.target)) {
      event.preventDefault();
      lightbox.stepMedia?.(event.key === 'ArrowRight' ? 1 : -1);
      return;
    }
    if (event.key === 'Tab') {
      const nodes = [...lightbox.querySelectorAll('button, a[href], video[controls], iframe')].filter(node => node.getClientRects().length);
      if (event.shiftKey && document.activeElement === nodes[0]) { event.preventDefault(); nodes.at(-1).focus(); }
      else if (!event.shiftKey && document.activeElement === nodes.at(-1)) { event.preventDefault(); nodes[0].focus(); }
    }
  });
  updateGalleries();
});
