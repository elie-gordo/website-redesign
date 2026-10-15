/**
 * 360° product viewer (three.js, loaded on demand).
 * One GLB for every colorway: only the lacquer material is recoloured at runtime.
 */
type Rgb = readonly [number, number, number];

export interface ViewerHandle {
  setColorway(linear: Rgb): void;
  rotate(azimuthDeg: number, polarDeg?: number): void;
  zoom(factor: number): void;
  reset(): void;
  dispose(): void;
}

export interface ViewerOptions {
  modelUrl: string;
  lacquerMaterial: string;
  colorway: Rgb;
  reducedMotion: boolean;
  onProgress?(ratio: number): void;
}

const COLOR_TWEEN_MS = 450;
const AUTO_ROTATE_SPEED = 0.55;
// Initial direction (glTF axes) matches the hero render's camera in Blender.
const HERO_DIRECTION: [number, number, number] = [1.05, 0.5, 2.05];

export function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

export async function mountViewer(host: HTMLElement, opts: ViewerOptions): Promise<ViewerHandle> {
  const [THREE, { GLTFLoader }, { OrbitControls }, { RoomEnvironment }, { MeshoptDecoder }] = await Promise.all([
    import('three'),
    import('three/addons/loaders/GLTFLoader.js'),
    import('three/addons/controls/OrbitControls.js'),
    import('three/addons/environments/RoomEnvironment.js'),
    import('three/addons/libs/meshopt_decoder.module.js'),
  ]);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.domElement.setAttribute('aria-hidden', 'true');

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTexture;
  // Low ambient so dark lacquers stay dark; the key light shapes the volumes.
  scene.environmentIntensity = 0.42;

  const key = new THREE.DirectionalLight(0xfff4e6, 2.4);
  key.position.set(-1.2, 2.2, 1.4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.radius = 6;
  key.shadow.bias = -0.0004;
  Object.assign(key.shadow.camera, { left: -0.6, right: 0.6, top: 0.6, bottom: -0.6, near: 0.5, far: 5 });
  scene.add(key);

  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(opts.modelUrl, (e) => {
    if (e.lengthComputable) opts.onProgress?.(e.loaded / e.total);
  });
  const model = gltf.scene;
  const lacquers = new Set<InstanceType<typeof THREE.MeshStandardMaterial>>();
  model.traverse((obj) => {
    const mesh = obj as InstanceType<typeof THREE.Mesh>;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      if (m.name === opts.lacquerMaterial) lacquers.add(m as InstanceType<typeof THREE.MeshStandardMaterial>);
    }
  });
  if (lacquers.size === 0) throw new Error(`Material ${opts.lacquerMaterial} not found in model`);
  scene.add(model);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.ShadowMaterial({ opacity: 0.16 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Frame the lamp: orbit around its bounding-box centre, distance from its size.
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const target = box.getCenter(new THREE.Vector3());
  key.target.position.copy(target);
  scene.add(key.target);

  // Fit on the narrower field of view so the lamp is never cropped on portrait screens.
  const aspect = host.clientWidth / Math.max(1, host.clientHeight) || 1;
  const camera = new THREE.PerspectiveCamera(28, aspect, 0.05, 20);
  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
  const radius = Math.max(size.x, size.y, size.z) * 0.5;
  const fitDistance = radius / Math.sin(Math.min(vFov, hFov) / 2);
  const home = new THREE.Vector3(...HERO_DIRECTION).normalize().multiplyScalar(fitDistance).add(target);
  camera.position.copy(home);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(target);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = fitDistance * 0.55;
  controls.maxDistance = fitDistance * 1.4;
  controls.minPolarAngle = Math.PI * 0.12;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.autoRotate = !opts.reducedMotion;
  controls.autoRotateSpeed = AUTO_ROTATE_SPEED;
  controls.addEventListener('start', () => (controls.autoRotate = false));
  controls.update();

  const lacquerColor = new THREE.Color().setRGB(...opts.colorway);
  lacquers.forEach((m) => m.color.copy(lacquerColor));
  let tween: { from: InstanceType<typeof THREE.Color>; to: InstanceType<typeof THREE.Color>; start: number } | null =
    null;

  host.append(renderer.domElement);
  const resize = () => {
    const { clientWidth: w, clientHeight: h } = host;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();

  // Render only while visible on screen.
  let visible = true;
  const io = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting));
  io.observe(host);

  let frame = 0;
  const loop = (now: number) => {
    frame = requestAnimationFrame(loop);
    if (!visible || document.hidden) return;
    if (tween) {
      const t = Math.min(1, (now - tween.start) / (opts.reducedMotion ? 1 : COLOR_TWEEN_MS));
      lacquerColor.lerpColors(tween.from, tween.to, 1 - (1 - t) ** 3);
      lacquers.forEach((m) => m.color.copy(lacquerColor));
      if (t === 1) tween = null;
    }
    controls.update();
    renderer.render(scene, camera);
  };
  frame = requestAnimationFrame(loop);

  const orbit = new THREE.Spherical();
  const offset = new THREE.Vector3();

  return {
    setColorway(linear) {
      tween = { from: lacquerColor.clone(), to: new THREE.Color().setRGB(...linear), start: performance.now() };
    },
    rotate(azimuthDeg, polarDeg = 0) {
      controls.autoRotate = false;
      offset.copy(camera.position).sub(controls.target);
      orbit.setFromVector3(offset);
      orbit.theta += THREE.MathUtils.degToRad(azimuthDeg);
      orbit.phi = THREE.MathUtils.clamp(
        orbit.phi + THREE.MathUtils.degToRad(polarDeg),
        controls.minPolarAngle,
        controls.maxPolarAngle,
      );
      camera.position.copy(offset.setFromSpherical(orbit).add(controls.target));
    },
    zoom(factor) {
      offset.copy(camera.position).sub(controls.target);
      const d = THREE.MathUtils.clamp(offset.length() * factor, controls.minDistance, controls.maxDistance);
      camera.position.copy(offset.setLength(d).add(controls.target));
    },
    reset() {
      camera.position.copy(home);
      controls.target.copy(target);
      controls.autoRotate = !opts.reducedMotion;
    },
    dispose() {
      cancelAnimationFrame(frame);
      ro.disconnect();
      io.disconnect();
      controls.dispose();
      envTexture.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
