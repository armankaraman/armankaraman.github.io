// The background follows document scroll; it never plays on its own.
(() => {
  const video = document.getElementById('background-video');
  if (!video) return;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let duration = 0;
  let target = 0;
  let position = 0;
  let frame = 0;
  let lastTime = 0;
  const modalOpen = () => document.getElementById('lightbox')?.getAttribute('aria-hidden') === 'false';

  function schedule() {
    if (!frame && !document.hidden && !modalOpen()) frame = requestAnimationFrame(render);
  }
  function updateTarget() {
    // Locking the body for the viewer temporarily changes document height.
    if (modalOpen()) return;
    const range = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    target = Math.min(1, Math.max(0, scrollY / range)) * duration;
    schedule();
  }
  function render(now) {
    frame = 0;
    if (!duration || document.hidden || modalOpen()) { lastTime = 0; return; }
    const dt = Math.min(50, lastTime ? now - lastTime : 16.7);
    lastTime = now;
    position += (target - position) * (reducedMotion.matches ? 1 : 1 - Math.exp(-dt / 140));
    if (Math.abs(target - position) < 0.015) position = target;
    if (!video.seeking && Math.abs(video.currentTime - position) > 0.015) {
      video.currentTime = position;
    }
    if (position !== target) schedule();
    else lastTime = 0;
  }
  video.addEventListener('loadedmetadata', () => {
    duration = Number.isFinite(video.duration) ? Math.max(0, video.duration - 0.04) : 0;
    updateTarget();
  });
  video.addEventListener('loadeddata', schedule);
  video.addEventListener('seeked', schedule);
  video.addEventListener('error', () => { video.hidden = true; });
  window.addEventListener('scroll', updateTarget, {passive: true});
  window.addEventListener('resize', updateTarget);
  window.addEventListener('pageshow', updateTarget);
  document.addEventListener('visibilitychange', updateTarget);
  // Resume after a modal closes even when scroll restoration emits no event.
  new MutationObserver(updateTarget).observe(document.getElementById('lightbox'), {attributes: true, attributeFilter: ['aria-hidden']});
  // Buffer this small background clip once. Blob URLs support arbitrary seeking
  // even on simple preview servers that do not implement HTTP Range requests.
  fetch(video.dataset.src)
    .then(response => {
      if (!response.ok) throw new Error('Background video unavailable');
      return response.blob();
    })
    .then(blob => { video.src = URL.createObjectURL(blob); })
    .catch(() => { video.src = video.dataset.src; });
  video.pause();
  updateTarget();
})();
