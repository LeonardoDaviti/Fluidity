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
  symmetry: document.getElementById("symmetry"),
  invert: document.getElementById("invert"),
  liveEvolve: document.getElementById("liveEvolve"),
  regenBtn: document.getElementById("regenBtn"),
  randomSeedBtn: document.getElementById("randomSeedBtn"),
  downloadBtn: document.getElementById("downloadBtn")
};

const previewCtx = dom.previewCanvas.getContext("2d");
const bufferCanvas = document.createElement("canvas");
const bufferCtx = bufferCanvas.getContext("2d");

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
  }
};

let evolutionTime = 0;
let animationId = 0;
let lastFrameTime = 0;
let isRendering = false;
let renderQueued = false;
let latestRenderedSettings = null;

const rangeInputs = Array.from(document.querySelectorAll('input[type="range"]'));
const numberInputs = [dom.seed, dom.aspectW, dom.aspectH];
const changeInputs = [dom.aspect, dom.symmetry, dom.invert, dom.liveEvolve, dom.preset];

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

function getAspectRatio(settings) {
  if (settings.aspect === "custom") {
    const w = clamp(parseNumber(settings.aspectW, 1), 1, 64);
    const h = clamp(parseNumber(settings.aspectH, 1), 1, 64);
    return w / h;
  }

  const parts = settings.aspect.split(":");
  if (parts.length !== 2) {
    return 1;
  }

  const w = parseNumber(parts[0], 1);
  const h = parseNumber(parts[1], 1);
  return h === 0 ? 1 : w / h;
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
    symmetry: dom.symmetry.value,
    invert: dom.invert.checked,
    liveEvolve: dom.liveEvolve.checked
  };
}

function computeRenderSize(settings) {
  const ratio = getAspectRatio(settings);
  if (ratio >= 1) {
    return {
      width: Math.round(settings.longEdge),
      height: Math.max(8, Math.round(settings.longEdge / ratio))
    };
  }

  return {
    width: Math.max(8, Math.round(settings.longEdge * ratio)),
    height: Math.round(settings.longEdge)
  };
}

function computePreviewDrawSize(settings, renderWidth, renderHeight) {
  const ratio = renderWidth / renderHeight;
  const maxDimension = settings.displaySize;
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
    (settings.stageWidth - 24) / width,
    (settings.stageHeight - 24) / height
  );

  return {
    width: Math.max(1, Math.round(width * fitScale)),
    height: Math.max(1, Math.round(height * fitScale))
  };
}

function applyLayout(settings, renderWidth, renderHeight) {
  const columnWidth = dom.previewColumn.clientWidth;
  const stageWidth = Math.min(settings.stageWidth, Math.max(280, columnWidth - 24));
  const stageHeight = settings.stageHeight;
  dom.stage.style.width = `${stageWidth}px`;
  dom.stage.style.height = `${stageHeight}px`;

  const drawSize = computePreviewDrawSize(
    { ...settings, stageWidth, stageHeight },
    renderWidth,
    renderHeight
  );

  const dpr = window.devicePixelRatio || 1;
  dom.previewCanvas.width = Math.max(1, Math.round(drawSize.width * dpr));
  dom.previewCanvas.height = Math.max(1, Math.round(drawSize.height * dpr));
  dom.previewCanvas.style.width = `${drawSize.width}px`;
  dom.previewCanvas.style.height = `${drawSize.height}px`;
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
  dom.symmetry.value = preset.symmetry;
  dom.invert.checked = Boolean(preset.invert);

  setSliderOutputValues();
}

