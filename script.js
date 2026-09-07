document.addEventListener('DOMContentLoaded', () => {
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
  function makeMedia(item, title, preview = false) {
    const data = mediaData(item);
    if (!data?.src) return el('div', 'media-placeholder', 'Preview placeholder — image to be added');
    if (data.type === 'pdf') {
      if (preview) return el('div', 'media-placeholder', 'PDF document');
      const wrapper = el('div', 'pdf-media');
      const link = el('a', 'pdf-link', 'Open PDF');
      link.href = data.src;
      link.target = '_blank';
      link.rel = 'noopener';
      const viewer = el('object', 'pdf-viewer');
      viewer.type = 'application/pdf';
      viewer.data = data.src;
      viewer.setAttribute('aria-label', `${title} PDF`);
      viewer.append(el('p', '', 'Use Open PDF to view this document.'));
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
      node.alt = data.alt || title;
      node.loading = 'lazy';
      node.decoding = 'async';
    }
    node.src = preview && variant?.preview ? variant.preview : data.src;
    node.addEventListener('error', () => {
      if (video && variant?.preview && node.getAttribute('src') === variant.preview) {
        node.src = data.src;
        if (node.dataset.playing === 'true') node.play().catch(() => { node.dataset.playing = 'false'; });
      } else node.replaceWith(el('div', 'media-placeholder', 'Media unavailable — file to be added'));
    });
    return node;
  }
  function createGallery(id, items, modelGallery = false) {
    const previewJobs = [];
    const stage = document.getElementById(id);
    const section = stage.closest('.scroll-gallery');
    section.style.setProperty('--project-count', items.length);
    section.querySelector('.gallery-heading p').textContent = `${items.length} ${modelGallery ? 'models' : 'projects'}`;
    const pagination = el('div', 'gallery-pagination');
    const counter = el('span', 'gallery-counter');
    const dots = items.map((project, index) => {
      const dot = el('button', 'gallery-dot');
      dot.type = 'button';
      dot.setAttribute('aria-label', `Show ${project.title}`);
      dot.addEventListener('click', () => {
        if (mobileNavigation.matches) {
          galleries.find(gallery => gallery.section === section).mobileIndex = index;
          scheduleUpdate();
          return;
        }
        const range = section.offsetHeight - section.querySelector('.gallery-sticky').offsetHeight;
        window.scrollTo({top: section.offsetTop + ((index + 0.5) / items.length) * range, behavior: 'instant'});
      });
      pagination.append(dot);
      return dot;
    });
    pagination.append(counter);
    section.querySelector('.gallery-footer').append(pagination, el('span', 'gallery-hint', 'Scroll to move →'));
    const cards = items.map((project, index) => {
      const card = el('button', 'perspective-card');
      card.type = 'button';
      card.setAttribute('aria-label', `Open ${project.title}`);
      const visual = el('div', 'card-preview');
      if (modelGallery && !project.preview) {
        visual.append(el('div', 'media-placeholder', '3D preview unavailable'));
        previewJobs.push(() => fetchWithTimeout(`https://sketchfab.com/oembed?url=${encodeURIComponent(project.sketchfab)}&format=json`)
          .then(response => { if (!response.ok) throw new Error('Preview unavailable'); return response.json(); })
          .then(data => { if (data.thumbnail_url) visual.replaceChildren(makeMedia(data.thumbnail_url, project.title, true)); }).catch(() => {}));
      } else visual.append(makeMedia(modelGallery ? project.preview : project.media, project.title, true));
      const copy = el('div', 'card-copy');
      copy.append(el('h3', '', project.title), el('p', 'card-category', project.category), el('p', 'card-description', project.description), el('span', 'project-open', 'View project ↗'));
      card.append(visual, copy);
      if (modelGallery) {
        copy.querySelector('.card-category').textContent = '3D';
        copy.querySelector('.project-open').textContent = 'View model';
      }
      let resolveMain;
      if (!modelGallery && project.autoMedia) {
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
              visual.replaceChildren(makeMedia(src, project.title, true));
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
    galleries.push({section, stage, cards, dots, counter, videos: cards.map(card => card.querySelector('video'))});
    if (previewJobs.length) {
      const observer = new IntersectionObserver(entries => {
        if (!entries.some(entry => entry.isIntersecting)) return;
        observer.disconnect();
        const worker = async () => { while (previewJobs.length) await previewJobs.shift()(); };
        worker(); worker();
      }, {rootMargin: '100% 0px'});
      observer.observe(section);
    }
  }
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobileNavigation = window.matchMedia('(max-width: 640px), (pointer: coarse)');
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
          range: section.offsetHeight - section.firstElementChild.offsetHeight,
          stageTop: stage.offsetTop, stageHeight: stage.offsetHeight,
          width: cards[0].offsetWidth, stageWidth: stage.clientWidth};
        gallery.lastProgress = undefined;
      });
      layoutDirty = false;
    }
    galleries.forEach(gallery => {
      const {section, cards, dots, counter, videos} = gallery;
      const {top, range, stageTop, stageHeight, width, stageWidth} = gallery.layout;
      const stageY = (mobileNavigation.matches ? top : Math.min(Math.max(top, scrollY), top + range)) - scrollY + stageTop;
      const rect = {top: stageY, bottom: stageY + stageHeight};
      // Half a step at either end holds the first and last projects in the centre.
      const target = mobileNavigation.matches ? (gallery.mobileIndex ?? 0)
        : Math.round(clamp((window.scrollY - top) / Math.max(1, range) * cards.length - 0.5, 0, cards.length - 1));
      gallery.target = target;
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
          if (inView && Math.abs(distance) <= 2 && video.preload === 'none' && !navigator.connection?.saveData) video.preload = 'metadata';
          if (inView && visible && video.dataset.playing !== 'true') {
            video.dataset.playing = 'true';
            video.play().catch(() => { video.dataset.playing = 'false'; });
          } else if (!inView || !visible) {
            video.pause();
            video.dataset.playing = 'false';
          }
        }
        if (activeChanged) dots[index].setAttribute('aria-current', index === active ? 'true' : 'false');
      });
      if (activeChanged) {
        section.dataset.activeIndex = active;
        counter.textContent = `${String(active + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`;
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
    savedScroll = scrollY;
    bodyStyle = document.body.getAttribute('style');
    modalOpen = true;
    document.querySelectorAll('.perspective-card video').forEach(video => { video.pause(); video.dataset.playing = 'false'; });
    lbMedia.replaceChildren();
    const items = [project.media, ...(project.gallery || [])].filter(Boolean);
    const active = el('div', 'lightbox-active-media');
    const navigation = el('div', 'lightbox-gallery');
    lbMedia.append(active);
    function select(index) {
      releaseMedia(active);
      active.replaceChildren(makeMedia(items[index], project.title));
      active.querySelector('video')?.play().catch(() => {});
      [...navigation.children].forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
    }
    function appendPreview(item, index) {
      const data = mediaData(item);
      const button = el('button', 'lightbox-gallery-item');
      button.type = 'button';
      button.setAttribute('aria-label', `${project.title}, media ${index + 1}`);
      button.setAttribute('aria-pressed', String(index === 0));
      const variant = typeof mediaVariants !== 'undefined' ? mediaVariants[data.src] : null;
      const thumbnail = makeMedia(variant?.poster ? {src: variant.poster, type: 'image'} : data, project.title, true);
      if (thumbnail.tagName === 'VIDEO') thumbnail.preload = 'metadata';
      button.append(thumbnail);
      if (data.type === 'video') button.append(el('span', 'thumbnail-label', index === 0 ? 'Main video' : 'Video'));
      button.addEventListener('click', () => select(index));
      navigation.append(button);
    }
    if (project.sketchfab) {
      const viewer = el('iframe', 'sketchfab-viewer');
      viewer.title = `${project.title} — interactive 3D model`;
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
    } else active.append(makeMedia(null, project.title));
    for (const [selector, value] of Object.entries({'.lightbox-category': project.category || (project.sketchfab ? '3D' : ''), '.lightbox-title': project.title, '.lightbox-year': project.year, '.lightbox-description': project.description})) lightbox.querySelector(selector).textContent = value || '';
    const link = lightbox.querySelector('.lightbox-link');
    let externalLink = project.link;
    if (project.sketchfab) {
      const modelUrl = new URL(project.sketchfab);
      modelUrl.pathname = modelUrl.pathname.replace(/\/embed\/?$/, '');
      modelUrl.search = '';
      externalLink = modelUrl.href;
    }
    link.textContent = project.sketchfab ? 'Open on Sketchfab ↗' : 'View project';
    link.classList.toggle('is-visible', Boolean(externalLink));
    if (externalLink) link.href = externalLink;
    else link.removeAttribute('href');
    lightbox.inert = false;
    lightbox.setAttribute('aria-hidden', 'false');
    Object.assign(document.body.style, {position: 'fixed', top: `-${savedScroll}px`, width: '100%', overflow: 'hidden'});
    document.querySelector('main').inert = document.querySelector('header').inert = true;
    lightbox.scrollTop = 0;
    closeButton.focus({preventScroll: true});
    if (/^(still|project)\d+$/.test(project.id)) {
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
    galleries.forEach(gallery => { gallery.lastInView = undefined; });
    opener?.focus({preventScroll: true});
    updateGalleries();
  }
  createGallery('projects', projects);
  createGallery('static-projects', staticProjects);
  createGallery('three-d-projects', threeDProjects.slice(0, 6), true);
  // One physical gesture selects one project. Trackpad inertia belongs to that
  // gesture, rather than selecting more projects on every wheel event.
  let stepBusyUntil = 0;
  let lastWheelAt = -Infinity;
  function pinnedGallery() {
    if (mobileNavigation.matches) return null;
    return galleries.find(({section}) => {
      const start = section.offsetTop;
      const end = start + section.offsetHeight - section.firstElementChild.offsetHeight;
      return scrollY >= start - 2 && scrollY <= end + 2;
    });
  }
  function stepGallery(gallery, direction) {
    const now = performance.now();
    if (now < stepBusyUntil) return;
    const {section, cards} = gallery;
    if (mobileNavigation.matches) {
      gallery.mobileIndex = clamp((gallery.mobileIndex ?? 0) + direction, 0, cards.length - 1);
      stepBusyUntil = now + (reducedMotion.matches ? 100 : 400);
      scheduleUpdate();
      return;
    }
    const range = section.offsetHeight - section.firstElementChild.offsetHeight;
    const current = Math.round(clamp((scrollY - section.offsetTop) / Math.max(1, range) * cards.length - 0.5, 0, cards.length - 1));
    const next = current + direction;
    stepBusyUntil = now + (reducedMotion.matches ? 180 : 700);
    if (next >= 0 && next < cards.length) {
      // The pinned scene stays in place; its renderer animates to this index.
      scrollTo({top: section.offsetTop + (next + 0.5) * range / cards.length, behavior: 'instant'});
    } else {
      const adjacent = galleries[galleries.indexOf(gallery) + direction];
      const destination = adjacent
        ? direction > 0 ? adjacent.section.offsetTop : adjacent.section.offsetTop + adjacent.section.offsetHeight - adjacent.section.firstElementChild.offsetHeight
        : direction > 0 ? section.offsetTop + section.offsetHeight : 0;
      scrollTo({top: destination, behavior: reducedMotion.matches ? 'instant' : 'smooth'});
    }
  }
  window.addEventListener('wheel', event => {
    if (mobileNavigation.matches || modalOpen || event.ctrlKey || !event.deltaY || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    const gallery = pinnedGallery();
    const now = performance.now();
    if (!gallery && now >= stepBusyUntil) return;
    event.preventDefault();
    const newGesture = now - lastWheelAt > 180;
    lastWheelAt = now;
    if (gallery && newGesture) stepGallery(gallery, Math.sign(event.deltaY));
  }, {passive: false});
  let touchGesture = null;
  let suppressClickUntil = 0;
  window.addEventListener('touchstart', event => {
    const stage = event.target.closest('.perspective-stage');
    touchGesture = !modalOpen && event.touches.length === 1
      ? {gallery: mobileNavigation.matches ? galleries.find(gallery => gallery.stage === stage) : pinnedGallery(), x: event.touches[0].clientX, y: event.touches[0].clientY, stepped: false, vertical: false}
      : null;
  }, {passive: true});
  window.addEventListener('touchmove', event => {
    if (!touchGesture?.gallery || modalOpen || event.touches.length !== 1) return;
    const dy = touchGesture.y - event.touches[0].clientY;
    const dx = touchGesture.x - event.touches[0].clientX;
    if (mobileNavigation.matches) {
      if (touchGesture.vertical) return;
      if (!touchGesture.stepped && Math.abs(dy) >= 6 && Math.abs(dy) > Math.abs(dx)) { touchGesture.vertical = true; return; }
      if (!touchGesture.stepped && Math.abs(dx) < 8) return;
    } else if (!touchGesture.stepped && (Math.abs(dy) < 6 || Math.abs(dx) > Math.abs(dy))) return;
    event.preventDefault();
    suppressClickUntil = performance.now() + 500;
    if (!touchGesture.stepped) {
      touchGesture.stepped = true;
      stepGallery(touchGesture.gallery, Math.sign(mobileNavigation.matches ? dx : dy));
    }
  }, {passive: false});
  window.addEventListener('touchend', () => { touchGesture = null; }, {passive: true});
  window.addEventListener('touchcancel', () => { touchGesture = null; }, {passive: true});
  document.addEventListener('click', event => {
    if (performance.now() < suppressClickUntil && event.target.closest('.perspective-card')) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);
  document.addEventListener('keydown', event => {
    if (modalOpen || event.ctrlKey || event.metaKey || event.altKey || event.target.closest('button,a,input,textarea,select,video')) return;
    const direction = ['ArrowDown', 'PageDown', ' '].includes(event.key) ? (event.shiftKey ? -1 : 1)
      : ['ArrowUp', 'PageUp'].includes(event.key) ? -1 : 0;
    const gallery = pinnedGallery();
    if (direction && gallery) { event.preventDefault(); stepGallery(gallery, direction); }
  });
  let queued = false;
  function scheduleUpdate() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(now => { queued = false; updateGalleries(now); });
  }
  window.addEventListener('scroll', scheduleUpdate, {passive: true});
  const invalidateLayout = () => { layoutDirty = true; scheduleUpdate(); };
  mobileNavigation.addEventListener('change', () => {
    stepBusyUntil = 0;
    touchGesture = null;
    galleries.forEach(gallery => { gallery.mobileIndex ??= gallery.target ?? 0; });
    invalidateLayout();
  });
  window.addEventListener('resize', invalidateLayout);
  const layoutObserver = new ResizeObserver(invalidateLayout);
  galleries.forEach(({stage, section}) => { layoutObserver.observe(stage); layoutObserver.observe(section); });
  document.addEventListener('visibilitychange', () => {
    galleries.forEach(gallery => { gallery.lastInView = undefined; });
    if (document.hidden) updateGalleries(); else scheduleUpdate();
  });
  closeButton.addEventListener('click', closeGallery);
  lightbox.addEventListener('click', event => { if (event.target === lightbox) closeGallery(); });
  document.addEventListener('keydown', event => {
    if (!modalOpen) return;
    if (event.key === 'Escape') closeGallery();
    if (event.key === 'Tab') {
      const nodes = [...lightbox.querySelectorAll('button, a[href], video[controls], iframe')].filter(node => node.getClientRects().length);
      if (event.shiftKey && document.activeElement === nodes[0]) { event.preventDefault(); nodes.at(-1).focus(); }
      else if (!event.shiftKey && document.activeElement === nodes.at(-1)) { event.preventDefault(); nodes[0].focus(); }
    }
  });
  updateGalleries();
});
