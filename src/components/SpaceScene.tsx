import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Line, Stars } from '@react-three/drei';
import * as THREE from 'three';
import earthTextureUrl from '../assets/earth.jpg';
import moonTextureUrl from '../assets/moon.jpg';

function Earth() {
  const ref = useRef<THREE.Mesh>(null);
  const map = useMemo(() => new THREE.TextureLoader().load(earthTextureUrl), []);
  map.colorSpace = THREE.SRGBColorSpace;
  useFrame((_, delta) => { if (ref.current) ref.current.rotation.y += delta * 0.022; });
  return (
    <group position={[3.1, -1.02, -0.75]}>
      <mesh ref={ref} rotation={[0.17, 0.32, 0]}>
        <sphereGeometry args={[2.12, 72, 60]} />
        <meshStandardMaterial map={map} roughness={0.98} metalness={0.03} />
      </mesh>
      <mesh>
        <sphereGeometry args={[2.19, 64, 48]} />
        <meshBasicMaterial color="#2b9eea" transparent opacity={0.095} blending={THREE.AdditiveBlending} side={THREE.BackSide} depthWrite={false} />
      </mesh>
      <mesh rotation={[0, 0.03, 0]}>
        <sphereGeometry args={[2.26, 64, 48]} />
        <meshBasicMaterial color="#1d7ac4" transparent opacity={0.026} blending={THREE.AdditiveBlending} side={THREE.BackSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Moon() {
  const ref = useRef<THREE.Mesh>(null);
  const map = useMemo(() => new THREE.TextureLoader().load(moonTextureUrl), []);
  map.colorSpace = THREE.SRGBColorSpace;
  useFrame((_, delta) => { if (ref.current) ref.current.rotation.y += delta * 0.006; });
  return (
    <mesh ref={ref} position={[5.32, 2.04, -2.55]} rotation={[0.05, -0.15, 0]}>
      <sphereGeometry args={[0.82, 52, 44]} />
      <meshStandardMaterial map={map} color="#e2e4e9" roughness={1} />
    </mesh>
  );
}

function FlightPath() {
  const points = useMemo(() => {
    const trajectory = new THREE.CatmullRomCurve3([
      new THREE.Vector3(1.38, -2.5, 0.2),
      new THREE.Vector3(0.55, -0.54, 1.1),
      new THREE.Vector3(1.75, 1.7, 0.45),
      new THREE.Vector3(4.25, 2.66, -1.4),
      new THREE.Vector3(6.32, 2.27, -1.5),
      new THREE.Vector3(7.1, 0.4, -1.6),
      new THREE.Vector3(5.1, -2.78, 0.5),
      new THREE.Vector3(3.2, -2.93, 0.5),
      new THREE.Vector3(2.0, -2.58, 0.45),
    ], false, 'centripetal');
    return trajectory.getPoints(160);
  }, []);
  return (
    <group>
      <Line points={points} color="#68deff" lineWidth={1.15} opacity={0.47} transparent dashed dashScale={15} dashSize={0.5} gapSize={0.5} />
      <Line points={points} color="#43a8e8" lineWidth={3} opacity={0.085} transparent />
      <mesh position={[0.72, 0.18, 0.95]} rotation={[0, 0, -0.28]}>
        <coneGeometry args={[0.065, 0.18, 10]} />
        <meshBasicMaterial color="#dcfaff" />
      </mesh>
    </group>
  );
}

function Universe() {
  return (
    <>
      <color attach="background" args={['#050a18']} />
      <ambientLight intensity={0.15} color="#8196cb" />
      <directionalLight position={[-5, 7, 8]} intensity={2.3} color="#f9f7ec" />
      <directionalLight position={[10, -3, 0]} intensity={0.25} color="#2461ab" />
      <Stars radius={90} depth={60} count={3000} factor={3.2} saturation={0} fade speed={0.15}/>
      <Suspense fallback={null}>
        <Earth />
        <Moon />
      </Suspense>
      <FlightPath />
    </>
  );
}

export default function SpaceScene() {
  return (
    <div className="space-scene" aria-hidden="true">
      <div className="space-background-glow" />
      <Canvas camera={{ position: [0, 0, 13], fov: 48 }} gl={{ antialias: true, alpha: false, powerPreference: 'low-power' }} dpr={[1, 1.5]}>
        <Universe />
      </Canvas>
      <div className="space-scene-vignette" />
      <div className="scene-label scene-label--moon"><span className="scene-label-dot" /> LUA <span>384.400 km*</span></div>
      <div className="scene-label scene-label--earth"><span className="scene-label-dot" /> TERRA <span>BASE DE RETORNO</span></div>
      <div className="scene-scale-note">* Distância média Terra–Lua · visualização fora de escala</div>
    </div>
  );
}