function sampleField(nx, ny, settings, time) {
  let x = nx;
  let y = ny;
  const directionRad = (settings.direction * Math.PI) / 180;
  const damping = 1 - settings.viscosity * 0.35;
  const octaves = Math.max(2, settings.detail);
  const secondaryOctaves = Math.max(2, settings.detail - 1);

  for (let i = 0; i < 3; i += 1) {
    const f = settings.scale * (0.72 + i * 0.72);
    const n1 = fbm(
      x * f + 19.17 + settings.seed * 0.001 + time * 0.31,
      y * f - 11.03 + time * 0.07,
      secondaryOctaves,
      settings.seed + 73 * i
    );
    const n2 = fbm(
      x * f - 7.93 - time * 0.06,
      y * f + 23.41 + settings.seed * 0.001,
      secondaryOctaves,
      settings.seed + 149 * i
    );

    const bend = (n1 - 0.5) * settings.swirl * Math.PI * 2;
    const fx = Math.cos(directionRad + bend);
    const fy = Math.sin(directionRad + bend);

    x += (fx * settings.flow + (n2 - 0.5) * settings.turbulence * 2) * 0.17 * damping;
    y += (fy * settings.flow + (n1 - 0.5) * settings.turbulence * 2) * 0.17 * damping;
  }

  const base = fbm(
    x * settings.scale + time * 0.11,
    y * settings.scale - time * 0.08,
    octaves,
    settings.seed + 991
  );
  const stripe = fbm(
    x * settings.scale * 1.85 - 5.1,
    y * settings.scale * 1.85 + 8.7 + time * 0.05,
    secondaryOctaves,
    settings.seed + 1831
  );
  const ridge = 1 - Math.abs(2 * stripe - 1);

  let value = base * 0.66 + ridge * 0.34;
  const wave = Math.sin((x * 1.18 + y * 0.94 + time * 0.9) * Math.PI);
  value += wave * 0.08 * settings.swirl;
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

function renderFluid(width, height, settings, time) {
  bufferCanvas.width = width;
  bufferCanvas.height = height;

  const field = new Float32Array(width * height);
  const invW = width > 1 ? 1 / (width - 1) : 1;
  const invH = height > 1 ? 1 / (height - 1) : 1;
  const ratio = width / height;
  const symmetryMode = settings.symmetry;

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

      field[y * width + x] = sampleField(px, py, settings, time);
    }
  }

  if (settings.viscosity > 0.6) {
    const passes = 1 + Math.round((settings.viscosity - 0.6) * 5);
    const temp = new Float32Array(field.length);
    for (let i = 0; i < passes; i += 1) {
      blurPass(field, temp, width, height);
    }
  }

  const image = bufferCtx.createImageData(width, height);
  const data = image.data;
  const threshold = 0.5 + settings.dominance * 0.33;
  const soft = Math.max(settings.softness, 0.001);

  for (let i = 0, j = 0; i < field.length; i += 1, j += 4) {
    let v = (field[i] - 0.5) * settings.contrast + 0.5;
    v = clamp(v, 0, 1);
    let white = smoothstep(threshold - soft, threshold + soft, v);
    if (settings.invert) {
      white = 1 - white;
    }

    if (settings.grain > 0) {
      const x = i % width;
      const y = (i / width) | 0;
      white += (hash2i(x, y, settings.seed + 4093) - 0.5) * settings.grain;
      white = clamp(white, 0, 1);
    }

    const c = Math.round(white * 255);
    data[j] = c;
    data[j + 1] = c;
    data[j + 2] = c;
    data[j + 3] = 255;
  }

  bufferCtx.putImageData(image, 0, 0);
}

function drawToPreview() {
  const cssWidth = parseNumber(dom.previewCanvas.style.width.replace("px", ""), 1);
  const cssHeight = parseNumber(dom.previewCanvas.style.height.replace("px", ""), 1);
  const dpr = window.devicePixelRatio || 1;

  previewCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  previewCtx.clearRect(0, 0, cssWidth, cssHeight);
  previewCtx.imageSmoothingEnabled = true;
  previewCtx.drawImage(bufferCanvas, 0, 0, cssWidth, cssHeight);
}

function queueRender() {
  renderQueued = true;
  if (!isRendering) {
    requestAnimationFrame(runRender);
  }
}

