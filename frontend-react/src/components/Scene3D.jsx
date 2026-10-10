import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Preload } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

// --- Premium SaaS Particle Effect ---
function SubtleParticles() {
  const particleCount = 1000;
  
  const [positions, speeds] = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const spd = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 30; // x
      pos[i * 3 + 1] = (Math.random() - 0.5) * 30; // y
      pos[i * 3 + 2] = (Math.random() - 0.5) * 30; // z
      spd[i] = 0.01 + Math.random() * 0.02;      
    }
    return [pos, spd];
  }, []);

  const pointsRef = useRef();

  useFrame(() => {
    if (!pointsRef.current) return;
    const posArray = pointsRef.current.geometry.attributes.position.array;
    for (let i = 0; i < particleCount; i++) {
      posArray[i * 3 + 1] += speeds[i]; // float upwards
      if (posArray[i * 3 + 1] > 15) posArray[i * 3 + 1] = -15; // loop
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    pointsRef.current.rotation.y += 0.0005;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={particleCount} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#00ff9f" transparent opacity={0.3} blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  );
}

// --- Rain Particles ---
function RainParticles({ intensity = 0.5 }) {
  const count = Math.floor(800 * intensity);
  const pointsRef = useRef();

  const [positions, velocities] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 16;
      pos[i * 3 + 1] = Math.random() * 14;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 16;
      vel[i] = 0.15 + Math.random() * 0.2;
    }
    return [pos, vel];
  }, [count]);

  useFrame(() => {
    if (!pointsRef.current) return;
    const posArray = pointsRef.current.geometry.attributes.position.array;
    for (let i = 0; i < count; i++) {
      posArray[i * 3 + 1] -= velocities[i];
      posArray[i * 3] += Math.sin(i * 0.1) * 0.005; // slight wind drift
      if (posArray[i * 3 + 1] < -2) {
        posArray[i * 3 + 1] = 12;
        posArray[i * 3] = (Math.random() - 0.5) * 16;
        posArray[i * 3 + 2] = (Math.random() - 0.5) * 16;
      }
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  if (count < 50) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        color="#aaddff"
        transparent
        opacity={0.6}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

// --- Humidity Fog Overlay ---
function HumidityFog({ humidity = 50 }) {
  const meshRef = useRef();
  const fogOpacity = Math.max(0, (humidity - 55) / 100) * 0.35;

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();
    meshRef.current.material.opacity = fogOpacity * (0.8 + Math.sin(t * 0.5) * 0.2);
    meshRef.current.position.y = Math.sin(t * 0.3) * 0.3;
  });

  if (fogOpacity < 0.02) return null;

  return (
    <mesh ref={meshRef} position={[0, 1, 0]}>
      <sphereGeometry args={[8, 16, 16]} />
      <meshBasicMaterial
        color="#88ccaa"
        transparent
        opacity={fogOpacity}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  );
}

// --- Fireflies - Organic Floating Glow Particles ---
function Fireflies({ count = 40 }) {
  const pointsRef = useRef();

  const [positions, phases] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const ph = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 14;
      pos[i * 3 + 1] = Math.random() * 5 - 0.5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 14;
      ph[i] = Math.random() * Math.PI * 2;
    }
    return [pos, ph];
  }, [count]);

  useFrame((state) => {
    if (!pointsRef.current) return;
    const t = state.clock.getElapsedTime();
    const posArray = pointsRef.current.geometry.attributes.position.array;
    for (let i = 0; i < count; i++) {
      posArray[i * 3] += Math.sin(t * 0.4 + phases[i]) * 0.004;
      posArray[i * 3 + 1] += Math.cos(t * 0.6 + phases[i]) * 0.002;
      posArray[i * 3 + 2] += Math.sin(t * 0.35 + phases[i] * 1.5) * 0.004;
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    pointsRef.current.material.size = 0.06 + Math.sin(t * 1.8) * 0.025;
    pointsRef.current.material.opacity = 0.5 + Math.sin(t * 1.2) * 0.3;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        color="#aaffaa"
        transparent
        opacity={0.6}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

// --- Floating Holographic Data Orbit ---
function FloatingDataOrbit() {
  const groupRef = useRef();
  const ring1Ref = useRef();
  const ring2Ref = useRef();

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();
    groupRef.current.rotation.y = t * 0.25;
    groupRef.current.position.y = 1.2 + Math.sin(t * 0.6) * 0.15;
    if (ring1Ref.current) ring1Ref.current.rotation.z = t * 0.08;
    if (ring2Ref.current) ring2Ref.current.rotation.z = -t * 0.12;
  });

  return (
    <group ref={groupRef}>
      {/* Outer orbit ring */}
      <mesh ref={ring1Ref} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.8, 0.012, 16, 80]} />
        <meshBasicMaterial color="#00ff9f" transparent opacity={0.25} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {/* Inner orbit ring */}
      <mesh ref={ring2Ref} rotation={[Math.PI / 2.3, 0.3, 0]}>
        <torusGeometry args={[2.4, 0.008, 16, 80]} />
        <meshBasicMaterial color="#00ff9f" transparent opacity={0.15} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {/* Data nodes on orbit */}
      {[...Array(12)].map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(angle) * 2.8, 0, Math.sin(angle) * 2.8]}>
            <sphereGeometry args={[0.03, 6, 6]} />
            <meshBasicMaterial color="#00ff9f" transparent opacity={0.6} />
          </mesh>
        );
      })}
    </group>
  );
}

