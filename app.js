"use strict";

const dom = {
  previewColumn: document.querySelector(".preview-column"),
  stage: document.getElementById("stage"),
  previewCanvas: document.getElementById("previewCanvas"),
  status: document.getElementById("status"),
  preset: document.getElementById("preset"),
  aspect: document.getElementById("aspect"),
  customAspectRow: document.getElementById("customAspectRow"),
  aspectW: document.getElementById("aspectW"),
  aspectH: document.getElementById("aspectH"),
  longEdge: document.getElementById("longEdge"),
  displaySize: document.getElementById("displaySize"),
  stageWidth: document.getElementById("stageWidth"),
  stageHeight: document.getElementById("stageHeight"),
  exportScale: document.getElementById("exportScale"),
  seed: document.getElementById("seed"),
  flow: document.getElementById("flow"),
  direction: document.getElementById("direction"),
  swirl: document.getElementById("swirl"),
  turbulence: document.getElementById("turbulence"),
  viscosity: document.getElementById("viscosity"),
  scale: document.getElementById("scale"),
  detail: document.getElementById("detail"),
  evolveSpeed: document.getElementById("evolveSpeed"),
  contrast: document.getElementById("contrast"),
  softness: document.getElementById("softness"),
  dominance: document.getElementById("dominance"),
  grain: document.getElementById("grain"),
  paperTone: document.getElementById("paperTone"),
  symmetry: document.getElementById("symmetry"),
  invert: document.getElementById("invert"),
  liveEvolve: document.getElementById("liveEvolve"),
  regenBtn: document.getElementById("regenBtn"),
  randomSeedBtn: document.getElementById("randomSeedBtn"),
  downloadBtn: document.getElementById("downloadBtn")
};

const previewCtx = dom.previewCanvas.getContext("2d", { alpha: false, desynchronized: true });
const bufferCanvas = document.createElement("canvas");
const bufferCtx = bufferCanvas.getContext("2d", { alpha: false });
const gpuCanvas = document.createElement("canvas");

const RENDER_MODE = {
  INTERACTIVE: "interactive",
  FULL: "full"
};

const MIN_INTERACTIVE_BUDGET = 90000;
const MAX_INTERACTIVE_BUDGET = 520000;
const INTERACTION_WINDOW_MS = 220;
const LIVE_TARGET_FPS = 30;

