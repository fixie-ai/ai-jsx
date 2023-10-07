import { useFrame, useThree } from "@react-three/fiber";
import { Fragment, useEffect, useMemo, useRef } from "react";
import {
  Vector2,
  ShaderMaterial,
  DataTexture,
  RGBAFormat,
  Vector3,
} from "three";

import vertexShader from "./shaders/vertex";
import fragmentShader from "./shaders/fragment";

export class TextureMapper {
  public samplesX: Float32Array;
  public samplesY: Float32Array;
  public maxAmplitude: number = 4.0;
  private readonly M: number = 4;

  constructor(samplesX: Float32Array, samplesY: Float32Array) {
    if (samplesX.length != samplesY.length) {
      throw new Error("sample size mismatch");
    }
    this.samplesX = samplesX;
    this.samplesY = samplesY;
  }

  public updateTextureData(data: Uint8Array): void {
    const B = (1 << 16) - 1;
    let j, x, y;
    for (let i = 0; i < this.samplesX.length; i++) {
      x = Math.max(
        0,
        Math.min(
          2 * this.maxAmplitude,
          0.5 + (0.5 * this.samplesX[i]) / this.maxAmplitude
        )
      );
      y = Math.max(
        0,
        Math.min(
          2 * this.maxAmplitude,
          0.5 + (0.5 * this.samplesY[i]) / this.maxAmplitude
        )
      );

      x = (x * B) | 0;
      y = (y * B) | 0;
      j = i * this.M;
      data[j + 0] = x >> 8;
      data[j + 1] = x & 0xff;
      data[j + 2] = y >> 8;
      data[j + 3] = y & 0xff;
    }
  }

  public generateSupportedTextureAndData() {
    const textureData = new Uint8Array(this.samplesX.length * this.M);
    const tex = new DataTexture(
      textureData,
      this.samplesX.length,
      1,
      RGBAFormat
    );
    return {
      tex: tex,
      textureData: textureData,
    };
  }
}

interface BaseAudioScopeVisualProps {
  textureMapper: TextureMapper;
  nParticles?: number;
  usePoints?: boolean;
  interpolate?: boolean;
  color?: {
    r: number;
    b: number;
    g: number;
    a: number;
  };
}

const BaseScopeVisual = ({
  textureMapper,
  nParticles = 512,
  usePoints = true,
  interpolate = false,
  color = { r: 0, g: 255, b: 0, a: 255 },
}: BaseAudioScopeVisualProps) => {
  const { tex, textureData } = textureMapper.generateSupportedTextureAndData();
  tex.needsUpdate = true;
  const matRef = useRef<ShaderMaterial>(null!);
  const size = useThree((state) => state.size);
  const particlesIndices = useMemo(() => {
    return new Float32Array(nParticles).fill(0).map((_, i) => i);
  }, [nParticles]);
  const particlesPosition = useMemo(() => {
    return new Float32Array(nParticles * 3).fill(0);
  }, [nParticles]);
  const uniforms = useMemo(
    () => ({
      // FRAGMENT
      color: {
        value: new Vector3(color.r, color.g, color.b),
      },
      // VERTEX
      max_amplitude: {
        value: textureMapper.maxAmplitude,
      },
      sample_scale: {
        value: new Vector2(nParticles, 1),
      },
      samples: {
        type: "t",
        value: tex,
      },
      resolution: { value: new Vector2(size.width, size.height) },
      b_should_interpolate: { value: interpolate },
    }),
    [nParticles, textureMapper]
  );

  useFrame(() => {
    // update the texture data
    textureMapper.updateTextureData(textureData);
    tex.needsUpdate = true;
    // update the any changing uniforms
    matRef.current.uniforms.max_amplitude.value = textureMapper.maxAmplitude;
    matRef.current.uniforms.samples.value = tex;
  });

  useEffect(() => {
    if (matRef.current?.uniforms) {
      matRef.current.uniforms.resolution.value.x = size.width;
      matRef.current.uniforms.resolution.value.y = size.height;
    }
  }, [size]);

  useEffect(() => {
    if (matRef.current?.uniforms) {
      matRef.current.uniforms.b_should_interpolate.value = interpolate;
      matRef.current.uniforms.color.value.x = color.r / 255.0;
      matRef.current.uniforms.color.value.y = color.g / 255.0;
      matRef.current.uniforms.color.value.z = color.b / 255.0;
    }
  }, [interpolate, color]);

  useEffect(() => {
    if (matRef.current?.uniforms) {
      matRef.current.uniforms.sample_scale.value.x = nParticles;
      matRef.current.uniforms.sample_scale.value.y = 1;
    }
  }, [nParticles]);

  const internals = (
    <Fragment>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={nParticles}
          array={particlesPosition}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-index"
          count={nParticles}
          array={particlesIndices}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={matRef}
        depthWrite={false}
        fragmentShader={fragmentShader}
        vertexShader={vertexShader}
        uniforms={uniforms}
      />
    </Fragment>
  );
  return usePoints ? <points>{internals}</points> : <line>{internals}</line>;
};

export default BaseScopeVisual;
