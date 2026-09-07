// Play a short introduction once, then scrub the remainder with document scroll.
(() => {
  const video = document.getElementById('background-video');
  if (!video) return;
  const INTRO_SECONDS = 3;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const lightbox = document.getElementById('lightbox');
  let duration = 0;
  let introEnd = 0;
  let introDone = reducedMotion.matches || scrollY > 0;
  let playPending = false;
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
    // Locking the body for the viewer temporarily changes document height.
    if (blocked()) { video.pause(); lastTime = 0; return; }
    if (!introDone && scrollY > 0) finishIntro();
    const range = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const progress = Math.min(1, Math.max(0, scrollY / range));
    target = introEnd + progress * (duration - introEnd);
    schedule();
  }
  function finishIntro() {
    introDone = true;
    video.pause();
    position = introEnd;
    lastTime = 0;
  }
  function startIntro() {
    if (introDone || playPending || blocked() || video.readyState < 2) return;
    playPending = true;
    video.play().then(() => {
      playPending = false;
      // A scroll or modal can interrupt the pending autoplay request.
      if (introDone || blocked()) video.pause();
      schedule();
    }).catch(() => {
      playPending = false;
      if (blocked()) return;
      // If autoplay is denied, leave the background ready for scrolling.
      finishIntro();
      updateTarget();
    });
  }
  function render(now) {
    frame = 0;
    if (!duration || blocked()) { lastTime = 0; return; }
    if (!introDone) {
      if (video.currentTime >= introEnd || video.ended) {
        finishIntro();
        updateTarget();
      } else {
        if (video.paused) startIntro();
        schedule();
        return;
      }
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
    introEnd = Math.min(INTRO_SECONDS, duration);
    updateTarget();
  });
  video.addEventListener('loadeddata', schedule);
  video.addEventListener('canplay', schedule);
  video.addEventListener('seeked', schedule);
  video.addEventListener('timeupdate', () => {
    if (!introDone && video.currentTime >= introEnd && duration) {
      finishIntro();
      updateTarget();
    }
  });
  video.addEventListener('error', () => { video.hidden = true; });
  window.addEventListener('scroll', updateTarget, {passive: true});
  window.addEventListener('resize', updateTarget);
  window.addEventListener('pageshow', updateTarget);
  document.addEventListener('visibilitychange', updateTarget);
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches && !introDone) finishIntro();
    updateTarget();
  });
  // Resume after a modal closes even when scroll restoration emits no event.
  if (lightbox) new MutationObserver(updateTarget).observe(lightbox, {attributes: true, attributeFilter: ['aria-hidden']});
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
  video.pause();
  updateTarget();
})();
