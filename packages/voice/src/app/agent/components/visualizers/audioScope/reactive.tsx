import { folder, useControls } from "leva";
import { TextureMapper } from "./base";
import BaseScopeVisual from "./base";

interface ScopeVisualProps {
  textureMapper: TextureMapper;
}
const ScopeVisual = ({ textureMapper }: ScopeVisualProps) => {
  const { usePoints, color } = useControls({
    "Visual - Scope": folder(
      {
        usePoints: true,
        color: { r: 0, b: 0, g: 255, a: 1 },
      },
      { collapsed: true }
    ),
  });
  return (
    <BaseScopeVisual
      textureMapper={textureMapper}
      usePoints={usePoints}
      interpolate={false}
      color={color}
    />
  );
};

export default ScopeVisual;
