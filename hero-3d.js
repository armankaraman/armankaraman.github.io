import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';

const hero = document.querySelector('.hero-full');
const stage = document.querySelector('.hero-stage');
const HERO_GLB_PATH = 'assets/site test.glb';
const HERO_CAMERA_VISUAL_SCALE = 0.6;
const HERO_END_ZOOM = 1.1;
const HERO_END_PUSH_START = 0.56;
const HERO_END_FLY_DISTANCE = 0.28;
const HERO_END_DROP_DISTANCE = 0.14;
const HERO_SHADOW_OPACITY = 0.34;
const HERO_CHROME_ENV_INTENSITY = 2.65;
const HERO_ENV_ROTATION_TURNS = 0.85;
const HERO_ENV_ROTATION_TILT = 0.18;
const HERO_SCRUB_DAMPING = 10;
const HERO_SCRUB_EPSILON = 0.00035;

if (hero && stage) {
  stage.dataset.heroStatus = 'loading';
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xcfd6dc, 0x111111, 0.72));
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.65);
  keyLight.position.set(4, 8, 6);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  scene.add(keyLight);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setClearColor(0x111111, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  stage.appendChild(renderer.domElement);

  function paintSoftBox(context, x, y, width, height, color, opacity) {
    context.save();
    context.shadowColor = color;
    context.shadowBlur = Math.max(width, height) * 0.45;
    context.globalAlpha = opacity;
    context.fillStyle = color;
    context.fillRect(x, y, width, height);
    context.restore();
  }

  function createStudioEnvironmentMap() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;

    const context = canvas.getContext('2d');
    const background = context.createLinearGradient(0, 0, 0, canvas.height);
    background.addColorStop(0, '#050607');
    background.addColorStop(0.42, '#17191b');
    background.addColorStop(0.58, '#050607');
    background.addColorStop(1, '#020202');
    context.fillStyle = background;
    context.fillRect(0, 0, canvas.width, canvas.height);

    paintSoftBox(context, 96, 96, 86, 310, '#d9e2ea', 0.95);
    paintSoftBox(context, 776, 74, 150, 350, '#ffffff', 0.92);
    paintSoftBox(context, 408, 28, 220, 54, '#bfc7ce', 0.58);
    paintSoftBox(context, 300, 326, 360, 28, '#76808a', 0.36);
    paintSoftBox(context, 670, 250, 42, 140, '#a0bad6', 0.48);
    paintSoftBox(context, 198, 258, 42, 120, '#d4c3ad', 0.34);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.needsUpdate = true;

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const environmentMap = pmremGenerator.fromEquirectangular(texture).texture;
    texture.dispose();
    pmremGenerator.dispose();
    return environmentMap;
  }

  scene.environment = createStudioEnvironmentMap();

  const chromeMaterial = new THREE.MeshStandardMaterial({
    color: 0x8f9499,
    metalness: 1,
    roughness: 0.11,
    envMapIntensity: HERO_CHROME_ENV_INTENSITY
  });
  chromeMaterial.envMapRotation = new THREE.Euler();

  let camera;
  let mixer;
  let actions = [];
  let animationDuration = 0;
  let scrubDuration = 0;
  let baseCameraZoom = 1;
  let flyDistance = 0;
  let targetProgress = 0;
  let displayedProgress = 0;
  let animationFrame = 0;
  let lastFrameTime = 0;
  const baseCameraPosition = new THREE.Vector3();
  const baseCameraQuaternion = new THREE.Quaternion();
  const cameraForward = new THREE.Vector3();
  const cameraDown = new THREE.Vector3();

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

  function smootherstep(amount) {
    return amount * amount * amount * (amount * (amount * 6 - 15) + 10);
  }

  function scrubAnimation() {
    if (!mixer || !scrubDuration) return;
    const animationTime = displayedProgress * scrubDuration;
    actions.forEach((action) => {
      action.enabled = true;
      action.paused = false;
    });
    mixer.setTime(animationTime);
    stage.dataset.heroAnimationTime = animationTime.toFixed(3);
  }

  function updateEndPush() {
    if (!camera || (!camera.isPerspectiveCamera && !camera.isOrthographicCamera)) return;
    const pushAmount = THREE.MathUtils.clamp((displayedProgress - HERO_END_PUSH_START) / (1 - HERO_END_PUSH_START), 0, 1);
    const pushProgress = smootherstep(pushAmount);
    cameraForward.set(0, 0, -1).applyQuaternion(baseCameraQuaternion);
    cameraDown.set(0, -1, 0).applyQuaternion(baseCameraQuaternion);
    camera.position
      .copy(baseCameraPosition)
      .addScaledVector(cameraForward, flyDistance * pushProgress)
      .addScaledVector(cameraDown, flyDistance * HERO_END_DROP_DISTANCE * pushProgress);
    camera.zoom = baseCameraZoom * THREE.MathUtils.lerp(1, HERO_END_ZOOM, pushProgress);
    camera.updateProjectionMatrix();
  }

  function updateEnvironmentReflection() {
    chromeMaterial.envMapRotation.set(
      Math.sin(displayedProgress * Math.PI) * HERO_ENV_ROTATION_TILT,
      displayedProgress * Math.PI * 2 * HERO_ENV_ROTATION_TURNS,
      0
    );
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
    targetProgress = getProgress();
    displayedProgress = targetProgress;
    renderScene();
  }

  function renderScene() {
    if (!camera) return;
    scrubAnimation();
    updateEndPush();
    updateEnvironmentReflection();
    camera.updateMatrixWorld();
    renderer.render(scene, camera);
  }

  function animateScrub(timestamp) {
    const deltaTime = lastFrameTime ? Math.min((timestamp - lastFrameTime) / 1000, 0.05) : 1 / 60;
    lastFrameTime = timestamp;
    targetProgress = getProgress();
    displayedProgress += (targetProgress - displayedProgress) * (1 - Math.exp(-HERO_SCRUB_DAMPING * deltaTime));

    const difference = Math.abs(targetProgress - displayedProgress);
    if (difference < HERO_SCRUB_EPSILON) {
      displayedProgress = targetProgress;
    }

    renderScene();

    if (Math.abs(targetProgress - displayedProgress) > HERO_SCRUB_EPSILON) {
      animationFrame = requestAnimationFrame(animateScrub);
    } else {
      animationFrame = 0;
      lastFrameTime = 0;
    }
  }

  function requestRender() {
    targetProgress = getProgress();
    if (!animationFrame) {
      animationFrame = requestAnimationFrame(animateScrub);
    }
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
        object.material = chromeMaterial;
      }
    });

    return sphere;
  }

  new GLTFLoader().load(
    encodeURI(HERO_GLB_PATH),
    (gltf) => {
      const model = gltf.scene;
      scene.add(model);
      scene.updateMatrixWorld(true);
      const modelSphere = setupShadows(model);
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
      baseCameraPosition.copy(camera.position);
      baseCameraQuaternion.copy(camera.quaternion);
      flyDistance = modelSphere.radius * HERO_END_FLY_DISTANCE;
      camera.updateMatrixWorld(true);

      const cameras = gltf.cameras.length ? gltf.cameras : [sourceCamera];
      const scrubClips = createScrubClips(gltf.animations, cameras);
      animationDuration = scrubClips.reduce((duration, clip) => Math.max(duration, clip.duration), 0);
      scrubDuration = animationDuration;
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
      targetProgress = getProgress();
      displayedProgress = targetProgress;
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
