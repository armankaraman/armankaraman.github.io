import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';

const hero = document.querySelector('.hero-full');
const stage = document.querySelector('.hero-stage');
const HERO_GLB_PATH = 'assets/site test.glb';

if (hero && stage) {
  stage.dataset.heroStatus = 'loading';
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xf0f0f0, 0x202020, 1.6));
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
  keyLight.position.set(4, 8, 6);
  scene.add(keyLight);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setClearColor(0x111111, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  stage.appendChild(renderer.domElement);

  let camera;
  let mixer;
  let actions = [];
  let animationDuration = 0;

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
    if (!mixer || !animationDuration) return;
    const animationTime = getProgress() * animationDuration;
    actions.forEach((action) => {
      action.enabled = true;
      action.paused = false;
    });
    mixer.setTime(animationTime);
    stage.dataset.heroAnimationTime = animationTime.toFixed(3);
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
    scrubAnimation();
    render();
  }

  function render() {
    if (!camera) return;
    camera.updateMatrixWorld();
    renderer.render(scene, camera);
  }

  function updateFromScroll() {
    scrubAnimation();
    render();
  }

  new GLTFLoader().load(
    encodeURI(HERO_GLB_PATH),
    (gltf) => {
      const model = gltf.scene;
      scene.add(model);
      scene.updateMatrixWorld(true);
      model.traverse((object) => {
        if (object.isMesh) {
          object.frustumCulled = false;
        }
      });
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
      if (camera.isPerspectiveCamera) {
        camera.updateProjectionMatrix();
      }
      camera.updateMatrixWorld(true);

      const cameras = gltf.cameras.length ? gltf.cameras : [sourceCamera];
      const scrubClips = createScrubClips(gltf.animations, cameras);
      animationDuration = scrubClips.reduce((duration, clip) => Math.max(duration, clip.duration), 0);
      if (scrubClips.length && animationDuration) {
        mixer = new THREE.AnimationMixer(model);
        actions = scrubClips.map((clip) => {
          const action = mixer.clipAction(clip);
          action.setLoop(THREE.LoopOnce, 1);
          action.clampWhenFinished = true;
          action.play();
          return action;
        });
        stage.dataset.heroAnimation = `${scrubClips.length}:${animationDuration.toFixed(2)}s`;
        console.info('[hero-3d] Scrub animation clips:', scrubClips.map((clip) => clip.name || '(unnamed)'), 'duration:', animationDuration);
      } else {
        stage.dataset.heroAnimation = 'none';
        console.warn('[hero-3d] No non-camera animation clips found in GLB.');
      }

      console.info('[hero-3d] Active GLB camera:', sourceCamera.name || '(unnamed)');
      resize();
      render();
    },
    undefined,
    (error) => {
      stage.dataset.heroStatus = 'load-error';
      console.error('[hero-3d] GLB load failed:', error);
      stage.removeChild(renderer.domElement);
    }
  );

  window.addEventListener('scroll', updateFromScroll, { passive: true });
  window.addEventListener('resize', resize);
}
