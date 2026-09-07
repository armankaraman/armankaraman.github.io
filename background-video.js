// Scrub the background video with document scroll. No autoplay.
(() => {
  const video = document.getElementById('background-video');
  if (!video) return;

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const lightbox = document.getElementById('lightbox');
  let duration = 0;
  let target = 0;
  let position = 0;
  let frame = 0;
  let lastTime = 0;

  const modalOpen = () => lightbox?.getAttribute('aria-hidden') === 'false';
  const blocked = () => document.hidden || modalOpen();

  function schedule() {
    if (!frame && !blocked()) frame = requestAnimationFrame(render);
  }

  function updateTarget() {
    if (blocked()) {
      video.pause();
      lastTime = 0;
      return;
    }

    const range = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const progress = Math.min(1, Math.max(0, scrollY / range));
    target = progress * duration;
    schedule();
  }

  function render(now) {
    frame = 0;
    if (!duration || blocked()) {
      lastTime = 0;
      return;
    }

    const dt = Math.min(50, lastTime ? now - lastTime : 16.7);
    lastTime = now;
    position += (target - position) * (reducedMotion.matches ? 1 : 1 - Math.exp(-dt / 140));

    if (Math.abs(target - position) < 0.015) position = target;

    if (!video.seeking && Math.abs(video.currentTime - position) > 0.001) {
      video.currentTime = position;
    }

    if (position !== target) schedule();
    else lastTime = 0;
  }

  video.addEventListener('loadedmetadata', () => {
    // Seek just inside the end so the final frame remains visible.
    duration = Number.isFinite(video.duration) ? Math.max(0, video.duration - 0.001) : 0;
    position = Math.min(video.currentTime || 0, duration);
    updateTarget();
  });

  video.addEventListener('loadeddata', schedule);
  video.addEventListener('canplay', schedule);
  video.addEventListener('seeked', schedule);
  video.addEventListener('error', () => { video.hidden = true; });

  window.addEventListener('scroll', updateTarget, {passive: true});
  window.addEventListener('resize', updateTarget);
  window.addEventListener('pageshow', updateTarget);
  document.addEventListener('visibilitychange', updateTarget);
  reducedMotion.addEventListener('change', updateTarget);

  if (lightbox) {
    new MutationObserver(updateTarget).observe(lightbox, {
      attributes: true,
      attributeFilter: ['aria-hidden']
    });
  }

  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(updateTarget).observe(document.documentElement);
  }

  // Preserve the original buffering route for servers without HTTP Range support.
  fetch(video.dataset.src)
    .then(response => {
      if (!response.ok) throw new Error('Background video unavailable');
      return response.blob();
    })
    .then(blob => { video.src = URL.createObjectURL(blob); })
    .catch(() => { video.src = video.dataset.src; });

  video.muted = true;
  video.playsInline = true;
  video.loop = false;
  video.autoplay = false;
  video.pause();
  updateTarget();
})();