// --- Holographic Projection Base ---
function HolographicBase() {
  const ringRef = useRef();
  
  useFrame((state) => {
    if (!ringRef.current) return;
    const t = state.clock.getElapsedTime();
    ringRef.current.rotation.z = t * 1.5;
    ringRef.current.scale.x = 1 + Math.sin(t * 2) * 0.05;
    ringRef.current.scale.y = 1 + Math.sin(t * 2) * 0.05;
  });

  return (
    <group position={[0, 0.05, 0]}>
      {/* Outer Glow Ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.2, 1.4, 64]} />
        <meshBasicMaterial color="#00ff88" transparent opacity={0.15} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
      </mesh>
      {/* Rotating Scanning Ring */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.3, 1.32, 64]} />
        <meshBasicMaterial color="#00ff88" transparent opacity={0.6} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
      </mesh>
      {/* Center Floor Glow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.2, 64]} />
        <meshBasicMaterial color="#00ff88" transparent opacity={0.03} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

// --- Ground Plane with Grid ---
function GroundPlane() {
  return (
    <group>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.6, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshPhysicalMaterial
          color="#0a1a14"
          roughness={0.9}
          metalness={0.1}
          transparent
          opacity={0.8}
        />
      </mesh>
      <gridHelper args={[20, 30, '#003322', '#001a11']} position={[0, -1.58, 0]} />
    </group>
  );
}

// --- Premium SaaS Analytical Plant with Wind Sway ---
function PremiumTechPlant({ targetHealth, rainfall = 0, temperature = 25 }) {
  const groupRef = useRef();
  const leavesRef = useRef([]);
  
  // High-tech analytical colors
  const coreColor = '#00ff9f'; // Neon green accent
  const baseColor = '#0b1f1a'; 

  // Scale map - smooth growth animation
  const targetScale = 0.5 + (targetHealth * 1.0);

  // Wind intensity based on conditions
  const windIntensity = 0.03 + (rainfall / 500) * 0.08;

  useFrame((state) => {
    if (!groupRef.current) return;
    const time = state.clock.getElapsedTime();
    
    // Smooth, professional easing interpolation (growth animation)
    groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.02);

    // Subtle analytical hovering rotation
    groupRef.current.position.y = -1 + Math.sin(time * 0.8) * 0.08;
    groupRef.current.rotation.y = time * 0.15; 

    // Wind sway on the whole plant
    groupRef.current.rotation.z = Math.sin(time * 1.2) * windIntensity;
    groupRef.current.rotation.x = Math.cos(time * 0.9) * windIntensity * 0.5;
  });

  // Leaf sway animation
  const LeafGroup = ({ index, height, rotationY }) => {
    const leafRef = useRef();
    const droopZ = Math.PI / 3;

    useFrame((state) => {
      if (!leafRef.current) return;
      const time = state.clock.getElapsedTime();
      // Individual leaf sway with phase offset
      const phase = index * 1.2;
      leafRef.current.rotation.z = droopZ + Math.sin(time * 1.5 + phase) * windIntensity * 2;
      leafRef.current.rotation.x = Math.cos(time * 1.1 + phase) * windIntensity;
    });

    return (
      <group ref={leafRef} position={[0, height, 0]} rotation={[0, rotationY, droopZ]}>
        {/* Holographic Wireframe Leaf */}
        <mesh position={[0.8, 0, 0]} castShadow>
          <coneGeometry args={[0.4, 1.6, 3]} />
          <meshPhysicalMaterial 
            color={baseColor} 
            roughness={0.1} 
            metalness={0.8}
            wireframe={false}
            transparent
            opacity={0.8}
            side={THREE.DoubleSide}
            emissive="#00ff9f"
            emissiveIntensity={0.15}
          />
        </mesh>
        {/* Outline Glow */}
        <lineSegments position={[0.8, 0, 0]}>
          <edgesGeometry args={[new THREE.ConeGeometry(0.4, 1.6, 3)]} />
          <lineBasicMaterial color={coreColor} transparent opacity={0.8} />
        </lineSegments>
      </group>
    );
  };

  return (
    <group ref={groupRef} position={[0, -1, 0]}>
      
      {/* High-Tech Hexagonal Base */}
      <mesh receiveShadow position={[0, -0.2, 0]}>
        <cylinderGeometry args={[1.5, 1.2, 0.4, 6]} />
        <meshPhysicalMaterial 
          color={baseColor} 
          roughness={0.2} 
          metalness={0.9} 
          clearcoat={0.5}
        />
      </mesh>
      
      {/* Base Glowing Rings */}
      <mesh position={[0, 0.05, 0]}>
        <torusGeometry args={[1.2, 0.02, 16, 6]} />
        <meshBasicMaterial color={coreColor} transparent opacity={0.7} />
      </mesh>

      {/* Outer Glow Ring - pulsing */}
      <GlowRing />

      {/* Abstract Glowing Stem */}
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.1, 0.2, 3.0, 6]} />
        <meshPhysicalMaterial 
          color={baseColor} 
          metalness={1} 
          roughness={0} 
          wireframe={true} 
          emissive="#00ff9f" 
          emissiveIntensity={1.5}
        />
      </mesh>
      
      {/* Inner Core Stem */}
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 3.0, 8]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.5} />
      </mesh>

      {/* Minimalist Data Leaves with Individual Wind Sway */}
      {[...Array(6)].map((_, i) => {
        const height = 0.5 + (i * 0.4);
        const rotationY = (i * Math.PI) / 3;
        return <LeafGroup key={i} index={i} height={height} rotationY={rotationY} />;
      })}
    </group>
  );
}

