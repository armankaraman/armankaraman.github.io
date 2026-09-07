document.addEventListener('DOMContentLoaded', () => {
  const lightbox = document.getElementById('lightbox');
  const lbMedia = lightbox.querySelector('.lightbox-media');
  const closeButton = lightbox.querySelector('.close');
  const galleries = [];
  let savedScroll, opener, bodyStyle, modalOpen = false;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    node.className = cls;
    if (text) node.textContent = text;
    return node;
  };
  const mediaData = item => typeof item === 'string' ? {src: item, type: /\.(mp4|webm)(?:[?#]|$)/i.test(item) ? 'video' : 'image'} : item;
  function makeMedia(item, title, preview = false) {
    const data = mediaData(item);
    if (!data?.src) return el('div', 'media-placeholder', 'Preview placeholder — image to be added');
    const video = data.type === 'video';
    const node = el(video ? 'video' : 'img', '');
    if (video) {
      node.muted = node.defaultMuted = node.playsInline = node.loop = true;
      node.controls = !preview;
      node.preload = preview ? 'none' : 'metadata';
      if (data.poster) node.poster = data.poster;
    } else {
      node.alt = data.alt || title;
      node.loading = 'lazy';
    }
    node.src = data.src;
    node.addEventListener('error', () => node.replaceWith(el('div', 'media-placeholder', 'Media unavailable — file to be added')), {once: true});
    return node;
  }
  function createGallery(id, items, modelGallery = false) {
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
        const range = section.offsetHeight - section.querySelector('.gallery-sticky').offsetHeight;
        window.scrollTo({top: section.offsetTop + ((index + 0.5) / items.length) * range, behavior: 'instant'});
      });
      pagination.append(dot);
      return dot;
    });
    pagination.append(counter);
    section.querySelector('.gallery-footer').append(pagination, el('span', 'gallery-hint', 'Scroll to move →'));
    const cards = items.map(project => {
      const card = el('button', 'perspective-card');
      card.type = 'button';
      card.setAttribute('aria-label', `Open ${project.title}`);
      const visual = el('div', 'card-preview');
      if (modelGallery && !project.preview) {
        visual.append(el('div', 'media-placeholder', '3D preview unavailable'));
        fetch(`https://sketchfab.com/oembed?url=${encodeURIComponent(project.sketchfab)}&format=json`)
          .then(response => { if (!response.ok) throw new Error('Preview unavailable'); return response.json(); })
          .then(data => { if (data.thumbnail_url) visual.replaceChildren(makeMedia(data.thumbnail_url, project.title, true)); }).catch(() => {});
      } else visual.append(makeMedia(modelGallery ? project.preview : project.media, project.title, true));
      const copy = el('div', 'card-copy');
      copy.append(el('h3', '', project.title), el('p', 'card-category', project.category), el('p', 'card-description', project.description), el('span', 'project-open', 'View project ↗'));
      card.append(visual, copy);
      if (modelGallery) {
        copy.querySelector('.card-category').textContent = '3D';
        copy.querySelector('.project-open').textContent = 'View model';
      }
      card.addEventListener('click', () => openGallery(project, card));
      stage.append(card);
      return card;
    });
    galleries.push({section, stage, cards, dots, counter, videos: cards.map(card => card.querySelector('video'))});
  }
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let lastFrame = 0;
  function updateGalleries(now = performance.now()) {
    if (modalOpen) return;
    const elapsed = Math.min(50, lastFrame ? now - lastFrame : 16.7);
    lastFrame = now;
    const blend = 1 - Math.exp(-elapsed / 150);
    let moving = false;
    // Read geometry for every section before writing transforms: no layout thrashing.
    const layouts = galleries.map(({section, stage, cards}) => ({
      top: section.offsetTop,
      range: section.offsetHeight - section.firstElementChild.offsetHeight,
      rect: stage.getBoundingClientRect(),
      width: cards[0].offsetWidth,
      stageWidth: stage.clientWidth
    }));
    galleries.forEach((gallery, galleryIndex) => {
      const {section, cards, dots, counter, videos} = gallery;
      const {top, range, rect, width, stageWidth} = layouts[galleryIndex];
      // Half a step at either end holds the first and last projects in the centre.
      const target = Math.round(clamp((window.scrollY - top) / Math.max(1, range) * cards.length - 0.5, 0, cards.length - 1));
      gallery.target = target;
      const outside = rect.bottom <= 0 || rect.top >= innerHeight;
      if (gallery.progress === undefined || reducedMotion.matches || outside) gallery.progress = target;
      else gallery.progress += (target - gallery.progress) * blend;
      if (Math.abs(target - gallery.progress) < 0.0005) gallery.progress = target;
      else moving = true;
      const progress = gallery.progress;
      const active = Math.round(progress);
      const inView = rect.bottom > 0 && rect.top < innerHeight && !document.hidden;
      const gap = innerWidth <= 640 ? 12 : 26;
      cards.forEach((card, index) => {
        const distance = index - progress;
        const x = distance * (width + gap);
        const depth = -100 * (Math.sqrt(distance * distance + 0.16) - 0.4);
        const angle = 28 * Math.tanh(distance * 1.35);
        const scale = 0.86 + 0.24 * Math.exp(-3 * distance * distance);
        card.style.transform = `translate3d(${x}px,0,${depth}px) rotateY(${angle}deg) scale(${scale})`;
        card.style.zIndex = String(10 - Math.round(Math.abs(distance)));
        card.classList.toggle('is-active', index === active);
        const visible = Math.abs(x) < stageWidth / 2 + width;
        card.style.visibility = visible ? 'visible' : 'hidden';
        card.tabIndex = visible ? 0 : -1;
        const video = videos[index];
        if (video) {
          if (inView && visible && video.dataset.playing !== 'true') {
            video.dataset.playing = 'true';
            video.play().catch(() => { video.dataset.playing = 'false'; });
          } else if (!inView || !visible) {
            video.pause();
            video.dataset.playing = 'false';
          }
        }
        dots[index].setAttribute('aria-current', index === active ? 'true' : 'false');
      });
      section.dataset.activeIndex = active;
      counter.textContent = `${String(active + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`;
    });
    if (moving) scheduleUpdate();
    else lastFrame = 0;
  }
  function openGallery(project, trigger) {
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
      active.querySelectorAll('video').forEach(video => video.pause());
      active.replaceChildren(makeMedia(items[index], project.title));
      active.querySelector('video')?.play().catch(() => {});
      [...navigation.children].forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
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
        items.forEach((item, index) => {
          const data = mediaData(item);
          const button = el('button', 'lightbox-gallery-item');
          button.type = 'button';
          button.setAttribute('aria-label', `${project.title}, media ${index + 1}`);
          const thumbnail = makeMedia(data, project.title, true);
          if (data.type === 'video') thumbnail.preload = 'metadata';
          button.append(thumbnail);
          if (data.type === 'video') button.append(el('span', 'thumbnail-label', index === 0 ? 'Main video' : 'Video'));
          button.addEventListener('click', () => select(index));
          navigation.append(button);
        });
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
  }
  function closeGallery() {
    if (!modalOpen) return;
    lbMedia.querySelectorAll('video').forEach(video => video.pause());
    lbMedia.replaceChildren();
    lightbox.setAttribute('aria-hidden', 'true');
    lightbox.inert = true;
    if (bodyStyle === null) document.body.removeAttribute('style');
    else document.body.setAttribute('style', bodyStyle);
    document.querySelector('main').inert = document.querySelector('header').inert = false;
    window.scrollTo({top: savedScroll, behavior: 'instant'});
    modalOpen = false;
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
    if (modalOpen || event.ctrlKey || !event.deltaY || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
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
    touchGesture = !modalOpen && event.touches.length === 1
      ? {gallery: pinnedGallery(), x: event.touches[0].clientX, y: event.touches[0].clientY, stepped: false}
      : null;
  }, {passive: true});
  window.addEventListener('touchmove', event => {
    if (!touchGesture?.gallery || modalOpen || event.touches.length !== 1) return;
    const dy = touchGesture.y - event.touches[0].clientY;
    const dx = touchGesture.x - event.touches[0].clientX;
    if (!touchGesture.stepped && (Math.abs(dy) < 6 || Math.abs(dx) > Math.abs(dy))) return;
    event.preventDefault();
    suppressClickUntil = performance.now() + 500;
    if (!touchGesture.stepped) {
      touchGesture.stepped = true;
      stepGallery(touchGesture.gallery, Math.sign(dy));
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
  window.addEventListener('resize', scheduleUpdate);
  document.addEventListener('visibilitychange', scheduleUpdate);
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
