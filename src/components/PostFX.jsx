/**
 * PostFX — cinematic post-processing pipeline.
 *
 * Uses multisampling=0 for maximum GPU compatibility.
 * Renderer toneMapping must be NoToneMapping so we handle it here.
 */

import { EffectComposer, Bloom, Vignette, ToneMapping } from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode } from 'postprocessing';

export function PostFX() {
  return (
    <EffectComposer multisampling={0}>
      <Bloom
        intensity={1.5}
        luminanceThreshold={0.2}
        luminanceSmoothing={0.4}
        mipmapBlur
      />

      <Vignette
        offset={0.3}
        darkness={0.5}
        blendFunction={BlendFunction.NORMAL}
      />

      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}