const PRESETS = {
  calm: {
    flow: 0.54,
    direction: 18,
    swirl: 0.8,
    turbulence: 0.38,
    viscosity: 0.68,
    scale: 2.35,
    detail: 4,
    contrast: 1.05,
    softness: 0.12,
    dominance: 0.04,
    grain: 0.03,
    symmetry: "none",
    invert: false
  },
  storm: {
    flow: 1.45,
    direction: 72,
    swirl: 2.22,
    turbulence: 1.4,
    viscosity: 0.16,
    scale: 4.25,
    detail: 6,
    contrast: 1.88,
    softness: 0.05,
    dominance: 0.24,
    grain: 0.07,
    symmetry: "vertical",
    invert: false
  },
  silk: {
    flow: 0.92,
    direction: 130,
    swirl: 1.35,
    turbulence: 0.56,
    viscosity: 0.58,
    scale: 1.8,
    detail: 5,
    contrast: 1.2,
    softness: 0.1,
    dominance: -0.08,
    grain: 0.018,
    symmetry: "none",
    invert: false
  },
  hard: {
    flow: 1.18,
    direction: 240,
    swirl: 1.5,
    turbulence: 0.93,
    viscosity: 0.3,
    scale: 3.3,
    detail: 5,
    contrast: 2.5,
    softness: 0.03,
    dominance: 0.28,
    grain: 0.06,
    symmetry: "radial",
    invert: false
  },
  drift: {
    flow: 0.47,
    direction: 310,
    swirl: 0.62,
    turbulence: 0.22,
    viscosity: 0.82,
    scale: 1.36,
    detail: 3,
    contrast: 0.92,
    softness: 0.17,
    dominance: -0.04,
    grain: 0.01,
    symmetry: "none",
    invert: false
  },
  vein: {
    flow: 0.98,
    direction: 262,
    swirl: 1.42,
    turbulence: 0.52,
    viscosity: 0.46,
    scale: 3.84,
    detail: 6,
    contrast: 1.68,
    softness: 0.045,
    dominance: 0.12,
    grain: 0.036,
    symmetry: "vertical",
    invert: false
  },
  riptide: {
    flow: 1.66,
    direction: 158,
    swirl: 2.5,
    turbulence: 1.6,
    viscosity: 0.12,
    scale: 4.56,
    detail: 6,
    contrast: 1.74,
    softness: 0.05,
    dominance: 0.18,
    grain: 0.08,
    symmetry: "none",
    invert: false
  },
  fog: {
    flow: 0.36,
    direction: 92,
    swirl: 0.56,
    turbulence: 0.14,
    viscosity: 0.9,
    scale: 1.12,
    detail: 3,
    contrast: 0.78,
    softness: 0.22,
    dominance: -0.38,
    grain: 0.008,
    symmetry: "horizontal",
    invert: false
  },
  obsidian: {
    flow: 1.04,
    direction: 196,
    swirl: 0.96,
    turbulence: 0.44,
    viscosity: 0.6,
    scale: 2.62,
    detail: 5,
    contrast: 2.2,
    softness: 0.026,
    dominance: 0.56,
    grain: 0.028,
    symmetry: "none",
    invert: false
  },
  zebra: {
    flow: 1.2,
    direction: 14,
    swirl: 1.86,
    turbulence: 0.78,
    viscosity: 0.24,
    scale: 4.88,
    detail: 7,
    contrast: 2.7,
    softness: 0.02,
    dominance: 0.06,
    grain: 0.05,
    symmetry: "vertical",
    invert: false
  },
  rorschach: {
    flow: 0.86,
    direction: 278,
    swirl: 1.28,
    turbulence: 0.64,
    viscosity: 0.5,
    scale: 2.94,
    detail: 5,
    contrast: 1.62,
    softness: 0.06,
    dominance: 0,
    grain: 0.032,
    symmetry: "both",
    invert: false
  },
  echo: {
    flow: 0.78,
    direction: 40,
    swirl: 1.08,
    turbulence: 0.41,
    viscosity: 0.64,
    scale: 2.12,
    detail: 4,
    contrast: 1.18,
    softness: 0.115,
    dominance: -0.12,
    grain: 0.016,
    symmetry: "none",
    invert: false
  },
  dune: {
    flow: 1.12,
    direction: 332,
    swirl: 0.72,
    turbulence: 0.36,
    viscosity: 0.72,
    scale: 1.62,
    detail: 4,
    contrast: 1.34,
    softness: 0.14,
    dominance: 0.08,
    grain: 0.022,
    symmetry: "horizontal",
    invert: false
  },
  pulse: {
    flow: 1.34,
    direction: 226,
    swirl: 2.02,
    turbulence: 0.92,
    viscosity: 0.28,
    scale: 3.72,
    detail: 6,
    contrast: 2.12,
    softness: 0.032,
    dominance: -0.06,
    grain: 0.074,
    symmetry: "radial",
    invert: false
  },
  sumi_ash_veins: {
    flow: 0.74,
    direction: 18,
    swirl: 1.22,
    turbulence: 0.42,
    viscosity: 0.66,
    scale: 2.22,
    detail: 6,
    contrast: 1.62,
    softness: 0.07,
    dominance: -0.08,
    grain: 0.07,
    symmetry: "none",
    invert: false,
    paperTone: "light"
  },
  sumi_gilded_current: {
    flow: 0.92,
    direction: 32,
    swirl: 1.04,
    turbulence: 0.36,
    viscosity: 0.72,
    scale: 1.9,
    detail: 5,
    contrast: 1.35,
    softness: 0.11,
    dominance: 0.2,
    grain: 0.09,
    symmetry: "horizontal",
    invert: false,
    paperTone: "dark"
  },
  sumi_monolith: {
    flow: 1.02,
    direction: 248,
    swirl: 1.6,
    turbulence: 0.58,
    viscosity: 0.48,
    scale: 2.6,
    detail: 6,
    contrast: 1.58,
    softness: 0.06,
    dominance: 0.12,
    grain: 0.035,
    symmetry: "none",
    invert: false,
    paperTone: "light"
  },
  sumi_abyssal_flow: {
    flow: 0.62,
    direction: 210,
    swirl: 0.88,
    turbulence: 0.24,
    viscosity: 0.84,
    scale: 1.52,
    detail: 4,
    contrast: 1.28,
    softness: 0.15,
    dominance: 0.28,
    grain: 0.02,
    symmetry: "none",
    invert: false,
    paperTone: "dark"
  },
  sumi_ink_flame: {
    flow: 1.1,
    direction: 20,
    swirl: 1.85,
    turbulence: 0.55,
    viscosity: 0.4,
    scale: 2.7,
    detail: 6,
    contrast: 1.44,
    softness: 0.075,
    dominance: -0.14,
    grain: 0.028,
    symmetry: "none",
    invert: false,
    paperTone: "light"
  },
  sumi_silver_strata: {
    flow: 0.68,
    direction: 338,
    swirl: 0.92,
    turbulence: 0.31,
    viscosity: 0.78,
    scale: 2.05,
    detail: 5,
    contrast: 1.18,
    softness: 0.13,
    dominance: -0.03,
    grain: 0.014,
    symmetry: "horizontal",
    invert: false,
    paperTone: "light"
  },
  sumi_void_rift: {
    flow: 1.26,
    direction: 296,
    swirl: 1.32,
    turbulence: 0.44,
    viscosity: 0.64,
    scale: 2.35,
    detail: 5,
    contrast: 1.72,
    softness: 0.09,
    dominance: 0.34,
    grain: 0.02,
    symmetry: "none",
    invert: false,
    paperTone: "dark"
  },
  sumi_stardust: {
    flow: 0.88,
    direction: 58,
    swirl: 1.46,
    turbulence: 0.64,
    viscosity: 0.52,
    scale: 3.1,
    detail: 6,
    contrast: 1.86,
    softness: 0.055,
    dominance: 0.21,
    grain: 0.11,
    symmetry: "none",
    invert: false,
    paperTone: "dark"
  }
};

const rangeInputs = Array.from(document.querySelectorAll('input[type="range"]'));
const numberInputs = [dom.seed, dom.aspectW, dom.aspectH];

const sliderValueFormatters = {
  longEdge: (v) => `${Math.round(v)} px`,
  displaySize: (v) => `${Math.round(v)} px`,
  stageWidth: (v) => `${Math.round(v)} px`,
  stageHeight: (v) => `${Math.round(v)} px`,
  exportScale: (v) => `${Math.round(v)}x`,
  flow: (v) => v.toFixed(2),
  direction: (v) => `${Math.round(v)} deg`,
  swirl: (v) => v.toFixed(2),
  turbulence: (v) => v.toFixed(2),
  viscosity: (v) => v.toFixed(2),
  scale: (v) => v.toFixed(2),
  detail: (v) => `${Math.round(v)}`,
  evolveSpeed: (v) => v.toFixed(2),
  contrast: (v) => `x${v.toFixed(2)}`,
  softness: (v) => v.toFixed(3),
  dominance: (v) => v.toFixed(2),
  grain: (v) => v.toFixed(3)
};

const previewBuffers = {
  width: 0,
  height: 0,
  field: null,
  temp: null,
  imageData: null
};

const gpu = {
  available: false,
  gl: null,
  program: null,
  quad: null,
  uniforms: {}
};

