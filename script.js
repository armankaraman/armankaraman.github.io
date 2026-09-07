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
        window.scrollTo({top: section.offsetTop + ((index + 0.5) / items.length) * range, behavior: reducedMotion.matches ? 'instant' : 'smooth'});
      });
      pagination.append(dot);
      return dot;
    });
    pagination.append(counter);
    section.querySelector('.gallery-footer').append(pagination, el('span', 'gallery-hint', 'Scroll to move →'));
    const cards = items.map(project => {
      const card = el(modelGallery ? 'a' : 'button', 'perspective-card');
      if (modelGallery) {
        const url = new URL(project.sketchfab);
        url.pathname = url.pathname.replace(/\/embed\/?$/, '');
        url.search = '';
        card.href = url.href;
        card.target = '_blank';
        card.rel = 'noopener noreferrer';
      } else card.type = 'button';
      card.setAttribute('aria-label', `Open ${project.title}`);
      const visual = el('div', 'card-preview');
      if (modelGallery && !project.preview) {
        visual.append(el('div', 'media-placeholder', '3D preview unavailable'));
        fetch(`https://sketchfab.com/oembed?url=${encodeURIComponent(card.href)}&format=json`)
          .then(response => { if (!response.ok) throw new Error('Preview unavailable'); return response.json(); })
          .then(data => { if (data.thumbnail_url) visual.replaceChildren(makeMedia(data.thumbnail_url, project.title, true)); }).catch(() => {});
      } else visual.append(makeMedia(modelGallery ? project.preview : project.media, project.title, true));
      const copy = el('div', 'card-copy');
      copy.append(el('h3', '', project.title), el('p', 'card-category', project.category), el('p', 'card-description', project.description), el('span', 'project-open', 'View project ↗'));
      card.append(visual, copy);
      if (modelGallery) {
        copy.querySelector('.card-category').textContent = '3D';
        copy.querySelector('.project-open').textContent = 'Sketchfab ↗';
      } else card.addEventListener('click', () => openGallery(project, card));
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
      const target = clamp((window.scrollY - top) / Math.max(1, range) * cards.length - 0.5, 0, cards.length - 1);
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
        card.style.transform = `translate3d(${x}px,0,${depth}px) rotateY(${angle}deg)`;
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
    if (items.length) {
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
    for (const [selector, value] of Object.entries({'.lightbox-category': project.category, '.lightbox-title': project.title, '.lightbox-year': project.year, '.lightbox-description': project.description})) lightbox.querySelector(selector).textContent = value || '';
    const link = lightbox.querySelector('.lightbox-link');
    link.classList.toggle('is-visible', Boolean(project.link));
    if (project.link) link.href = project.link;
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
      const nodes = [...lightbox.querySelectorAll('button, a[href], video[controls]')].filter(node => node.getClientRects().length);
      if (event.shiftKey && document.activeElement === nodes[0]) { event.preventDefault(); nodes.at(-1).focus(); }
      else if (!event.shiftKey && document.activeElement === nodes.at(-1)) { event.preventDefault(); nodes[0].focus(); }
    }
  });
  updateGalleries();
});
