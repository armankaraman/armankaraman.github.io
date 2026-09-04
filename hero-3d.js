import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';

const hero = document.querySelector('.hero-full');
const stage = document.querySelector('.hero-stage');
const HERO_CAMERA_ZOOM = 1.2;

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
  let cameraClip;
  let targetProgress = 0;
  let displayedProgress = 0;
  let animationFrame = 0;
  renderer.domElement.style.transform = 'rotate(180deg)';

  function getProgress() {
    const heroTop = hero.offsetTop;
    const travel = Math.max(1, hero.offsetHeight - window.innerHeight);
    return THREE.MathUtils.clamp((window.scrollY - heroTop) / travel, 0, 1);
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
    render();
  }

  function render() {
    if (!camera) return;
    if (mixer && cameraClip) {
      const animationTime = displayedProgress * cameraClip.duration;
      mixer.setTime(animationTime);
      stage.dataset.heroAnimationTime = animationTime.toFixed(3);
    }
    camera.updateMatrixWorld();
    renderer.render(scene, camera);
  }

  function animateCamera() {
    animationFrame = 0;
    const difference = targetProgress - displayedProgress;
    displayedProgress += difference * 0.075;
    if (Math.abs(difference) < 0.0001) {
      displayedProgress = targetProgress;
    } else {
      animationFrame = requestAnimationFrame(animateCamera);
    }
    render();
  }

  function updateFromScroll() {
    targetProgress = getProgress();
    if (!animationFrame) animationFrame = requestAnimationFrame(animateCamera);
  }

  function createFallbackCamera(bounds) {
    const sphere = bounds.getBoundingSphere(new THREE.Sphere());
    const distance = Math.max(sphere.radius * 2.8, 4);
    const result = new THREE.PerspectiveCamera(40, 1, 0.01, Math.max(1000, distance * 20));
    result.position.set(sphere.center.x, sphere.center.y + distance * 0.45, sphere.center.z + distance);
    result.lookAt(sphere.center);
    return result;
  }

  new GLTFLoader().load(
    encodeURI('assets/site test.glb'),
    (gltf) => {
      const model = gltf.scene;
      scene.add(model);
      scene.updateMatrixWorld(true);
      model.traverse((object) => {
        if (object.isMesh) {
          object.frustumCulled = false;
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          if (object.name !== 'floor') {
            materials.forEach((material) => {
              if (!material) return;
              if (material.color) material.color.set(0xf5f5f5);
              if ('metalness' in material) material.metalness = 0.35;
              if ('roughness' in material) material.roughness = 0.3;
              material.needsUpdate = true;
            });
          }
        }
      });
      stage.dataset.heroStatus = `loaded:${gltf.cameras.length}`;
      console.info('[hero-3d] GLB loaded:', 'assets/site test.glb');
      console.info('[hero-3d] Cameras:', gltf.cameras.map((item) => item.name || '(unnamed)'));
      console.info('[hero-3d] Animation clips:', gltf.animations.map((item) => item.name || '(unnamed)'));

      const sourceCamera = gltf.cameras?.[0] || model.getObjectByProperty('isCamera', true);
      const bounds = new THREE.Box3().setFromObject(model);
      const sphere = bounds.getBoundingSphere(new THREE.Sphere());
      camera = sourceCamera || createFallbackCamera(bounds);
      if (!sourceCamera) {
        stage.dataset.heroStatus = 'loaded:fallback-camera';
        console.info('[hero-3d] No Blender camera found; using fallback PerspectiveCamera.');
      } else {
        stage.dataset.heroStatus = `loaded:camera:${sourceCamera.name || 'unnamed'}`;
      }
      if (camera.isPerspectiveCamera) {
        camera.fov = Math.max(36, THREE.MathUtils.radToDeg(camera.fov));
        camera.zoom = HERO_CAMERA_ZOOM;
        camera.near = 0.01;
        camera.far = 1000;
        camera.updateProjectionMatrix();
      }
      camera.updateMatrixWorld(true);
      stage.dataset.heroBounds = `${sphere.center.x.toFixed(2)},${sphere.center.y.toFixed(2)},${sphere.center.z.toFixed(2)},${sphere.radius.toFixed(2)}`;
      const cameraAnimation = gltf.animations.find((clip) => clip.tracks.some((track) => track.name.startsWith(`${sourceCamera?.name || ''}.`)));
      cameraClip = cameraAnimation || null;
      if (cameraClip) {
        mixer = new THREE.AnimationMixer(model);
        mixer.clipAction(cameraClip).play();
        stage.dataset.heroAnimation = `${cameraClip.name || 'unnamed'}:${cameraClip.duration.toFixed(2)}s`;
        console.info('[hero-3d] Camera animation:', cameraClip.name || '(unnamed)', 'duration:', cameraClip.duration);
      } else {
        stage.dataset.heroAnimation = 'none';
        console.warn('[hero-3d] No animation clip found for camera:', sourceCamera?.name || '(fallback)');
      }

      targetProgress = getProgress();
      displayedProgress = targetProgress;
      console.info('[hero-3d] Active camera:', sourceCamera ? sourceCamera.name : 'fallback', 'bounds:', stage.dataset.heroBounds);
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
