document.addEventListener('DOMContentLoaded',()=>{
  const projectsGrid = document.getElementById('projects');
  const threeDGrid = document.getElementById('three-d-projects');
  const lightbox = document.getElementById('lightbox');
  const lbMedia = lightbox.querySelector('.lightbox-media');
  const lbCategory = lightbox.querySelector('.lightbox-category');
  const lbTitle = lightbox.querySelector('.lightbox-title');
  const lbYear = lightbox.querySelector('.lightbox-year');
  const lbDescription = lightbox.querySelector('.lightbox-description');
  const lbLink = lightbox.querySelector('.lightbox-link');
  const closeBtn = lightbox.querySelector('.close');
  let previousOverflow = '';
  const mediaExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.mp4', '.webm'];
  const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);
  const resolvedProjects = new Map();

  function testMedia(src, extension){
    return new Promise(resolve=>{
      const media = imageExtensions.has(extension) ? new Image() : document.createElement('video');
      let settled = false;
      const finish = exists=>{
        if(settled) return;
        settled = true;
        resolve(exists);
      };
      media.onload = ()=>finish(true);
      media.onloadedmetadata = ()=>finish(true);
      media.onerror = ()=>finish(false);
      media.src = src;
      if(media.tagName === 'VIDEO') media.load();
    });
  }

  async function resolveMedia(project){
    for(const extension of mediaExtensions){
      const src = `assets/${project.id}${extension}`;
      if(await testMedia(src, extension)){
        return { src, type: imageExtensions.has(extension) ? 'image' : 'video' };
      }
    }
    return null;
  }

  function renderProjects(){
    projectsGrid.innerHTML = projects.map(project=>{
      const resolvedMedia = resolvedProjects.get(project.id);
      const media = resolvedMedia?.type === 'video'
        ? `<video class="project-video" muted playsinline preload="metadata" src="${resolvedMedia.src}"></video>`
        : resolvedMedia
          ? `<img src="${resolvedMedia.src}" alt="${project.title}">`
          : '';
      const category = project.category ? `<span class="visual-category">${project.category}</span>` : '';
      return `<article class="card" data-project-id="${project.id}"><div class="visual media-slot">${media}<div class="visual-title">${project.title}${category}</div></div></article>`;
    }).join('');
    setupProjectInteractions();
  }

  function renderThreeDProjects(){
    threeDGrid.innerHTML = threeDProjects.map(project=>`<article class="card three-d-card" data-three-d-project-id="${project.id}"><div class="visual media-slot three-d-preview"><div class="three-d-badge" aria-hidden="true">3D</div><div class="visual-title">${project.title}<span class="visual-category">${project.category}</span></div></div></article>`).join('');
    threeDGrid.querySelectorAll('.card').forEach(card=>{
      const project = threeDProjects.find(item=>item.id === card.dataset.threeDProjectId);
      card.addEventListener('click',()=>openLightbox(project));
    });
  }

  function setupProjectInteractions(){
    projectsGrid.querySelectorAll('.card').forEach(card=>{
      const project = projects.find(item=>item.id === card.dataset.projectId);
      const video = card.querySelector('video');
      if(video){
        card.addEventListener('mouseenter',()=>video.play().catch(()=>{}));
        card.addEventListener('mouseleave',()=>{ video.pause(); video.currentTime=0; });
      }
      card.addEventListener('click',()=>openLightbox(project));
    });

    const vids = document.querySelectorAll('video.project-video');
    if('IntersectionObserver' in window){
      const obs = new IntersectionObserver(entries=>{
        entries.forEach(entry=>{
          const video = entry.target;
          if(entry.isIntersecting){ video.play().catch(()=>{}); }
          else { video.pause(); }
        });
      },{threshold:0.5});
      vids.forEach(video=>obs.observe(video));
    }
  }

  function openLightbox(project){
    const media = resolvedProjects.get(project.id);
    lbMedia.innerHTML = project.sketchfabUrl
      ? `<iframe title="${project.title}" src="${project.sketchfabUrl}" allow="autoplay; fullscreen; xr-spatial-tracking" allowfullscreen></iframe>`
      : media?.type === 'video'
      ? `<video controls autoplay playsinline src="${media.src}"></video>`
      : media
        ? `<img src="${media.src}" alt="${project.title}">`
        : '';
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
  Promise.all(projects.map(async project=>{
    resolvedProjects.set(project.id, await resolveMedia(project));
  })).then(()=>{
    renderProjects();
    renderThreeDProjects();
  });
  closeBtn.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (e)=>{ if(e.target===lightbox) closeLightbox(); });
  document.addEventListener('keydown',(e)=>{ if(e.key==='Escape' && lightbox.getAttribute('aria-hidden') === 'false') closeLightbox(); });

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