function runRender() {
  if (!renderQueued || isRendering) {
    return;
  }

  renderQueued = false;
  isRendering = true;
  const settings = readSettings();
  updateCustomAspectVisibility();
  setSliderOutputValues();

  const { width, height } = computeRenderSize(settings);
  applyLayout(settings, width, height);
  dom.status.textContent = "Rendering...";

  setTimeout(() => {
    const start = performance.now();
    renderFluid(width, height, settings, evolutionTime);
    drawToPreview();
    const elapsed = performance.now() - start;
    dom.status.textContent = `${width}x${height} | ${elapsed.toFixed(0)} ms`;
    latestRenderedSettings = { ...settings, width, height };
    isRendering = false;
    if (renderQueued) {
      runRender();
    }
  }, 0);
}

function runAnimationTick(timestamp) {
  const settings = readSettings();
  if (!settings.liveEvolve) {
    return;
  }

  if (!lastFrameTime) {
    lastFrameTime = timestamp;
  }

  const dt = (timestamp - lastFrameTime) / 1000;
  lastFrameTime = timestamp;
  evolutionTime += dt * settings.evolveSpeed;

  const rerenderEveryMs = 130;
  if (!isRendering) {
    if (!runAnimationTick.lastRenderTs) {
      runAnimationTick.lastRenderTs = 0;
    }
    if (timestamp - runAnimationTick.lastRenderTs > rerenderEveryMs) {
      queueRender();
      runAnimationTick.lastRenderTs = timestamp;
    }
  }

  animationId = requestAnimationFrame(runAnimationTick);
}

function setLiveEvolve(enabled) {
  if (enabled) {
    cancelAnimationFrame(animationId);
    lastFrameTime = 0;
    animationId = requestAnimationFrame(runAnimationTick);
  } else {
    cancelAnimationFrame(animationId);
    lastFrameTime = 0;
    runAnimationTick.lastRenderTs = 0;
  }
}

function randomSeed() {
  const value = Math.floor(Math.random() * 900000000) + 1;
  dom.seed.value = String(value);
}

function exportPng() {
  if (!latestRenderedSettings) {
    return;
  }

  const scale = Math.round(readSettings().exportScale);
  let sourceCanvas = bufferCanvas;

  if (scale > 1) {
    const outCanvas = document.createElement("canvas");
    outCanvas.width = latestRenderedSettings.width * scale;
    outCanvas.height = latestRenderedSettings.height * scale;
    const outCtx = outCanvas.getContext("2d");
    outCtx.imageSmoothingEnabled = true;
    outCtx.drawImage(sourceCanvas, 0, 0, outCanvas.width, outCanvas.height);
    sourceCanvas = outCanvas;
  }

  const anchor = document.createElement("a");
  anchor.href = sourceCanvas.toDataURL("image/png");
  anchor.download = `fluidform_seed-${latestRenderedSettings.seed}_${sourceCanvas.width}x${sourceCanvas.height}.png`;
  anchor.click();
}

function setupEvents() {
  rangeInputs.forEach((input) => {
    input.addEventListener("input", () => {
      dom.preset.value = "custom";
      queueRender();
    });
  });

  numberInputs.forEach((input) => {
    input.addEventListener("change", () => {
      dom.preset.value = "custom";
      queueRender();
    });
  });

  changeInputs.forEach((input) => {
    input.addEventListener("change", () => {
      if (input === dom.preset && dom.preset.value !== "custom") {
        applyPreset(dom.preset.value);
      } else if (input !== dom.liveEvolve) {
        dom.preset.value = "custom";
      }

      if (input === dom.liveEvolve) {
        setLiveEvolve(dom.liveEvolve.checked);
      }
      queueRender();
    });
  });

  dom.regenBtn.addEventListener("click", () => {
    evolutionTime = 0;
    queueRender();
  });

  dom.randomSeedBtn.addEventListener("click", () => {
    randomSeed();
    dom.preset.value = "custom";
    queueRender();
  });

  dom.downloadBtn.addEventListener("click", () => {
    exportPng();
  });

  window.addEventListener("resize", () => {
    queueRender();
  });
}

function init() {
  setSliderOutputValues();
  updateCustomAspectVisibility();
  setupEvents();
  queueRender();
}

init();
