document.addEventListener('DOMContentLoaded',()=>{
  const projectsGrid = document.getElementById('projects');
  const lightbox = document.getElementById('lightbox');
  const lbMedia = lightbox.querySelector('.lightbox-media');
  const lbCategory = lightbox.querySelector('.lightbox-category');
  const lbTitle = lightbox.querySelector('.lightbox-title');
  const lbYear = lightbox.querySelector('.lightbox-year');
  const lbDescription = lightbox.querySelector('.lightbox-description');
  const lbLink = lightbox.querySelector('.lightbox-link');
  const closeBtn = lightbox.querySelector('.close');
  let previousOverflow = '';

  function renderProjects(){
    projectsGrid.innerHTML = projects.map(project=>{
      const media = project.type === 'video'
        ? `<video class="project-video" muted playsinline preload="metadata"><source src="${project.media}" type="video/mp4"></video>`
        : `<img src="${project.media}" alt="${project.title}">`;
      return `<article class="card" data-project-id="${project.id}"><div class="visual media-slot">${media}<div class="visual-title">${project.title}</div></div></article>`;
    }).join('');
  }

  function openLightbox(project){
    lbMedia.innerHTML = project.type === 'video'
      ? `<video controls autoplay playsinline><source src="${project.media}" type="video/mp4"></video>`
      : `<img src="${project.media}" alt="${project.title}">`;
    lbCategory.textContent = project.category;
    lbTitle.textContent = project.title;
    lbYear.textContent = project.year;
    lbDescription.textContent = project.description;
    lbLink.href = project.link || '#';
    lbLink.classList.toggle('is-visible', Boolean(project.link));
    previousOverflow = document.body.style.overflow;
    lightbox.setAttribute('aria-hidden','false');
    document.body.style.overflow='hidden';
  }

  function closeLightbox(){
    lightbox.setAttribute('aria-hidden','true');
    lbMedia.innerHTML='';
    document.body.style.overflow=previousOverflow;
  }
  renderProjects();
  projectsGrid.querySelectorAll('.card').forEach(card=>{
    const project = projects.find(item=>item.id === card.dataset.projectId);
    const video = card.querySelector('video');
    if(video){
      card.addEventListener('mouseenter',()=>video.play().catch(()=>{}));
      card.addEventListener('mouseleave',()=>{ video.pause(); video.currentTime=0; });
    }
    card.addEventListener('click',()=>openLightbox(project));
  });
  closeBtn.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (e)=>{ if(e.target===lightbox) closeLightbox(); });
  document.addEventListener('keydown',(e)=>{ if(e.key==='Escape' && lightbox.getAttribute('aria-hidden') === 'false') closeLightbox(); });

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
