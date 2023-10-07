import { MeshReflectorMaterial } from "@react-three/drei";
import { Vector3 } from "three";

interface GroundProps {
  size?: number;
  position: Vector3;
}
const Ground = ({
  size = 250,
  position = new Vector3(0, 0, 0),
  ...props
}: GroundProps) => {
  return (
    <mesh position={position} {...props}>
      <planeGeometry args={[size, size]} />
      <MeshReflectorMaterial
        mirror={1}
        blur={[500, 100]}
        resolution={1024}
        mixBlur={12}
        mixStrength={1.5}
        roughness={1}
        depthScale={1.2}
        minDepthThreshold={0.4}
        maxDepthThreshold={1.4}
      />
    </mesh>
  );
};

export default Ground;
