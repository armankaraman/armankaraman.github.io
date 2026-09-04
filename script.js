document.addEventListener('DOMContentLoaded',()=>{
  const projectsGrid = document.getElementById('projects');
  const threeDGrid = document.getElementById('three-d-projects');
  const motionGrid = document.querySelector('#motion .grid');
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
  const resolvedGalleries = new Map();
  const resolvedMotionProjects = new Map();

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
      setTimeout(()=>finish(false),1500);
      media.src = src;
      if(media.tagName === 'VIDEO') media.load();
    });
  }

  async function resolveMedia(project){
    if(project.media){
      const extension = project.media.slice(project.media.lastIndexOf('.')).toLowerCase();
      if(mediaExtensions.includes(extension)){
        return {src:project.media,type:imageExtensions.has(extension) ? 'image' : 'video'};
      }
      return null;
    }
    const candidates = await Promise.all(mediaExtensions.map(async extension=>({
      extension,
      src: `assets/${project.id}${extension}`,
      exists: await testMedia(`assets/${project.id}${extension}`, extension)
    })));
    const match = candidates.find(candidate=>candidate.exists);
    return match ? {src:match.src,type:imageExtensions.has(match.extension) ? 'image' : 'video'} : null;
  }

  async function resolveGallery(project){
    if(!Array.isArray(project.gallery)) return [];
    const resolved = project.gallery.map(src=>{
      const fileName = src.split('/').pop().toLowerCase();
      const extension = src.slice(src.lastIndexOf('.')).toLowerCase();
      if(!fileName.startsWith(`${project.id}-`) || !mediaExtensions.includes(extension)) return null;
      return {src, type:imageExtensions.has(extension) ? 'image' : 'video'};
    });
    return resolved.filter(Boolean);
  }

  function renderProjects(){
    projectsGrid.innerHTML = projects.map(project=>{
      const resolvedMedia = resolvedProjects.get(project.id);
      const media = resolvedMedia?.type === 'video'
        ? `<video class="project-video" muted autoplay playsinline loop preload="metadata" src="${resolvedMedia.src}"></video>`
        : resolvedMedia
          ? `<img src="${resolvedMedia.src}" alt="${project.title}" loading="lazy">`
          : '';
      const category = project.category ? `<span class="visual-category">${project.category}</span>` : '';
      return `<article class="card" data-project-id="${project.id}"><div class="visual media-slot">${media}<div class="visual-title">${project.title}${category}</div></div></article>`;
    }).join('');
    setupProjectInteractions();
  }

  function renderThreeDProjects(){
    threeDGrid.innerHTML = threeDProjects.slice(0,6).map((project,index)=>`<article class="card three-d-card" data-three-d-project-index="${index}"><div class="visual media-slot three-d-preview" data-sketchfab-preview="${index}"><div class="three-d-badge" aria-hidden="true">3D</div><div class="visual-title">${project.title}<span class="visual-category">3D</span></div></div></article>`).join('');
    threeDGrid.querySelectorAll('.card').forEach(card=>{
      const project = threeDProjects[card.dataset.threeDProjectIndex];
      card.addEventListener('click',()=>openLightbox(project));
    });
    threeDProjects.slice(0,6).forEach((project,index)=>loadSketchfabPreview(project,index));
  }

  async function loadSketchfabPreview(project,index){
    const preview = threeDGrid.querySelector(`[data-sketchfab-preview="${index}"]`);
    if(!preview || !project.sketchfab) return;
    try{
      const response = await fetch(`https://sketchfab.com/oembed?url=${encodeURIComponent(project.sketchfab)}&format=json`);
      if(!response.ok) return;
      const data = await response.json();
      if(data.thumbnail_url){
        const image = document.createElement('img');
        image.src = data.thumbnail_url;
        image.alt = project.title;
        image.loading = 'lazy';
        preview.prepend(image);
      }
    }catch(error){
      // The styled preview remains available when the external thumbnail is unavailable.
    }
  }

  function renderMotionProjects(){
    if(!motionGrid) return;
    motionGrid.innerHTML = motionProjects.map((project,index)=>{
      const resolvedMedia = resolvedMotionProjects.get(index);
      const media = resolvedMedia?.type === 'video'
        ? `<video class="motion-project-video" muted playsinline loop preload="metadata" data-autoplay src="${resolvedMedia.src}"></video>`
        : resolvedMedia
          ? `<img src="${resolvedMedia.src}" alt="${project.title}" loading="lazy">`
          : '';
      return `<article class="card" data-motion-project-index="${index}"><div class="visual media-slot">${media}<div class="visual-title">${project.title}</div></div></article>`;
    }).join('');
    motionGrid.querySelectorAll('.card').forEach(card=>{
      const project = motionProjects[card.dataset.motionProjectIndex];
      card.addEventListener('click',()=>openLightbox(project));
    });
    setupAutoplayVideos(motionGrid);
  }

  function setupProjectInteractions(){
    projectsGrid.querySelectorAll('.card').forEach(card=>{
      const project = projects.find(item=>item.id === card.dataset.projectId);
      const video = card.querySelector('.project-video');
      if(video){
        video.muted = true;
        video.play().catch(()=>{});
      }
      card.addEventListener('click',()=>openLightbox(project));
    });
  }

  function setupAutoplayVideos(container){
    const videos = container.querySelectorAll('video[data-autoplay]');
    if(!('IntersectionObserver' in window)){
      videos.forEach(video=>video.play().catch(()=>{}));
      return;
    }
    const observer = new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        const video = entry.target;
        if(entry.isIntersecting){
          video.play().catch(()=>{});
        } else {
          video.pause();
        }
      });
    },{threshold:0.25});
    videos.forEach(video=>observer.observe(video));
  }

  function mediaMarkup(media, title, controls = false, thumbnail = false){
    if(media.type === 'video'){
      return `<video ${controls ? 'controls ' : ''}muted playsinline preload="${thumbnail ? 'metadata' : 'metadata'}" src="${media.src}"></video>`;
    }
    return `<img src="${media.src}" alt="${title}" loading="lazy">`;
  }

  function showVideoFirstFrame(video){
    video.addEventListener('loadedmetadata',()=>{
      try{ video.currentTime = 0; }catch(error){}
    },{once:true});
    video.addEventListener('loadeddata',()=>video.pause(),{once:true});
    video.load();
  }

  function renderActiveMedia(media, title){
    const activeMedia = lbMedia.querySelector('.lightbox-active-media');
    if(!activeMedia) return;
    activeMedia.innerHTML = mediaMarkup(media, title, media.type === 'video');
    const video = activeMedia.querySelector('video');
    if(video) showVideoFirstFrame(video);
  }

  function bindGalleryPreviews(project, mediaItems){
    lbMedia.querySelectorAll('.lightbox-gallery-item').forEach((item,index)=>{
      const video = item.querySelector('video');
      if(video){
        showVideoFirstFrame(video);
      }
      item.addEventListener('click',()=>{
        const previousVideo = lbMedia.querySelector('.lightbox-active-media video');
        if(previousVideo) previousVideo.pause();
        renderActiveMedia(mediaItems[index], project.title);
      });
    });
  }

  async function openLightbox(project){
    const media = resolvedProjects.get(project.id);
    if(project.sketchfab){
      lbMedia.innerHTML = `<iframe title="${project.title}" src="${project.sketchfab}" allow="autoplay; fullscreen; xr-spatial-tracking" allowfullscreen></iframe>`;
    } else if(media){
      const gallery = resolvedGalleries.get(project.id) || [];
      const mediaItems = gallery.filter((item,index,items)=>item.src !== media.src && items.findIndex(candidate=>candidate.src === item.src) === index);
      const galleryMarkup = mediaItems.length
        ? `<div class="lightbox-gallery">${mediaItems.map(item=>`<div class="lightbox-gallery-item">${mediaMarkup(item, project.title, false, true)}</div>`).join('')}</div>`
        : '';
      lbMedia.innerHTML = `<div class="lightbox-active-media">${mediaMarkup(media, project.title, media.type === 'video')}</div>${galleryMarkup}`;
      if(mediaItems.length) bindGalleryPreviews(project, mediaItems);
      const activeVideo = lbMedia.querySelector('.lightbox-active-media video');
      if(activeVideo) showVideoFirstFrame(activeVideo);
    } else if(resolvedMotionProjects.get(project._motionIndex)){
      const motionMedia = resolvedMotionProjects.get(project._motionIndex);
      lbMedia.innerHTML = mediaMarkup(motionMedia, project.title, motionMedia.type === 'video');
    } else {
      lbMedia.innerHTML = '';
    }
    lbCategory.textContent = project.category || '';
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
    lbMedia.querySelectorAll('video').forEach(video=>video.pause());
    lbMedia.innerHTML='';
    document.body.style.overflow=previousOverflow;
  }
  async function initializePortfolio(){
    threeDProjects.forEach((project,index)=>project.id = `3d${index + 1}`);
    motionProjects.forEach((project,index)=>project._motionIndex = index);
    await Promise.all(projects.map(async project=>{
      resolvedProjects.set(project.id, await resolveMedia(project));
      resolvedGalleries.set(project.id, await resolveGallery(project));
    }));
    await Promise.all(motionProjects.map(async (project,index)=>{
      const extension = project.media.slice(project.media.lastIndexOf('.')).toLowerCase();
      if(![...mediaExtensions].includes(extension)) return;
      resolvedMotionProjects.set(index,{src:project.media,type:imageExtensions.has(extension) ? 'image' : 'video'});
    }));
    renderProjects();
    renderThreeDProjects();
    renderMotionProjects();
  }
  initializePortfolio();
  closeBtn.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (e)=>{ if(e.target===lightbox) closeLightbox(); });
  document.addEventListener('keydown',(e)=>{ if(e.key==='Escape' && lightbox.getAttribute('aria-hidden') === 'false') closeLightbox(); });

  // --- Background hero video controller ---
  const hero = document.querySelector('.hero-full');
  const heroVideo = document.getElementById('heroVideo');
  if(hero && heroVideo){
    const heroWrap = hero.querySelector('.hero-video-wrap');
    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches ||
      window.matchMedia('(max-width: 640px)').matches ||
      navigator.maxTouchPoints > 0;
    heroVideo.muted = true;
    heroVideo.playsInline = true;
    heroVideo.autoplay = false;
    heroVideo.loop = false;
    heroVideo.preload = 'auto';
    heroVideo.setAttribute('muted', '');
    heroVideo.setAttribute('playsinline', '');
    heroVideo.setAttribute('webkit-playsinline', '');
    heroVideo.removeAttribute('autoplay');
    heroVideo.removeAttribute('loop');
    let hasValidFrame = false;
    let duration = 0;
    let targetProgress = getScrollProgress();
    let easedProgress = targetProgress;
    let lastAppliedTime = -Infinity;
    let lastSeekAt = -Infinity;
    let scrubReady = false;
    let isWarmingUp = false;
    let touchVideoUnlocked = false;
    const smoothingFactor = 0.1;
    const minimumSeekInterval = isTouchDevice ? 100 : 80;

    function showValidFrame(){
      hasValidFrame = true;
      heroWrap.classList.add('video-ready');
    }

    heroVideo.addEventListener('error', ()=>{
      if(!hasValidFrame) heroWrap.classList.remove('video-ready');
    });

    function getScrollProgress(){
      const scrollRange = document.documentElement.scrollHeight - window.innerHeight;
      const scrollY = window.scrollY || window.pageYOffset;
      return Math.min(Math.max(scrollY / Math.max(1, scrollRange), 0), 1);
    }

    function updateTargetProgress(){
      targetProgress = getScrollProgress();
    }

    function warmUpTouchVideo(forceRetry = false){
      if(!isTouchDevice || touchVideoUnlocked || (forceRetry !== true && isWarmingUp) || !heroVideo.paused) return;
      isWarmingUp = true;
      heroVideo.muted = true;
      const playAttempt = heroVideo.play();
      if(playAttempt && typeof playAttempt.catch === 'function'){
        playAttempt.catch(()=>{ isWarmingUp = false; });
      }
    }

    function unlockOnFirstTouch(){
      warmUpTouchVideo(true);
    }

    function onMetadata(){
      duration = Number.isFinite(heroVideo.duration) ? heroVideo.duration : 0;
      updateTargetProgress();
      easedProgress = duration ? (heroVideo.currentTime || 0) / duration : targetProgress;
      warmUpTouchVideo();
    }

    function onLoadedData(){
      scrubReady = true;
      showValidFrame();
      warmUpTouchVideo();
    }

    function onPlaying(){
      if(isWarmingUp){
        heroVideo.pause();
        isWarmingUp = false;
        touchVideoUnlocked = true;
        scrubReady = true;
        showValidFrame();
        document.removeEventListener('touchstart', unlockOnFirstTouch);
      }
    }

    function scrubLoop(now){
      if(scrubReady && duration && heroVideo.paused){
        const difference = targetProgress - easedProgress;
        const progressThreshold = Math.max(0.001, 0.05 / duration);

        if(Math.abs(difference) > progressThreshold){
          easedProgress += difference * smoothingFactor;
          const nextTime = easedProgress * duration;
          const seekThreshold = Math.max(0.05, duration / 600);
          const seekIsDue = now - lastSeekAt >= minimumSeekInterval;
          const seekIsUseful = Math.abs(nextTime - lastAppliedTime) >= seekThreshold;

          if(seekIsDue && seekIsUseful && !heroVideo.seeking){
            try{
              heroVideo.currentTime = Math.min(duration, Math.max(0, nextTime));
              lastAppliedTime = nextTime;
              lastSeekAt = now;
            }catch(e){
              if(!hasValidFrame) heroWrap.classList.remove('video-ready');
            }
          }
        }
      }
      requestAnimationFrame(scrubLoop);
    }

    heroVideo.addEventListener('loadedmetadata', onMetadata);
    heroVideo.addEventListener('loadeddata', onLoadedData);
    heroVideo.addEventListener('canplay', warmUpTouchVideo);
    heroVideo.addEventListener('playing', onPlaying);
    heroVideo.addEventListener('seeked', showValidFrame);
    if(isTouchDevice) document.addEventListener('touchstart', unlockOnFirstTouch, {passive:true});
    window.addEventListener('scroll', updateTargetProgress, {passive:true});
    window.addEventListener('resize', updateTargetProgress);
    if(heroVideo.readyState >= 1) onMetadata();
    if(heroVideo.readyState >= 2) onLoadedData();
    requestAnimationFrame(scrubLoop);
  }
});