let settings = null;
let evolutionTime = 0;
let animationId = 0;
let renderRafId = 0;
let isRendering = false;
let pendingMode = null;
let idleFullTimer = 0;
let lastLiveTickTs = 0;
let lastInteractionTs = 0;
let lastRenderMs = 0;
let smoothedFps = 0;
let interactivePixelBudget = 220000;

const GPU_VERTEX_SHADER = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const GPU_FRAGMENT_SHADER = `
precision highp float;
varying vec2 vUv;

uniform vec2 uResolution;
uniform float uTime;
uniform float uSeed;
uniform float uFlow;
uniform float uDirection;
uniform float uSwirl;
uniform float uTurbulence;
uniform float uViscosity;
uniform float uScale;
uniform float uDetail;
uniform float uContrast;
uniform float uSoftness;
uniform float uDominance;
uniform float uGrain;
uniform float uSymmetry;
uniform float uInvert;
uniform float uPaperDark;

float hash2i(vec2 p, float s) {
  return fract(sin(dot(p + vec2(17.13, 73.71), vec2(127.1, 311.7)) + s * 0.137) * 43758.5453123);
}

float valueNoise(vec2 p, float s) {
  vec2 i = floor(p);
  vec2 f = fract(p);

  float v00 = hash2i(i + vec2(0.0, 0.0), s);
  float v10 = hash2i(i + vec2(1.0, 0.0), s);
  float v01 = hash2i(i + vec2(0.0, 1.0), s);
  float v11 = hash2i(i + vec2(1.0, 1.0), s);

  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = mix(v00, v10, u.x);
  float b = mix(v01, v11, u.x);
  return mix(a, b, u.y);
}

float fbm(vec2 p, float octaves, float s) {
  float value = 0.0;
  float amp = 0.5;
  float freq = 1.0;
  float total = 0.0;

  for (int i = 0; i < 8; i++) {
    if (float(i) >= octaves) {
      break;
    }
    value += amp * valueNoise(p * freq, s + float(i) * 911.0);
    total += amp;
    freq *= 2.03;
    amp *= 0.5;
  }

  return value / max(total, 0.0001);
}

vec2 applySymmetry(vec2 p) {
  if (uSymmetry > 0.5 && uSymmetry < 1.5) {
    p.y = abs(p.y);
  } else if (uSymmetry > 1.5 && uSymmetry < 2.5) {
    p.x = abs(p.x);
  } else if (uSymmetry > 2.5 && uSymmetry < 3.5) {
    p = abs(p);
  } else if (uSymmetry > 3.5) {
    float r = length(p);
    float a = atan(p.y, p.x);
    float sector = 3.14159265 / 4.0;
    a = mod(a + sector, sector);
    a = min(a, sector - a);
    p = vec2(cos(a), sin(a)) * r;
  }
  return p;
}

float sampleField(vec2 p) {
  float x = p.x;
  float y = p.y;
  float directionRad = radians(uDirection);
  float damping = 1.0 - uViscosity * 0.35;
  float octaves = max(2.0, uDetail);
  float secondaryOctaves = max(2.0, uDetail - 1.0);

  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float f = uScale * (0.72 + fi * 0.72);
    float n1 = fbm(
      vec2(
        x * f + 19.17 + uSeed * 0.001 + uTime * 0.31,
        y * f - 11.03 + uTime * 0.07
      ),
      secondaryOctaves,
      uSeed + 73.0 * fi
    );
    float n2 = fbm(
      vec2(
        x * f - 7.93 - uTime * 0.06,
        y * f + 23.41 + uSeed * 0.001
      ),
      secondaryOctaves,
      uSeed + 149.0 * fi
    );

    float bend = (n1 - 0.5) * uSwirl * 6.283185307;
    float fx = cos(directionRad + bend);
    float fy = sin(directionRad + bend);

    x += (fx * uFlow + (n2 - 0.5) * uTurbulence * 2.0) * 0.17 * damping;
    y += (fy * uFlow + (n1 - 0.5) * uTurbulence * 2.0) * 0.17 * damping;
  }

  float base = fbm(
    vec2(
      x * uScale + uTime * 0.11,
      y * uScale - uTime * 0.08
    ),
    octaves,
    uSeed + 991.0
  );
  float stripe = fbm(
    vec2(
      x * uScale * 1.85 - 5.1,
      y * uScale * 1.85 + 8.7 + uTime * 0.05
    ),
    secondaryOctaves,
    uSeed + 1831.0
  );
  float ridge = 1.0 - abs(2.0 * stripe - 1.0);
  float wave = sin((x * 1.18 + y * 0.94 + uTime * 0.9) * 3.14159265);

  float value = base * 0.66 + ridge * 0.34;
  value += wave * 0.08 * uSwirl;
  return clamp(value, 0.0, 1.0);
}

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float ratio = uResolution.x / max(uResolution.y, 1.0);
  if (ratio >= 1.0) {
    p.x *= ratio;
  } else {
    p.y /= ratio;
  }
  p = applySymmetry(p);

  float v = sampleField(p);
  v = clamp((v - 0.5) * uContrast + 0.5, 0.0, 1.0);

  float threshold = 0.5 + uDominance * 0.33;
  float soft = max(uSoftness, 0.001);
  float tone = smoothstep(threshold - soft, threshold + soft, v);

  if (uPaperDark > 0.5) {
    tone = 1.0 - tone;
  }
  if (uInvert > 0.5) {
    tone = 1.0 - tone;
  }
  if (uGrain > 0.0) {
    float g = hash2i(gl_FragCoord.xy, uSeed + 4093.0) - 0.5;
    tone = clamp(tone + g * uGrain, 0.0, 1.0);
  }

  gl_FragColor = vec4(vec3(tone), 1.0);
}
`;

function parseNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function fade(t) {
  return t * t * (3 - 2 * t);
}

