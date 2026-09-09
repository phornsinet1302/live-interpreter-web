// Lightweight autocorrelation-based pitch (fundamental frequency) estimator.
//
// This is NOT a real speaker-embedding model (that needs a trained neural
// net — d-vectors/x-vectors — well beyond what's reasonable to ship
// client-side here). It's a heuristic: two speakers with clearly different
// vocal ranges (e.g. adult male vs. female, adult vs. child) usually get
// distinguished; two similarly-pitched speakers of the same gender may
// still get grouped together. That's an inherent limit of pitch-only
// diarization, not a bug — see speakerDetection.ts for how matches are made
// and how a wrong grouping can be corrected (rename/remove in the UI).
const MIN_VOICE_HZ = 75;
const MAX_VOICE_HZ = 400;
const MIN_RMS = 0.01; // below this, treat the buffer as silence/noise — no reading

export function estimatePitchFromSamples(samples: Float32Array, sampleRate: number): number | null {
  let sumSquares = 0;
  for (let i = 0; i < samples.length; i++) sumSquares += samples[i] * samples[i];
  const rms = Math.sqrt(sumSquares / samples.length);
  if (rms < MIN_RMS) return null;

  const minLag = Math.floor(sampleRate / MAX_VOICE_HZ);
  const maxLag = Math.min(Math.floor(sampleRate / MIN_VOICE_HZ), samples.length - 1);
  if (minLag >= maxLag) return null;

  let bestLag = -1;
  let bestCorrelation = 0;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let correlation = 0;
    for (let i = 0; i < samples.length - lag; i++) {
      correlation += samples[i] * samples[i + lag];
    }
    if (correlation > bestCorrelation) {
      bestCorrelation = correlation;
      bestLag = lag;
    }
  }
  if (bestLag <= 0) return null;
  return sampleRate / bestLag;
}