// --- Pulsing Glow Ring ---
function GlowRing() {
  const ringRef = useRef();

  useFrame((state) => {
    if (!ringRef.current) return;
    const t = state.clock.getElapsedTime();
    ringRef.current.material.opacity = 0.3 + Math.sin(t * 2) * 0.15;
    ringRef.current.scale.setScalar(1 + Math.sin(t * 1.5) * 0.05);
  });

  return (
    <mesh ref={ringRef} position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[1.3, 1.6, 6]} />
      <meshBasicMaterial
        color="#00ff9f"
        transparent
        opacity={0.3}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

export default function Scene3D({ targetHealth, isDarkMode, rainfall = 0, temperature = 25, humidity = 50 }) {
  // Lighting matches UI theme precisely
  const bgColor = isDarkMode ? '#071511' : '#f4faeb'; 

  // Temperature-based warm light
  const warmLightIntensity = Math.max(0, (temperature - 25) / 15) * 2.5;
  const warmLightColor = temperature > 30 ? '#ff8844' : '#ffcc88';

  // Rain intensity normalized 0-1
  const rainIntensity = Math.min(1, Math.max(0, (rainfall - 100) / 400));

  return (
    <Canvas shadows camera={{ position: [0, 2, 6], fov: 45 }} gl={{ antialias: true }}>
      <color attach="background" args={[bgColor]} />
      <fog attach="fog" args={[bgColor, 5, 20]} />
      
      <OrbitControls enableZoom={true} enablePan={false} maxPolarAngle={Math.PI / 1.8} minPolarAngle={Math.PI / 3} autoRotate autoRotateSpeed={0.5} />

      {/* Soft Fill Light */}
      <ambientLight intensity={isDarkMode ? 0.3 : 1.0} color="#aaddff" />
      
      {/* Sharp Key Light projecting analytical shadows */}
      <directionalLight 
        position={[4, 8, 4]} 
        intensity={2.0} 
        color="#00ff9f" 
        castShadow 
        shadow-mapSize={[2048, 2048]}
      />

      {/* Temperature-reactive warm light */}
      {warmLightIntensity > 0.1 && (
        <pointLight
          position={[0, 5, 0]}
          intensity={warmLightIntensity}
          color={warmLightColor}
          distance={15}
          decay={2}
        />
      )}
      
      {/* Subtle Data Particles floating upwards */}
      {isDarkMode && <SubtleParticles />}

      {/* Fireflies - organic glow particles */}
      {isDarkMode && <Fireflies count={35} />}

      {/* Weather: Rain */}
      {isDarkMode && <RainParticles intensity={rainIntensity} />}

      {/* Weather: Humidity Fog */}
      {isDarkMode && <HumidityFog humidity={humidity} />}

      {/* Holographic Projection Base */}
      {isDarkMode && <HolographicBase />}

      {/* Ground */}
      {isDarkMode && <GroundPlane />}
      
      <PremiumTechPlant targetHealth={targetHealth} rainfall={rainfall} temperature={temperature} />

      {/* Floating holographic data orbit */}
      {isDarkMode && <FloatingDataOrbit />}

      {/* Post-processing bloom glow - enhanced */}
      <EffectComposer>
        <Bloom
          luminanceThreshold={0.5}
          luminanceSmoothing={0.85}
          intensity={isDarkMode ? 1.1 : 0.35}
          mipmapBlur
        />
      </EffectComposer>
      
      <Preload all />
    </Canvas>
  );
}