function hash2i(x, y, seed) {
  let h = Math.imul(x, 0x1f123bb5) ^ Math.imul(y, 0x5f356495) ^ Math.imul(seed, 0x6c8e9cf5);
  h ^= h >>> 13;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}

function valueNoise(x, y, seed) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const tx = x - xi;
  const ty = y - yi;

  const v00 = hash2i(xi, yi, seed);
  const v10 = hash2i(xi + 1, yi, seed);
  const v01 = hash2i(xi, yi + 1, seed);
  const v11 = hash2i(xi + 1, yi + 1, seed);

  const ux = fade(tx);
  const uy = fade(ty);
  const a = lerp(v00, v10, ux);
  const b = lerp(v01, v11, ux);
  return lerp(a, b, uy);
}

function fbm(x, y, octaves, seed) {
  let value = 0;
  let amp = 0.5;
  let freq = 1;
  let ampTotal = 0;

  for (let i = 0; i < octaves; i += 1) {
    value += amp * valueNoise(x * freq, y * freq, seed + i * 911);
    ampTotal += amp;
    freq *= 2.03;
    amp *= 0.5;
  }

  return value / ampTotal;
}

function readSettings() {
  return {
    preset: dom.preset.value,
    aspect: dom.aspect.value,
    aspectW: clamp(parseNumber(dom.aspectW.value, 3), 1, 64),
    aspectH: clamp(parseNumber(dom.aspectH.value, 4), 1, 64),
    longEdge: clamp(parseNumber(dom.longEdge.value, 720), 320, 1600),
    displaySize: clamp(parseNumber(dom.displaySize.value, 420), 220, 780),
    stageWidth: clamp(parseNumber(dom.stageWidth.value, 560), 340, 920),
    stageHeight: clamp(parseNumber(dom.stageHeight.value, 560), 340, 920),
    exportScale: clamp(parseNumber(dom.exportScale.value, 2), 1, 4),
    seed: Math.floor(clamp(parseNumber(dom.seed.value, 144221), 1, 999999999)),
    flow: clamp(parseNumber(dom.flow.value, 0.82), 0, 2),
    direction: clamp(parseNumber(dom.direction.value, 38), 0, 360),
    swirl: clamp(parseNumber(dom.swirl.value, 1.24), 0, 3),
    turbulence: clamp(parseNumber(dom.turbulence.value, 0.68), 0, 2),
    viscosity: clamp(parseNumber(dom.viscosity.value, 0.44), 0, 1),
    scale: clamp(parseNumber(dom.scale.value, 2.85), 0.8, 6),
    detail: Math.round(clamp(parseNumber(dom.detail.value, 5), 2, 7)),
    evolveSpeed: clamp(parseNumber(dom.evolveSpeed.value, 0.42), 0, 2),
    contrast: clamp(parseNumber(dom.contrast.value, 1.42), 0.3, 3),
    softness: clamp(parseNumber(dom.softness.value, 0.08), 0.005, 0.25),
    dominance: clamp(parseNumber(dom.dominance.value, 0.12), -1, 1),
    grain: clamp(parseNumber(dom.grain.value, 0.045), 0, 0.22),
    paperTone: dom.paperTone.value,
    symmetry: dom.symmetry.value,
    invert: dom.invert.checked,
    liveEvolve: dom.liveEvolve.checked
  };
}

function getAspectRatio(currentSettings) {
  if (currentSettings.aspect === "custom") {
    return currentSettings.aspectW / currentSettings.aspectH;
  }

  const parts = currentSettings.aspect.split(":");
  if (parts.length !== 2) {
    return 1;
  }

  const w = parseNumber(parts[0], 1);
  const h = parseNumber(parts[1], 1);
  return h > 0 ? w / h : 1;
}

function computeRenderSize(currentSettings, mode) {
  const ratio = getAspectRatio(currentSettings);
  const base = ratio >= 1
    ? {
        width: Math.round(currentSettings.longEdge),
        height: Math.max(8, Math.round(currentSettings.longEdge / ratio))
      }
    : {
        width: Math.max(8, Math.round(currentSettings.longEdge * ratio)),
        height: Math.round(currentSettings.longEdge)
      };

  if (mode !== RENDER_MODE.INTERACTIVE) {
    return base;
  }

  const pixels = base.width * base.height;
  if (pixels <= interactivePixelBudget) {
    return base;
  }

  const scale = Math.sqrt(interactivePixelBudget / pixels);
  return {
    width: Math.max(96, Math.round(base.width * scale)),
    height: Math.max(96, Math.round(base.height * scale))
  };
}

function computePreviewDrawSize(currentSettings, fullWidth, fullHeight) {
  const ratio = fullWidth / fullHeight;
  const maxDimension = currentSettings.displaySize;
  let width;
  let height;

  if (ratio >= 1) {
    width = maxDimension;
    height = Math.round(maxDimension / ratio);
  } else {
    width = Math.round(maxDimension * ratio);
    height = maxDimension;
  }

  const fitScale = Math.min(
    1,
    (currentSettings.stageWidth - 24) / width,
    (currentSettings.stageHeight - 24) / height
  );

  return {
    width: Math.max(1, Math.round(width * fitScale)),
    height: Math.max(1, Math.round(height * fitScale))
  };
}

function applyLayout(currentSettings, fullWidth, fullHeight) {
  const columnWidth = dom.previewColumn.clientWidth;
  const stageWidth = Math.min(currentSettings.stageWidth, Math.max(280, columnWidth - 24));
  const stageHeight = currentSettings.stageHeight;
  dom.stage.style.width = `${stageWidth}px`;
  dom.stage.style.height = `${stageHeight}px`;

  const drawSize = computePreviewDrawSize({ ...currentSettings, stageWidth, stageHeight }, fullWidth, fullHeight);
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));

  dom.previewCanvas.width = Math.max(1, Math.round(drawSize.width * dpr));
  dom.previewCanvas.height = Math.max(1, Math.round(drawSize.height * dpr));
  dom.previewCanvas.style.width = `${drawSize.width}px`;
  dom.previewCanvas.style.height = `${drawSize.height}px`;
  dom.previewCanvas.style.backgroundColor = currentSettings.paperTone === "dark" ? "#000000" : "#ffffff";
}

