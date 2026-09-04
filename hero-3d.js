import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';

const hero = document.querySelector('.hero-full');
const stage = document.querySelector('.hero-stage');

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
  let startPosition;
  let endPosition;
  let startQuaternion;
  let targetProgress = 0;
  let displayedProgress = 0;
  let animationFrame = 0;

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
    const eased = displayedProgress * displayedProgress * (3 - 2 * displayedProgress);
    camera.position.lerpVectors(startPosition, endPosition, eased);
    camera.quaternion.copy(startQuaternion);
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

  function createCamera(source) {
    if (source.isPerspectiveCamera) {
      const result = new THREE.PerspectiveCamera(source.fov, source.aspect, source.near, source.far);
      result.position.copy(source.getWorldPosition(new THREE.Vector3()));
      result.quaternion.copy(source.getWorldQuaternion(new THREE.Quaternion()));
      return result;
    }
    const result = source.clone();
    result.position.copy(source.getWorldPosition(new THREE.Vector3()));
    result.quaternion.copy(source.getWorldQuaternion(new THREE.Quaternion()));
    result.parent = null;
    return result;
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

      const sourceCamera = gltf.cameras?.[0] || model.getObjectByProperty('isCamera', true);
      const bounds = new THREE.Box3().setFromObject(model);
      const sphere = bounds.getBoundingSphere(new THREE.Sphere());
      camera = sourceCamera ? createCamera(sourceCamera) : createFallbackCamera(bounds);
      if (!sourceCamera) {
        stage.dataset.heroStatus = 'loaded:fallback-camera';
        console.info('[hero-3d] No Blender camera found; using fallback PerspectiveCamera.');
      }
      scene.add(camera);
      camera.updateMatrixWorld(true);
      startPosition = camera.position.clone();
      startQuaternion = camera.quaternion.clone();
      stage.dataset.heroBounds = `${sphere.center.x.toFixed(2)},${sphere.center.y.toFixed(2)},${sphere.center.z.toFixed(2)},${sphere.radius.toFixed(2)}`;
      stage.dataset.heroCamera = `${startPosition.x.toFixed(2)},${startPosition.y.toFixed(2)},${startPosition.z.toFixed(2)}`;
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(startQuaternion).normalize();
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(startQuaternion).normalize();
      const travelDistance = Math.max(sphere.radius * 3.4, 8);
      const sideDrift = Math.min(Math.max(sphere.radius * 0.055, 0.08), 0.45);
      endPosition = startPosition.clone().addScaledVector(forward, travelDistance).addScaledVector(right, sideDrift);

      targetProgress = getProgress();
      displayedProgress = targetProgress;
      console.info('[hero-3d] Camera:', sourceCamera ? 'Blender camera' : 'fallback', 'bounds:', stage.dataset.heroBounds);
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
