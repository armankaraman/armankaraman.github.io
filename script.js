document.addEventListener('DOMContentLoaded',()=>{
  const projects = document.getElementById('projects');
  const lightbox = document.getElementById('lightbox');
  const lbContent = lightbox.querySelector('.lightbox-content');
  const closeBtn = lightbox.querySelector('.close');

  // Handle visual-first cards: if a video/img exists inside, use it; otherwise clone the visual container.
  document.querySelectorAll('.card').forEach(card=>{
    const video = card.querySelector('video');
    const img = card.querySelector('img');
    // hover behavior for existing videos
    if(video){
      card.addEventListener('mouseenter',()=>{ video.play().catch(()=>{}); });
      card.addEventListener('mouseleave',()=>{ video.pause(); video.currentTime=0; });
    }

    card.addEventListener('click', ()=>{
      const title = card.dataset.title || '';
      if(video){
        openLightbox(video.cloneNode(true), title);
      } else if(img){
        openLightbox(img.cloneNode(true), title);
      } else {
        // clone the visual block for a clean lightbox view
        const visual = card.querySelector('.visual');
        if(visual){
          openLightbox(visual.cloneNode(true), title);
        }
      }
    });
  });

  function openLightbox(node, title){
    // clear
    lbContent.innerHTML = '';
    // prepare node
    node.removeAttribute('width'); node.removeAttribute('height');
    if(node.tagName.toLowerCase()==='video'){
      node.controls = true; node.autoplay = true; node.muted = false; node.loop = false; node.style.maxHeight = '80vh';
    }
    lbContent.appendChild(node);
    lightbox.setAttribute('aria-hidden','false');
    document.body.style.overflow='hidden';
  }

  function closeLightbox(){
    lightbox.setAttribute('aria-hidden','true');
    lbContent.innerHTML='';
    document.body.style.overflow='auto';
  }
  closeBtn.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (e)=>{ if(e.target===lightbox) closeLightbox(); });
  document.addEventListener('keydown',(e)=>{ if(e.key==='Escape') closeLightbox(); });

  // Lazy-play videos when visible on small screens
  const vids = document.querySelectorAll('video.project-video');
  if('IntersectionObserver' in window){
    const obs = new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        const v = entry.target;
        if(entry.isIntersecting){ v.play().catch(()=>{}); }
        else { v.pause(); }
      });
    },{threshold:0.5});
    vids.forEach(v=>obs.observe(v));
  }
  // --- Scroll-scrub for hero video ---
  const hero = document.querySelector('.hero-full');
  const heroVideo = document.getElementById('heroVideo');
  if(hero && heroVideo){
    // ensure video doesn't autoplay
    heroVideo.pause();
    let duration = 0;
    let targetTime = 0;
    let rafId = null;

    function onMetadata(){
      duration = heroVideo.duration || 0;
      updateTarget();
    }
    heroVideo.addEventListener('loadedmetadata', onMetadata);
    // if metadata already loaded
    if(heroVideo.readyState >= 1) onMetadata();

    function getScrollProgress(){
      const scrollRange = document.documentElement.scrollHeight - window.innerHeight;
      const scrollY = window.scrollY || window.pageYOffset;
      return Math.min(Math.max(scrollY / Math.max(1, scrollRange), 0), 1);
    }

    function updateTarget(){
      if(!duration || duration === Infinity || isNaN(duration)) return;
      const p = getScrollProgress();
      targetTime = p * duration;
      // start RAF loop
      if(rafId === null) rafLoop();
    }

    function rafLoop(){
      rafId = requestAnimationFrame(()=>{
        const cur = heroVideo.currentTime || 0;
        const diff = targetTime - cur;
        // interpolate for smoothness
        const step = diff * 0.2;
        if(Math.abs(diff) > 0.02){
          try{ heroVideo.currentTime = cur + step; }catch(e){}
          rafLoop();
        } else {
          try{ heroVideo.currentTime = targetTime; }catch(e){}
          rafId = null;
        }
      });
    }

    // update on scroll/resize
    window.addEventListener('scroll', updateTarget, {passive:true});
    window.addEventListener('resize', updateTarget);
    // ensure initial update
    setTimeout(updateTarget, 100);
  }
});