function setSliderOutputValues() {
  for (const input of rangeInputs) {
    const output = document.getElementById(`${input.id}Value`);
    if (!output) {
      continue;
    }
    const numericValue = parseNumber(input.value, 0);
    const formatter = sliderValueFormatters[input.id];
    output.textContent = formatter ? formatter(numericValue) : String(numericValue);
  }
}

function updateCustomAspectVisibility() {
  dom.customAspectRow.classList.toggle("hidden", dom.aspect.value !== "custom");
}

function applyPreset(name) {
  const preset = PRESETS[name];
  if (!preset) {
    return;
  }

  dom.flow.value = String(preset.flow);
  dom.direction.value = String(preset.direction);
  dom.swirl.value = String(preset.swirl);
  dom.turbulence.value = String(preset.turbulence);
  dom.viscosity.value = String(preset.viscosity);
  dom.scale.value = String(preset.scale);
  dom.detail.value = String(preset.detail);
  dom.contrast.value = String(preset.contrast);
  dom.softness.value = String(preset.softness);
  dom.dominance.value = String(preset.dominance);
  dom.grain.value = String(preset.grain);
  if (preset.paperTone) {
    dom.paperTone.value = preset.paperTone;
  }
  dom.symmetry.value = preset.symmetry;
  dom.invert.checked = Boolean(preset.invert);
  setSliderOutputValues();
}

function ensureBuffers(width, height, bufferSet) {
  if (bufferSet.width === width && bufferSet.height === height && bufferSet.field && bufferSet.temp && bufferSet.imageData) {
    return bufferSet;
  }

  bufferSet.width = width;
  bufferSet.height = height;
  bufferSet.field = new Float32Array(width * height);
  bufferSet.temp = new Float32Array(width * height);
  bufferSet.imageData = new ImageData(width, height);
  return bufferSet;
}

function sampleField(nx, ny, currentSettings, time) {
  let x = nx;
  let y = ny;
  const directionRad = (currentSettings.direction * Math.PI) / 180;
  const damping = 1 - currentSettings.viscosity * 0.35;
  const octaves = Math.max(2, currentSettings.detail);
  const secondaryOctaves = Math.max(2, currentSettings.detail - 1);

  for (let i = 0; i < 3; i += 1) {
    const f = currentSettings.scale * (0.72 + i * 0.72);
    const n1 = fbm(
      x * f + 19.17 + currentSettings.seed * 0.001 + time * 0.31,
      y * f - 11.03 + time * 0.07,
      secondaryOctaves,
      currentSettings.seed + 73 * i
    );
    const n2 = fbm(
      x * f - 7.93 - time * 0.06,
      y * f + 23.41 + currentSettings.seed * 0.001,
      secondaryOctaves,
      currentSettings.seed + 149 * i
    );

    const bend = (n1 - 0.5) * currentSettings.swirl * Math.PI * 2;
    const fx = Math.cos(directionRad + bend);
    const fy = Math.sin(directionRad + bend);

    x += (fx * currentSettings.flow + (n2 - 0.5) * currentSettings.turbulence * 2) * 0.17 * damping;
    y += (fy * currentSettings.flow + (n1 - 0.5) * currentSettings.turbulence * 2) * 0.17 * damping;
  }

  const base = fbm(
    x * currentSettings.scale + time * 0.11,
    y * currentSettings.scale - time * 0.08,
    octaves,
    currentSettings.seed + 991
  );
  const stripe = fbm(
    x * currentSettings.scale * 1.85 - 5.1,
    y * currentSettings.scale * 1.85 + 8.7 + time * 0.05,
    secondaryOctaves,
    currentSettings.seed + 1831
  );
  const ridge = 1 - Math.abs(2 * stripe - 1);

  let value = base * 0.66 + ridge * 0.34;
  const wave = Math.sin((x * 1.18 + y * 0.94 + time * 0.9) * Math.PI);
  value += wave * 0.08 * currentSettings.swirl;
  return clamp(value, 0, 1);
}

function blurPass(field, temp, width, height) {
  for (let y = 0; y < height; y += 1) {
    const row = y * width;
    for (let x = 0; x < width; x += 1) {
      const left = row + (x > 0 ? x - 1 : x);
      const center = row + x;
      const right = row + (x < width - 1 ? x + 1 : x);
      temp[center] = (field[left] + field[center] + field[right]) / 3;
    }
  }

  for (let y = 0; y < height; y += 1) {
    const row = y * width;
    const up = (y > 0 ? y - 1 : y) * width;
    const down = (y < height - 1 ? y + 1 : y) * width;
    for (let x = 0; x < width; x += 1) {
      field[row + x] = (temp[up + x] + temp[row + x] + temp[down + x]) / 3;
    }
  }
}

