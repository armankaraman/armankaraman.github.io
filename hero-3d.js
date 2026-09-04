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
  renderer.toneMapping = THREE.NeutralToneMapping;
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

  new GLTFLoader().load(
    encodeURI('assets/site test.glb'),
    (gltf) => {
      const model = gltf.scene;
      scene.add(model);
      scene.updateMatrixWorld(true);
      model.traverse((object) => {
        if (object.isMesh) object.frustumCulled = false;
      });
      stage.dataset.heroStatus = `loaded:${gltf.cameras.length}`;

      const sourceCamera = gltf.cameras?.[0] || model.getObjectByProperty('isCamera', true);
      if (!sourceCamera) {
        stage.dataset.heroStatus = 'missing-camera';
        return;
      }

      camera = createCamera(sourceCamera);
      scene.add(camera);
      camera.updateMatrixWorld(true);
      startPosition = camera.position.clone();
      startQuaternion = camera.quaternion.clone();

      const bounds = new THREE.Box3().setFromObject(model);
      const sphere = bounds.getBoundingSphere(new THREE.Sphere());
      stage.dataset.heroBounds = `${sphere.center.x.toFixed(2)},${sphere.center.y.toFixed(2)},${sphere.center.z.toFixed(2)},${sphere.radius.toFixed(2)}`;
      stage.dataset.heroCamera = `${startPosition.x.toFixed(2)},${startPosition.y.toFixed(2)},${startPosition.z.toFixed(2)}`;
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(startQuaternion).normalize();
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(startQuaternion).normalize();
      const travelDistance = Math.max(sphere.radius * 0.42, 0.5);
      const sideDrift = Math.min(Math.max(sphere.radius * 0.055, 0.08), 0.45);
      endPosition = startPosition.clone().addScaledVector(forward, travelDistance).addScaledVector(right, sideDrift);

      targetProgress = getProgress();
      displayedProgress = targetProgress;
      resize();
      render();
    },
    undefined,
    () => {
      stage.dataset.heroStatus = 'load-error';
      stage.removeChild(renderer.domElement);
    }
  );

  window.addEventListener('scroll', updateFromScroll, { passive: true });
  window.addEventListener('resize', resize);
}
