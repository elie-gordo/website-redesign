import { ThreeCanvas } from "@remotion/three";
import { useEffect, useMemo, useState } from "react";
import {
  AbsoluteFill,
  Easing,
  cancelRender,
  continueRender,
  delayRender,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

type Props = {
  readonly background: string;
  readonly lacquer: [number, number, number];
};

// Same framing and light as the web viewer (src/scripts/viewer.ts), so the last frame
// matches the 3D view the visitor lands on.
const FOV = 28;
const HERO_DIRECTION = new THREE.Vector3(1.05, 0.5, 2.05).normalize();
const LACQUER_MATERIAL = "MAT_Lacquer";
const deg = THREE.MathUtils.degToRad;

type Rig = { node: THREE.Object3D; rest: number };

function useLamp() {
  const [handle] = useState(() => delayRender("Loading tensil.glb"));
  const [gltf, setGltf] = useState<THREE.Group | null>(null);
  useEffect(() => {
    new GLTFLoader()
      .setMeshoptDecoder(MeshoptDecoder)
      .loadAsync(staticFile("models/tensil.glb"))
      .then((result) => {
        setGltf(result.scene);
        continueRender(handle);
      })
      .catch((err) => cancelRender(err));
  }, [handle]);
  return gltf;
}

export const Intro: React.FC<Props> = ({ background, lacquer }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const model = useLamp();

  const scene = useMemo(() => {
    if (!model) return null;
    const rig = (name: string): Rig => {
      const node = model.getObjectByName(name);
      if (!node) throw new Error(`${name} not found in tensil.glb`);
      return { node, rest: node.rotation.x };
    };
    const lacquers = new Set<THREE.MeshStandardMaterial>();
    model.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((m) => m.name === LACQUER_MATERIAL && lacquers.add(m as THREE.MeshStandardMaterial));
    });
    lacquers.forEach((m) => m.color.setRGB(...lacquer));

    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const target = box.getCenter(new THREE.Vector3());
    return {
      wrist: rig("RIG_Wrist"),
      target,
      radius: Math.max(size.x, size.y, size.z) * 0.5,
    };
  }, [model, lacquer]);

  // Motion: the lamp turns in from three-quarter back, then the head lifts into the hero pose.
  // Only the head joint moves: the springs are parented to other segments and would detach
  // if the shoulder or elbow turned.
  const turn = interpolate(frame, [0, 62], [0, 1], {
    easing: Easing.bezier(0.2, 0.7, 0.1, 1),
    extrapolateRight: "clamp",
  });
  const nod = spring({ frame: frame - 30, fps, config: { damping: 9, stiffness: 80 } });

  if (scene) {
    // The lamp yaws on its turret: the model root turns so the shadow turns with it.
    model!.rotation.y = deg(-115) * (1 - turn);
    scene.wrist.node.rotation.x = scene.wrist.rest + deg(30) * (1 - nod);
  }

  const camera = useMemo(() => {
    const cam = new THREE.PerspectiveCamera(FOV, width / height, 0.05, 20);
    if (scene) {
      const fit = scene.radius / Math.sin(deg(FOV) / 2);
      cam.position.copy(HERO_DIRECTION.clone().multiplyScalar(fit).add(scene.target));
      cam.lookAt(scene.target);
    }
    return cam;
  }, [scene, width, height]);

  return (
    <AbsoluteFill style={{ backgroundColor: background }}>
      {model && scene ? (
        <ThreeCanvas
          width={width}
          height={height}
          camera={camera}
          shadows
          gl={{ antialias: true, alpha: true }}
          onCreated={({ gl, scene: s }) => {
            gl.outputColorSpace = THREE.SRGBColorSpace;
            gl.toneMapping = THREE.AgXToneMapping;
            gl.toneMappingExposure = 1.05;
            const pmrem = new THREE.PMREMGenerator(gl);
            s.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
            s.environmentIntensity = 0.42;
          }}
        >
          <directionalLight
            color={0xfff4e6}
            intensity={2.4}
            position={[scene.target.x - 1.2, 2.2, scene.target.z + 1.4]}
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-radius={6}
            shadow-bias={-0.0004}
            shadow-camera-left={-0.6}
            shadow-camera-right={0.6}
            shadow-camera-top={0.6}
            shadow-camera-bottom={-0.6}
            shadow-camera-near={0.5}
            shadow-camera-far={5}
          />
          <primitive object={model} />
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[4, 4]} />
            <shadowMaterial opacity={0.16} />
          </mesh>
        </ThreeCanvas>
      ) : null}
    </AbsoluteFill>
  );
};