function renderFluid(targetCanvas, targetCtx, width, height, currentSettings, time, bufferSet) {
  if (targetCanvas.width !== width) {
    targetCanvas.width = width;
  }
  if (targetCanvas.height !== height) {
    targetCanvas.height = height;
  }

  const buffers = ensureBuffers(width, height, bufferSet || { width: 0, height: 0 });
  const field = buffers.field;
  const temp = buffers.temp;
  const imageData = buffers.imageData;
  const data = imageData.data;
  const invW = width > 1 ? 1 / (width - 1) : 1;
  const invH = height > 1 ? 1 / (height - 1) : 1;
  const ratio = width / height;
  const symmetryMode = currentSettings.symmetry;

  for (let y = 0; y < height; y += 1) {
    const ny = y * invH * 2 - 1;
    for (let x = 0; x < width; x += 1) {
      const nx = x * invW * 2 - 1;

      let px = nx;
      let py = ny;
      if (ratio >= 1) {
        px *= ratio;
      } else {
        py /= ratio;
      }

      if (symmetryMode === "horizontal" || symmetryMode === "both") {
        py = Math.abs(py);
      }
      if (symmetryMode === "vertical" || symmetryMode === "both") {
        px = Math.abs(px);
      }
      if (symmetryMode === "radial") {
        const r = Math.hypot(px, py);
        let a = Math.atan2(py, px);
        const sector = Math.PI / 4;
        a = ((a % sector) + sector) % sector;
        a = Math.min(a, sector - a);
        px = Math.cos(a) * r;
        py = Math.sin(a) * r;
      }

      field[y * width + x] = sampleField(px, py, currentSettings, time);
    }
  }

  if (currentSettings.viscosity > 0.6) {
    const passes = 1 + Math.round((currentSettings.viscosity - 0.6) * 5);
    for (let i = 0; i < passes; i += 1) {
      blurPass(field, temp, width, height);
    }
  }

  const threshold = 0.5 + currentSettings.dominance * 0.33;
  const soft = Math.max(currentSettings.softness, 0.001);

  for (let i = 0, j = 0; i < field.length; i += 1, j += 4) {
    let v = (field[i] - 0.5) * currentSettings.contrast + 0.5;
    v = clamp(v, 0, 1);
    let tone = smoothstep(threshold - soft, threshold + soft, v);

    if (currentSettings.paperTone === "dark") {
      tone = 1 - tone;
    }
    if (currentSettings.invert) {
      tone = 1 - tone;
    }
    if (currentSettings.grain > 0) {
      const x = i % width;
      const y = (i / width) | 0;
      tone += (hash2i(x, y, currentSettings.seed + 4093) - 0.5) * currentSettings.grain;
      tone = clamp(tone, 0, 1);
    }

    const c = Math.round(tone * 255);
    data[j] = c;
    data[j + 1] = c;
    data[j + 2] = c;
    data[j + 3] = 255;
  }

  targetCtx.putImageData(imageData, 0, 0);
}

function drawToPreviewFrom(sourceCanvas) {
  const cssWidth = parseNumber(dom.previewCanvas.style.width.replace("px", ""), 1);
  const cssHeight = parseNumber(dom.previewCanvas.style.height.replace("px", ""), 1);
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));

  previewCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  previewCtx.clearRect(0, 0, cssWidth, cssHeight);
  previewCtx.imageSmoothingEnabled = true;
  previewCtx.imageSmoothingQuality = "high";
  previewCtx.drawImage(sourceCanvas, 0, 0, cssWidth, cssHeight);
}

function setStatus(mode, renderSize, fullSize, elapsedMs, backend) {
  const fps = 1000 / Math.max(1, elapsedMs);
  smoothedFps = smoothedFps ? lerp(smoothedFps, fps, 0.2) : fps;
  lastRenderMs = lastRenderMs ? lerp(lastRenderMs, elapsedMs, 0.2) : elapsedMs;

  if (mode === RENDER_MODE.INTERACTIVE || settings.liveEvolve) {
    dom.status.textContent = `Live ${backend} ${renderSize.width}x${renderSize.height} | ${lastRenderMs.toFixed(1)} ms | ${smoothedFps.toFixed(0)} fps`;
    return;
  }

  dom.status.textContent = `HQ CPU ${fullSize.width}x${fullSize.height} | ${elapsedMs.toFixed(0)} ms`;
}

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const error = gl.getShaderInfoLog(shader) || "Shader compile failed";
    gl.deleteShader(shader);
    throw new Error(error);
  }
  return shader;
}

function createProgram(gl, vertexSource, fragmentSource) {
  const vs = createShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fs = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const error = gl.getProgramInfoLog(program) || "Program link failed";
    gl.deleteProgram(program);
    throw new Error(error);
  }
  return program;
}

function symmetryToNumber(value) {
  if (value === "horizontal") {
    return 1;
  }
  if (value === "vertical") {
    return 2;
  }
  if (value === "both") {
    return 3;
  }
  if (value === "radial") {
    return 4;
  }
  return 0;
}

function initGpuRenderer() {
  try {
    const gl = gpuCanvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      desynchronized: true
    });

    if (!gl) {
      gpu.available = false;
      return;
    }

    const program = createProgram(gl, GPU_VERTEX_SHADER, GPU_FRAGMENT_SHADER);
    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );

    gpu.available = true;
    gpu.gl = gl;
    gpu.program = program;
    gpu.quad = quad;
    gpu.uniforms = {
      uResolution: gl.getUniformLocation(program, "uResolution"),
      uTime: gl.getUniformLocation(program, "uTime"),
      uSeed: gl.getUniformLocation(program, "uSeed"),
      uFlow: gl.getUniformLocation(program, "uFlow"),
      uDirection: gl.getUniformLocation(program, "uDirection"),
      uSwirl: gl.getUniformLocation(program, "uSwirl"),
      uTurbulence: gl.getUniformLocation(program, "uTurbulence"),
      uViscosity: gl.getUniformLocation(program, "uViscosity"),
      uScale: gl.getUniformLocation(program, "uScale"),
      uDetail: gl.getUniformLocation(program, "uDetail"),
      uContrast: gl.getUniformLocation(program, "uContrast"),
      uSoftness: gl.getUniformLocation(program, "uSoftness"),
      uDominance: gl.getUniformLocation(program, "uDominance"),
      uGrain: gl.getUniformLocation(program, "uGrain"),
      uSymmetry: gl.getUniformLocation(program, "uSymmetry"),
      uInvert: gl.getUniformLocation(program, "uInvert"),
      uPaperDark: gl.getUniformLocation(program, "uPaperDark")
    };
  } catch (err) {
    gpu.available = false;
    gpu.gl = null;
    gpu.program = null;
    gpu.quad = null;
    gpu.uniforms = {};
  }
}

