import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';

const hero = document.querySelector('.hero-full');
const stage = document.querySelector('.hero-stage');
const HERO_GLB_PATH = 'assets/site test.glb';
const HERO_SCRUB_FRAMES = 45;
const HERO_ANIMATION_FPS = 24;
const HERO_CAMERA_VISUAL_SCALE = 0.6;
const HERO_END_ZOOM = 1.08;
const HERO_END_ZOOM_START = 0.82;
const HERO_SHADOW_OPACITY = 0.34;

if (hero && stage) {
  stage.dataset.heroStatus = 'loading';
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xf0f0f0, 0x202020, 1.6));
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
  keyLight.position.set(4, 8, 6);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  scene.add(keyLight);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setClearColor(0x111111, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  stage.appendChild(renderer.domElement);

  let camera;
  let mixer;
  let actions = [];
  let animationDuration = 0;
  let scrubDuration = 0;
  let baseCameraZoom = 1;
  let renderRequested = false;

  function getProgress() {
    const heroTop = hero.offsetTop;
    const travel = Math.max(1, hero.offsetHeight - window.innerHeight);
    return THREE.MathUtils.clamp((window.scrollY - heroTop) / travel, 0, 1);
  }

  function isCameraTrack(track, cameras) {
    const parsedTrack = THREE.PropertyBinding.parseTrackName(track.name);
    return cameras.some((item) => item.name && parsedTrack.nodeName === item.name);
  }

  function createScrubClips(clips, cameras) {
    return clips
      .map((clip) => {
        const tracks = clip.tracks.filter((track) => !isCameraTrack(track, cameras));
        return tracks.length ? new THREE.AnimationClip(clip.name, clip.duration, tracks) : null;
      })
      .filter(Boolean);
  }

  function scrubAnimation() {
    if (!mixer || !scrubDuration) return;
    const progress = getProgress();
    const animationTime = progress * scrubDuration;
    actions.forEach((action) => {
      action.enabled = true;
      action.paused = false;
    });
    mixer.setTime(animationTime);
    stage.dataset.heroAnimationTime = animationTime.toFixed(3);
  }

  function updateEndZoom() {
    if (!camera || (!camera.isPerspectiveCamera && !camera.isOrthographicCamera)) return;
    const zoomProgress = THREE.MathUtils.smoothstep(getProgress(), HERO_END_ZOOM_START, 1);
    camera.zoom = baseCameraZoom * THREE.MathUtils.lerp(1, HERO_END_ZOOM, zoomProgress);
    camera.updateProjectionMatrix();
  }

  function resize() {
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    if (!width || !height || !camera) return;

    renderer.setSize(width, height, false);
    if (camera.isPerspectiveCamera) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
    requestRender();
  }

  function render() {
    renderRequested = false;
    if (!camera) return;
    scrubAnimation();
    updateEndZoom();
    camera.updateMatrixWorld();
    renderer.render(scene, camera);
  }

  function requestRender() {
    if (renderRequested) return;
    renderRequested = true;
    requestAnimationFrame(render);
  }

  function isShadowCatcher(object) {
    return /floor|ground|shadow/i.test(object.name || '');
  }

  function setupShadows(model) {
    const bounds = new THREE.Box3().setFromObject(model);
    const sphere = bounds.getBoundingSphere(new THREE.Sphere());
    const shadowSize = Math.max(sphere.radius * 2.4, 8);

    keyLight.target.position.copy(sphere.center);
    scene.add(keyLight.target);
    keyLight.target.updateMatrixWorld();

    keyLight.shadow.camera.left = -shadowSize;
    keyLight.shadow.camera.right = shadowSize;
    keyLight.shadow.camera.top = shadowSize;
    keyLight.shadow.camera.bottom = -shadowSize;
    keyLight.shadow.camera.near = 0.1;
    keyLight.shadow.camera.far = Math.max(60, sphere.radius * 8);
    keyLight.shadow.camera.updateProjectionMatrix();

    model.traverse((object) => {
      if (!object.isMesh) return;

      object.frustumCulled = false;
      if (isShadowCatcher(object)) {
        object.castShadow = false;
        object.receiveShadow = true;
        object.material = new THREE.ShadowMaterial({
          color: 0x000000,
          opacity: HERO_SHADOW_OPACITY
        });
      } else {
        object.castShadow = true;
        object.receiveShadow = false;
      }
    });
  }

  new GLTFLoader().load(
    encodeURI(HERO_GLB_PATH),
    (gltf) => {
      const model = gltf.scene;
      scene.add(model);
      scene.updateMatrixWorld(true);
      setupShadows(model);
      console.info('[hero-3d] GLB loaded:', HERO_GLB_PATH);
      console.info('[hero-3d] Cameras:', gltf.cameras.map((item) => item.name || '(unnamed)'));
      console.info('[hero-3d] Animation clips:', gltf.animations.map((item) => item.name || '(unnamed)'));

      const sourceCamera = gltf.cameras?.[0] || model.getObjectByProperty('isCamera', true);
      if (!sourceCamera) {
        stage.dataset.heroStatus = 'load-error:no-camera';
        console.error('[hero-3d] No GLB camera found. The hero requires a camera exported in the GLB.');
        return;
      }

      camera = sourceCamera;
      stage.dataset.heroStatus = `loaded:camera:${sourceCamera.name || 'unnamed'}`;
      if (camera.isPerspectiveCamera || camera.isOrthographicCamera) {
        camera.zoom *= HERO_CAMERA_VISUAL_SCALE;
        baseCameraZoom = camera.zoom;
        camera.updateProjectionMatrix();
      }
      camera.updateMatrixWorld(true);

      const cameras = gltf.cameras.length ? gltf.cameras : [sourceCamera];
      const scrubClips = createScrubClips(gltf.animations, cameras);
      animationDuration = scrubClips.reduce((duration, clip) => Math.max(duration, clip.duration), 0);
      scrubDuration = Math.min(animationDuration, HERO_SCRUB_FRAMES / HERO_ANIMATION_FPS);
      if (scrubClips.length && scrubDuration) {
        mixer = new THREE.AnimationMixer(model);
        actions = scrubClips.map((clip) => {
          const action = mixer.clipAction(clip);
          action.setLoop(THREE.LoopOnce, 1);
          action.clampWhenFinished = true;
          action.play();
          return action;
        });
        stage.dataset.heroAnimation = `${scrubClips.length}:${scrubDuration.toFixed(2)}s`;
        console.info('[hero-3d] Scrub animation clips:', scrubClips.map((clip) => clip.name || '(unnamed)'), 'duration:', scrubDuration, 'source duration:', animationDuration);
      } else {
        stage.dataset.heroAnimation = 'none';
        console.warn('[hero-3d] No non-camera animation clips found in GLB.');
      }

      console.info('[hero-3d] Active GLB camera:', sourceCamera.name || '(unnamed)');
      resize();
      requestRender();
    },
    undefined,
    (error) => {
      stage.dataset.heroStatus = 'load-error';
      console.error('[hero-3d] GLB load failed:', error);
      stage.removeChild(renderer.domElement);
    }
  );

  window.addEventListener('scroll', requestRender, { passive: true });
  window.addEventListener('resize', resize);
}
