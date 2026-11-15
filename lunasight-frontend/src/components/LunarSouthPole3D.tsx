import React, { useRef, useEffect, useState, Suspense } from "react";
import { Canvas, useFrame, extend, useThree } from "@react-three/fiber";
import { Html, OrbitControls, Stats } from "@react-three/drei";
import * as THREE from "three";
import proj4 from "proj4";

// Projection for Moon (Polar Stereographic EPSG:104903)
const moonProj = "+proj=stere +lat_0=90 +lon_0=0 +k=1 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs";

// Helper to convert screen click to lunar lat/lon using inverse projection
function screenToLunar(x: number, y: number, width: number, height: number, camera: THREE.Camera) {
  // Normalized device coordinates
  const ndc = new THREE.Vector2((x / width) * 2 - 1, -(y / height) * 2 + 1);
  const vec = new THREE.Vector3(ndc.x, ndc.y, 0.5).unproject(camera);
  // Assume plane at Z=0 (world origin) for intersection
  const dir = vec.sub(camera.position).normalize();
  const distance = -camera.position.z / dir.z;
  const pos = camera.position.clone().add(dir.multiplyScalar(distance));
  // Convert from projected meters to lat/lon using inverse proj4
  const [lon, lat] = proj4(moonProj, "WGS84", [pos.x, pos.y]);
  return { lat, lon };
}

interface Site {
  id: number;
  name: string;
  lat: number;
  lon: number;
}

interface Props {
  onSiteSelect: (site: Site) => void;
}

const LunarSouthPole3D: React.FC<Props> = ({ onSiteSelect }) => {
  const [sites, setSites] = useState<Site[]>([]);
  const [demTexture, setDemTexture] = useState<THREE.Texture | null>(null);
  const [horizonProfile, setHorizonProfile] = useState<any>(null);
  const nextId = useRef(1);
  const { size, gl, camera } = useThree();

  // Load DEM texture (LRO LO LA DEM 100m)
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    // Using a single tile for demonstration; replace with appropriate WMTS URL pattern if needed
    const url = "https://trek.nasa.gov/tiles/Moon/SP/LRO_LOLA_DEM_SouthPole_100m/1.0.0/default/default028mm/14/7535/7535.png";
    loader.load(url, (tex) => {
      tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.minFilter = THREE.LinearFilter;
      setDemTexture(tex);
    });
  }, []);

  // Load horizon profile JSON from public folder
  useEffect(() => {
    fetch("/horizon_profile.json")
      .then((r) => r.json())
      .then(setHorizonProfile)
      .catch((e) => console.error("Failed to load horizon profile", e));
  }, []);

  // Handle click to add site (max 2)
  const handlePointerDown = (e: any) => {
    if (sites.length >= 2) return;
    const { offsetX, offsetY } = e.nativeEvent;
    const { lat, lon } = screenToLunar(offsetX, offsetY, size.width, size.height, camera);
    const newSite: Site = {
      id: nextId.current++,
      name: `Site ${sites.length + 1}`,
      lat,
      lon,
    };
    setSites((prev) => [...prev, newSite]);
    onSiteSelect(newSite);
  };

  const resetSites = () => {
    setSites([]);
    nextId.current = 1;
  };

  // Create displaced plane geometry using DEM texture as height map
  const Plane = () => {
    const ref = useRef<THREE.Mesh>(null!);
    useEffect(() => {
      if (!ref.current || !demTexture) return;
      // Apply displacement using a simple shader material
      const material = new THREE.MeshStandardMaterial({
        map: demTexture,
        displacementMap: demTexture,
        displacementScale: 30000, // increased for more dramatic relief
        color: 0xdddddd,
        side: THREE.DoubleSide,
      });
      ref.current.material = material;
    }, [demTexture]);

    // Plane size roughly matches tile (256x256) at 1m per pixel; adjust for real scale if needed
    return (
      <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} receiveShadow castShadow>
        <planeGeometry args={[256000, 256000, 256, 256]} />
      </mesh>
    );
  };

  // Render HTML markers using Drei's Html component
  const Markers = () => {
    return sites.map((site) => {
      // Convert lat/lon back to projected meters for positioning
      const [x, y] = proj4("WGS84", moonProj, [site.lon, site.lat]);
      return (
        <Html
          key={site.id}
          position={[x, y, 0]}
          center
          distanceFactor={1}
          style={{
            background: "rgba(255,255,255,0.8)",
            padding: "2px 4px",
            borderRadius: "4px",
            fontSize: "12px",
          }}
        >
          {site.name}
        </Html>
      );
    });
  };

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <button
        onClick={resetSites}
        style={{ position: "absolute", top: 10, left: 10, zIndex: 10 }}
      >
        Reset Sites
      </button>
      <Canvas
        camera={{ position: [0, -200000, 200000], fov: 45 }}
        onPointerDown={handlePointerDown}
        shadows
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[100000, 100000, 200000]} intensity={1} castShadow />
        <Suspense fallback={null}>
          {demTexture && <Plane />}
        </Suspense>
        <Markers />
        <OrbitControls enablePan={false} target={[0, 0, 0]} />
        <Stats />
      </Canvas>
    </div>
  );
};

export default LunarSouthPole3D;
