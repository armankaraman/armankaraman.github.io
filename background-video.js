// Native document scroll drives the background; only one seek is in flight.
(() => {
  const video = document.getElementById('background-video');
  if (!video) return;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const mobileInput = matchMedia('(max-width: 640px), (pointer: coarse)');
  const iOS = /iP(?:ad|hone|od)/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const lightbox = document.getElementById('lightbox');
  const blocked = () => document.hidden || lightbox?.getAttribute('aria-hidden') === 'false';
  const interval = 1 / 24;
  let duration = 0, target = 0, position = 0, frame = 0, lastTime = 0;
  let lastSeekTime = 0;
  let priming = false, primed = false, generation = 0, retried = false;
  let range = 1;

  function applyMotionPreference() {
    if (reducedMotion.matches) {
      generation++;
      priming = primed = false;
      video.pause();
      video.removeAttribute('src');
      video.preload = 'none';
      video.load();
    } else {
      video.preload = document.readyState === 'complete' ? 'auto' : 'metadata';
      if (!video.getAttribute('src')) video.src = video.dataset.src;
      primeVideo();
    }
    measure();
  }

  function schedule() {
    if (!frame && !blocked()) frame = requestAnimationFrame(render);
  }
  function measure() {
    if (!blocked()) range = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    updateTarget();
  }
  function updateTarget() {
    if (blocked()) {
      video.pause();
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      lastTime = 0;
      return;
    }
    target = reducedMotion.matches ? 0 : Math.min(1, Math.max(0, scrollY / range)) * duration;
    schedule();
  }
  function primeVideo() {
    if (reducedMotion.matches || primed || priming || blocked() || video.readyState < 2) return;
    priming = true;
    const attempt = generation;
    video.play().then(() => {
      if (attempt !== generation) return;
      video.pause();
      priming = false;
      primed = true;
      updateTarget();
    }).catch(() => {
      if (attempt !== generation) return;
      priming = false;
      schedule();
    });
  }
  function render(now) {
    frame = 0;
    if (blocked() || priming) {
      lastTime = 0;
      return;
    }
    if (!duration || video.readyState < 2) return;
    if (video.seeking) return;
    const dt = Math.min(50, lastTime ? now - lastTime : 16.7);
    lastTime = now;
    position += (target - position) * (reducedMotion.matches || mobileInput.matches ? 1 : 1 - Math.exp(-dt / 100));
    if (Math.abs(target - position) < 0.015) position = target;
    // Clamp AFTER rounding: never request a frame beyond the duration.
    const seekTime = Math.min(duration, Math.max(0, Math.round(position / interval) * interval));
    if (Math.abs(video.currentTime - seekTime) >= interval / 2) {
      if (iOS && now - lastSeekTime < interval * 1000) {
        schedule();
        return;
      }
      lastSeekTime = now;
      video.currentTime = seekTime;
      return; // seeked resumes the loop when decoding finishes.
    }
    if (position !== target) schedule();
    else lastTime = 0;
  }
  function metadata() {
    duration = Number.isFinite(video.duration) ? Math.max(0, video.duration - 0.001) : 0;
    position = Math.min(video.currentTime || 0, duration);
    measure();
  }
  video.addEventListener('loadedmetadata', metadata);
  video.addEventListener('durationchange', metadata);
  video.addEventListener('loadeddata', () => { primeVideo(); schedule(); });
  video.addEventListener('canplay', () => { primeVideo(); schedule(); });
  video.addEventListener('seeked', schedule);
  video.addEventListener('progress', schedule);
  video.addEventListener('error', () => {
    // Keep the poster visible; retry a transient network error once.
    if (retried || video.error?.code !== 2) return;
    retried = true;
    generation++;
    priming = primed = false;
    duration = 0;
    setTimeout(() => { video.load(); }, 1000);
  });
  window.addEventListener('scroll', updateTarget, {passive: true});
  window.addEventListener('resize', measure);
  window.addEventListener('pageshow', () => { measure(); primeVideo(); });
  // Keep the first render light: HTML starts with metadata-only preload.
  // Once the rest of the page has loaded, allow the browser to buffer more of the scrub video
  // without restarting the request or resetting currentTime.
  window.addEventListener('load', () => { video.preload = 'auto'; primeVideo(); }, {once: true});
  document.addEventListener('touchstart', primeVideo, {passive: true});
  document.addEventListener('click', primeVideo);
  document.addEventListener('visibilitychange', () => { measure(); primeVideo(); });
  reducedMotion.addEventListener('change', applyMotionPreference);
  if (lightbox) new MutationObserver(() => { measure(); primeVideo(); }).observe(lightbox, {
    attributes: true, attributeFilter: ['aria-hidden']
  });
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(measure).observe(document.documentElement);
  video.muted = video.defaultMuted = video.playsInline = true;
  video.loop = video.autoplay = false;
  // src is in HTML so the browser starts downloading before scripts execute.
  // Do not call load() again here: that cancels the request already in progress.
  if (!reducedMotion.matches && !video.getAttribute('src')) video.src = video.dataset.src;
  if (video.readyState >= 1) metadata();
  if (video.readyState >= 2) primeVideo();
  if (video.error) video.dispatchEvent(new Event('error'));
  applyMotionPreference();
})();