function renderGpu(width, height, currentSettings, time) {
  const gl = gpu.gl;
  const uniforms = gpu.uniforms;

  if (!gpu.available || !gl || !gpu.program) {
    return false;
  }

  if (gpuCanvas.width !== width) {
    gpuCanvas.width = width;
  }
  if (gpuCanvas.height !== height) {
    gpuCanvas.height = height;
  }

  gl.viewport(0, 0, width, height);
  gl.useProgram(gpu.program);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindBuffer(gl.ARRAY_BUFFER, gpu.quad);
  const aPos = gl.getAttribLocation(gpu.program, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  gl.uniform2f(uniforms.uResolution, width, height);
  gl.uniform1f(uniforms.uTime, time);
  gl.uniform1f(uniforms.uSeed, currentSettings.seed);
  gl.uniform1f(uniforms.uFlow, currentSettings.flow);
  gl.uniform1f(uniforms.uDirection, currentSettings.direction);
  gl.uniform1f(uniforms.uSwirl, currentSettings.swirl);
  gl.uniform1f(uniforms.uTurbulence, currentSettings.turbulence);
  gl.uniform1f(uniforms.uViscosity, currentSettings.viscosity);
  gl.uniform1f(uniforms.uScale, currentSettings.scale);
  gl.uniform1f(uniforms.uDetail, currentSettings.detail);
  gl.uniform1f(uniforms.uContrast, currentSettings.contrast);
  gl.uniform1f(uniforms.uSoftness, currentSettings.softness);
  gl.uniform1f(uniforms.uDominance, currentSettings.dominance);
  gl.uniform1f(uniforms.uGrain, currentSettings.grain);
  gl.uniform1f(uniforms.uSymmetry, symmetryToNumber(currentSettings.symmetry));
  gl.uniform1f(uniforms.uInvert, currentSettings.invert ? 1 : 0);
  gl.uniform1f(uniforms.uPaperDark, currentSettings.paperTone === "dark" ? 1 : 0);

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  return true;
}

function requestRender(mode) {
  if (mode === RENDER_MODE.INTERACTIVE) {
    pendingMode = RENDER_MODE.INTERACTIVE;
  } else if (pendingMode !== RENDER_MODE.INTERACTIVE) {
    pendingMode = RENDER_MODE.FULL;
  }

  if (!renderRafId) {
    renderRafId = requestAnimationFrame(processRenderQueue);
  }
}

function scheduleIdleFullRender(delayMs) {
  if (settings.liveEvolve) {
    return;
  }
  clearTimeout(idleFullTimer);
  idleFullTimer = window.setTimeout(() => {
    requestRender(RENDER_MODE.FULL);
  }, delayMs);
}

function processRenderQueue() {
  renderRafId = 0;
  if (!pendingMode || isRendering) {
    return;
  }

  isRendering = true;
  const requestedMode = pendingMode;
  pendingMode = null;

  settings = readSettings();
  updateCustomAspectVisibility();
  setSliderOutputValues();

  const fullSize = computeRenderSize(settings, RENDER_MODE.FULL);
  const interactiveActive = settings.liveEvolve || performance.now() - lastInteractionTs < INTERACTION_WINDOW_MS;
  const mode = interactiveActive ? RENDER_MODE.INTERACTIVE : requestedMode;
  const renderSize = mode === RENDER_MODE.INTERACTIVE
    ? computeRenderSize(settings, RENDER_MODE.INTERACTIVE)
    : fullSize;

  applyLayout(settings, fullSize.width, fullSize.height);

  const start = performance.now();
  let backend = "CPU";

  if (mode === RENDER_MODE.INTERACTIVE && gpu.available) {
    const ok = renderGpu(renderSize.width, renderSize.height, settings, evolutionTime);
    if (ok) {
      drawToPreviewFrom(gpuCanvas);
      backend = "GPU";
    } else {
      renderFluid(bufferCanvas, bufferCtx, renderSize.width, renderSize.height, settings, evolutionTime, previewBuffers);
      drawToPreviewFrom(bufferCanvas);
    }
  } else {
    renderFluid(bufferCanvas, bufferCtx, renderSize.width, renderSize.height, settings, evolutionTime, previewBuffers);
    drawToPreviewFrom(bufferCanvas);
  }

  const elapsed = performance.now() - start;

  if (mode === RENDER_MODE.INTERACTIVE) {
    if (backend === "GPU") {
      if (elapsed > 20) {
        interactivePixelBudget = Math.max(MIN_INTERACTIVE_BUDGET, Math.floor(interactivePixelBudget * 0.9));
      } else if (elapsed < 8) {
        interactivePixelBudget = Math.min(MAX_INTERACTIVE_BUDGET, Math.floor(interactivePixelBudget * 1.08));
      }
    } else {
      if (elapsed > 30) {
        interactivePixelBudget = Math.max(MIN_INTERACTIVE_BUDGET, Math.floor(interactivePixelBudget * 0.88));
      } else if (elapsed < 15) {
        interactivePixelBudget = Math.min(MAX_INTERACTIVE_BUDGET, Math.floor(interactivePixelBudget * 1.07));
      }
    }
  }

  setStatus(mode, renderSize, fullSize, elapsed, backend);
  isRendering = false;

  if (pendingMode) {
    requestRender(pendingMode);
  }
}

function runAnimationTick(ts) {
  if (!dom.liveEvolve.checked) {
    return;
  }

  if (!runAnimationTick.lastTs) {
    runAnimationTick.lastTs = ts;
  }

  const dt = (ts - runAnimationTick.lastTs) / 1000;
  runAnimationTick.lastTs = ts;
  settings = readSettings();
  evolutionTime += dt * settings.evolveSpeed;

  const step = 1000 / LIVE_TARGET_FPS;
  if (ts - lastLiveTickTs >= step) {
    requestRender(RENDER_MODE.INTERACTIVE);
    lastLiveTickTs = ts;
  }

  animationId = requestAnimationFrame(runAnimationTick);
}

function setLiveEvolve(enabled) {
  cancelAnimationFrame(animationId);
  runAnimationTick.lastTs = 0;
  lastLiveTickTs = 0;

  if (enabled) {
    requestRender(RENDER_MODE.INTERACTIVE);
    animationId = requestAnimationFrame(runAnimationTick);
  } else {
    requestRender(RENDER_MODE.FULL);
  }
}

function randomSeed() {
  dom.seed.value = String(Math.floor(Math.random() * 900000000) + 1);
}

function exportPng() {
  dom.downloadBtn.disabled = true;
  dom.status.textContent = "Exporting...";

  requestAnimationFrame(() => {
    try {
      const currentSettings = readSettings();
      const fullSize = computeRenderSize(currentSettings, RENDER_MODE.FULL);
      const exportCanvas = document.createElement("canvas");
      const exportCtx = exportCanvas.getContext("2d", { alpha: false });
      const exportBuffers = { width: 0, height: 0, field: null, temp: null, imageData: null };

      renderFluid(
        exportCanvas,
        exportCtx,
        fullSize.width,
        fullSize.height,
        currentSettings,
        evolutionTime,
        exportBuffers
      );

      let outputCanvas = exportCanvas;
      const scale = Math.round(currentSettings.exportScale);
      if (scale > 1) {
        const scaledCanvas = document.createElement("canvas");
        scaledCanvas.width = exportCanvas.width * scale;
        scaledCanvas.height = exportCanvas.height * scale;
        const scaledCtx = scaledCanvas.getContext("2d");
        scaledCtx.imageSmoothingEnabled = true;
        scaledCtx.imageSmoothingQuality = "high";
        scaledCtx.drawImage(exportCanvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
        outputCanvas = scaledCanvas;
      }

      const link = document.createElement("a");
      link.href = outputCanvas.toDataURL("image/png");
      link.download = `fluidform_seed-${currentSettings.seed}_${outputCanvas.width}x${outputCanvas.height}.png`;
      link.click();

      dom.status.textContent = `Exported ${outputCanvas.width}x${outputCanvas.height}`;
    } catch (err) {
      dom.status.textContent = `Export failed: ${String(err.message || err)}`;
    } finally {
      dom.downloadBtn.disabled = false;
      requestRender(RENDER_MODE.FULL);
    }
  });
}

function handleInteractiveInput() {
  dom.preset.value = "custom";
  lastInteractionTs = performance.now();
  settings = readSettings();
  setSliderOutputValues();
  requestRender(RENDER_MODE.INTERACTIVE);
  scheduleIdleFullRender(170);
}

function handleChangeInput(customizePreset, delay) {
  if (customizePreset) {
    dom.preset.value = "custom";
  }
  lastInteractionTs = performance.now();
  settings = readSettings();
  setSliderOutputValues();
  requestRender(settings.liveEvolve ? RENDER_MODE.INTERACTIVE : RENDER_MODE.FULL);
  scheduleIdleFullRender(delay);
}

function setupEvents() {
  for (const input of rangeInputs) {
    input.addEventListener("input", handleInteractiveInput);
    input.addEventListener("change", () => {
      settings = readSettings();
      if (!settings.liveEvolve) {
        requestRender(RENDER_MODE.FULL);
      }
    });
  }

  for (const input of numberInputs) {
    input.addEventListener("change", () => handleChangeInput(true, 120));
  }

  dom.aspect.addEventListener("change", () => {
    dom.preset.value = "custom";
    lastInteractionTs = performance.now();
    updateCustomAspectVisibility();
    settings = readSettings();
    requestRender(settings.liveEvolve ? RENDER_MODE.INTERACTIVE : RENDER_MODE.FULL);
    scheduleIdleFullRender(100);
  });

  dom.paperTone.addEventListener("change", () => handleChangeInput(false, 60));
  dom.symmetry.addEventListener("change", () => handleChangeInput(true, 90));
  dom.invert.addEventListener("change", () => handleChangeInput(true, 90));

  dom.preset.addEventListener("change", () => {
    if (dom.preset.value !== "custom") {
      applyPreset(dom.preset.value);
    }
    settings = readSettings();
    requestRender(settings.liveEvolve ? RENDER_MODE.INTERACTIVE : RENDER_MODE.FULL);
    scheduleIdleFullRender(80);
  });

  dom.liveEvolve.addEventListener("change", () => {
    settings = readSettings();
    setLiveEvolve(settings.liveEvolve);
  });

  dom.regenBtn.addEventListener("click", () => {
    evolutionTime += 0.35;
    lastInteractionTs = performance.now();
    settings = readSettings();
    requestRender(settings.liveEvolve ? RENDER_MODE.INTERACTIVE : RENDER_MODE.FULL);
    scheduleIdleFullRender(90);
  });

  dom.randomSeedBtn.addEventListener("click", () => {
    randomSeed();
    dom.preset.value = "custom";
    lastInteractionTs = performance.now();
    settings = readSettings();
    requestRender(settings.liveEvolve ? RENDER_MODE.INTERACTIVE : RENDER_MODE.FULL);
    scheduleIdleFullRender(90);
  });

  dom.downloadBtn.addEventListener("click", exportPng);

  window.addEventListener("resize", () => {
    lastInteractionTs = performance.now();
    settings = readSettings();
    requestRender(settings.liveEvolve ? RENDER_MODE.INTERACTIVE : RENDER_MODE.FULL);
    scheduleIdleFullRender(130);
  });
}

function init() {
  setSliderOutputValues();
  updateCustomAspectVisibility();
  settings = readSettings();
  initGpuRenderer();
  setupEvents();
  requestRender(RENDER_MODE.FULL);
  if (settings.liveEvolve) {
    setLiveEvolve(true);
  }
}

init();
