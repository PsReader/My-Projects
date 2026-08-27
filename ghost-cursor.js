import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

const baseVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform float iTime;
  uniform vec3  iResolution;
  uniform vec2  iMouse;
  uniform vec2  iPrevMouse[MAX_TRAIL_LENGTH];
  uniform float iOpacity;
  uniform float iScale;
  uniform vec3  iBaseColor;
  uniform float iBrightness;
  uniform float iEdgeIntensity;
  varying vec2  vUv;

  float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7))) * 43758.5453123); }
  float noise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    f *= f * (3. - 2. * f);
    return mix(mix(hash(i + vec2(0.,0.)), hash(i + vec2(1.,0.)), f.x),
               mix(hash(i + vec2(0.,1.)), hash(i + vec2(1.,1.)), f.x), f.y);
  }
  float fbm(vec2 p){
    float v = 0.0;
    float a = 0.5;
    mat2 m = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    for(int i=0;i<5;i++){
      v += a * noise(p);
      p = m * p * 2.0;
      a *= 0.5;
    }
    return v;
  }
  vec3 tint1(vec3 base){ return mix(base, vec3(1.0), 0.15); }
  vec3 tint2(vec3 base){ return mix(base, vec3(0.8, 0.9, 1.0), 0.25); }

  vec4 blob(vec2 p, vec2 mousePos, float intensity, float activity) {
    vec2 q = vec2(fbm(p * iScale + iTime * 0.1), fbm(p * iScale + vec2(5.2,1.3) + iTime * 0.1));
    vec2 r = vec2(fbm(p * iScale + q * 1.5 + iTime * 0.15), fbm(p * iScale + q * 1.5 + vec2(8.3,2.8) + iTime * 0.15));

    float smoke = fbm(p * iScale + r * 0.8);
    float radius = 0.35 + 0.2 * (1.0 / iScale);
    float distFactor = 1.0 - smoothstep(0.0, radius * activity, length(p - mousePos));
    float alpha = pow(smoke, 2.5) * distFactor * 0.45;

    vec3 c1 = tint1(iBaseColor);
    vec3 c2 = tint2(iBaseColor);
    vec3 color = mix(c1, c2, sin(iTime * 0.5) * 0.5 + 0.5);

    return vec4(color * alpha * intensity, alpha * intensity);
  }

  void main() {
    vec2 uv = (gl_FragCoord.xy / iResolution.xy * 2.0 - 1.0) * vec2(iResolution.x / iResolution.y, 1.0);
    vec2 mouse = (iMouse * 2.0 - 1.0) * vec2(iResolution.x / iResolution.y, 1.0);

    vec3 colorAcc = vec3(0.0);
    float alphaAcc = 0.0;

    vec4 b = blob(uv, mouse, 1.0, iOpacity);
    colorAcc += b.rgb;
    alphaAcc += b.a;

    for (int i = 0; i < MAX_TRAIL_LENGTH; i++) {
      vec2 pm = (iPrevMouse[i] * 2.0 - 1.0) * vec2(iResolution.x / iResolution.y, 1.0);
      float t = 1.0 - float(i) / float(MAX_TRAIL_LENGTH);
      t = pow(t, 2.0);
      if (t > 0.01) {
        vec4 bt = blob(uv, pm, t * 0.8, iOpacity);
        colorAcc += bt.rgb;
        alphaAcc += bt.a;
      }
    }

    colorAcc *= iBrightness;

    vec2 uv01 = gl_FragCoord.xy / iResolution.xy;
    float edgeDist = min(min(uv01.x, 1.0 - uv01.x), min(uv01.y, 1.0 - uv01.y));
    float distFromEdge = clamp(edgeDist * 2.0, 0.0, 1.0);
    float k = clamp(iEdgeIntensity, 0.0, 1.0);
    float edgeMask = mix(1.0 - k, 1.0, distFromEdge);

    float outAlpha = clamp(alphaAcc * iOpacity * edgeMask, 0.0, 1.0);
    gl_FragColor = vec4(colorAcc, outAlpha);
  }
`;

function readConfig(el) {
  const num = (name, def) => {
    const raw = el.dataset[name];
    if (raw === undefined || raw === "") return def;
    const v = parseFloat(raw);
    return Number.isFinite(v) ? v : def;
  };
  const int = (name, def) => Math.round(num(name, def));
  const str = (name, def) =>
    el.dataset[name] !== undefined && el.dataset[name] !== ""
      ? el.dataset[name]
      : def;

  const isTouch =
    typeof window !== "undefined" &&
    ("ontouchstart" in window || navigator.maxTouchPoints > 0);

  const reducedMotion =
    typeof window !== "undefined" &&
    !!window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const bool = (name, def) =>
    el.dataset[name] !== undefined && el.dataset[name] !== ""
      ? el.dataset[name] === "true"
      : def;

  return {
    isTouch,
    reducedMotion,
    trailLength: Math.max(1, int("trailLength", 50)),
    inertia: num("inertia", 0.5),
    grainIntensity: num("grainIntensity", 0.05),
    bloomStrength: num("bloomStrength", 0.05),
    bloomRadius: num("bloomRadius", 1.0),
    bloomThreshold: num("bloomThreshold", 0.08),
    brightness: num("brightness", 0.8),
    color: str("color", "#B497CF"),
    mixBlendMode: str("mixBlendMode", "normal"),
    edgeIntensity: num("edgeIntensity", 0.05),
    maxDevicePixelRatio: num("maxDevicePixelRatio", 0.5),
    targetPixels: num("targetPixels", isTouch ? 0.9e6 : 1.3e6),
    fadeDelayMs: int("fadeDelayMs", isTouch ? 500 : 1000),
    fadeDurationMs: int("fadeDurationMs", isTouch ? 1000 : 1500),
    zIndex: int("zIndex", 10),
    burstEnabled: bool("burst", true),
    sparkColor: str("sparkColor", ""),
  };
}

function calculateScale(el) {
  const r = el.getBoundingClientRect();
  const base = 600;
  const current = Math.min(Math.max(1, r.width), Math.max(1, r.height));
  return Math.max(0.5, Math.min(2.0, current / base));
}

export function initGhostCursor(el, opts = {}) {
  const config = { ...readConfig(el), ...opts };
  const host = el;
  if (!host) return null;

  let active = true;
  let hasValidSize = false;
  let raf = null;
  let running = false;
  let head = 0;
  let fadeOpacity = 1.0;
  const currentMouse = new THREE.Vector2(0.5, 0.5);
  const velocity = new THREE.Vector2(0, 0);
  let lastMoveTime =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  let pointerActive = false;
  let visible = true;
  let burstActive = false;
  let burstStart = 0;

  const renderer = new THREE.WebGLRenderer({
    antialias: !config.isTouch,
    alpha: true,
    depth: false,
    stencil: false,
    powerPreference: config.isTouch ? "low-power" : "high-performance",
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
  });
  renderer.setClearColor(0x000000, 0);

  renderer.domElement.style.pointerEvents = "none";
  if (config.mixBlendMode) {
    renderer.domElement.style.mixBlendMode = String(config.mixBlendMode);
  } else {
    renderer.domElement.style.removeProperty("mix-blend-mode");
  }

  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const geom = new THREE.PlaneGeometry(2, 2);

  const maxTrail = config.trailLength;
  const trailBuf = Array.from(
    { length: maxTrail },
    () => new THREE.Vector2(0.5, 0.5),
  );

  const baseColor = new THREE.Color(config.color);

  const material = new THREE.ShaderMaterial({
    defines: { MAX_TRAIL_LENGTH: maxTrail },
    uniforms: {
      iTime: { value: 0 },
      iResolution: { value: new THREE.Vector3(1, 1, 1) },
      iMouse: { value: new THREE.Vector2(0.5, 0.5) },
      iPrevMouse: { value: trailBuf.map((v) => v.clone()) },
      iOpacity: { value: 1.0 },
      iScale: { value: 1.0 },
      iBaseColor: {
        value: new THREE.Vector3(baseColor.r, baseColor.g, baseColor.b),
      },
      iBrightness: { value: config.brightness },
      iEdgeIntensity: { value: config.edgeIntensity },
    },
    vertexShader: baseVertexShader,
    fragmentShader,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });

  const mesh = new THREE.Mesh(geom, material);
  scene.add(mesh);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(1, 1),
    config.bloomStrength,
    config.bloomRadius,
    config.bloomThreshold,
  );
  composer.addPass(bloomPass);

  const FilmGrainShader = {
    uniforms: {
      tDiffuse: { value: null },
      iTime: { value: 0 },
      intensity: { value: config.grainIntensity },
    },
    vertexShader: `
      varying vec2 vUv;
      void main(){
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform float iTime;
      uniform float intensity;
      varying vec2 vUv;

      float hash1(float n){ return fract(sin(n)*43758.5453); }

      void main(){
        vec4 color = texture2D(tDiffuse, vUv);
        float n = hash1(vUv.x*1000.0 + vUv.y*2000.0 + iTime) * 2.0 - 1.0;
        color.rgb += n * intensity * color.rgb;
        gl_FragColor = color;
      }
    `,
  };
  const filmPass = new ShaderPass(FilmGrainShader);
  composer.addPass(filmPass);

  const UnpremultiplyPass = new ShaderPass({
    uniforms: { tDiffuse: { value: null } },
    vertexShader: `
      varying vec2 vUv;
      void main(){
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      varying vec2 vUv;
      void main(){
        vec4 c = texture2D(tDiffuse, vUv);
        float a = max(c.a, 1e-5);
        vec3 straight = c.rgb / a;
        gl_FragColor = vec4(clamp(straight, 0.0, 1.0), c.a);
      }
    `,
  });
  composer.addPass(UnpremultiplyPass);

  const resize = () => {
    if (!active) return;

    const rect = host.getBoundingClientRect();
    const cssW = Math.floor(rect.width);
    const cssH = Math.floor(rect.height);

    if (cssW <= 0 || cssH <= 0) {
      hasValidSize = false;
      return;
    }

    const currentDPR = Math.min(
      typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1,
      config.maxDevicePixelRatio,
    );
    const need = cssW * cssH * currentDPR * currentDPR;
    const scale =
      need <= config.targetPixels
        ? 1
        : Math.max(
            0.5,
            Math.min(1, Math.sqrt(config.targetPixels / Math.max(1, need))),
          );
    const pixelRatio = currentDPR * scale;

    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(cssW, cssH, false);

    composer.setPixelRatio?.(pixelRatio);
    composer.setSize(cssW, cssH);

    const wpx = Math.max(1, Math.floor(cssW * pixelRatio));
    const hpx = Math.max(1, Math.floor(cssH * pixelRatio));
    material.uniforms.iResolution.value.set(wpx, hpx, 1);
    material.uniforms.iScale.value = calculateScale(host);
    bloomPass.setSize(wpx, hpx);

    hasValidSize = true;
  };

  resize();

  const ro = new ResizeObserver(() => {
    if (!active) return;
    resize();
  });
  ro.observe(host);

  const start =
    typeof performance !== "undefined" ? performance.now() : Date.now();

  const renderFrame = (now) => {
    const t = (now - start) / 1000;

    if (pointerActive) {
      velocity.set(
        currentMouse.x - material.uniforms.iMouse.value.x,
        currentMouse.y - material.uniforms.iMouse.value.y,
      );
      material.uniforms.iMouse.value.copy(currentMouse);
      fadeOpacity = 1.0;
    } else {
      velocity.multiplyScalar(config.inertia);
      if (velocity.lengthSq() > 1e-6) {
        material.uniforms.iMouse.value.add(velocity);
      }
      const dt = now - lastMoveTime;
      if (dt > config.fadeDelayMs) {
        const k = Math.min(
          1,
          (dt - config.fadeDelayMs) / config.fadeDurationMs,
        );
        fadeOpacity = Math.max(0, 1 - k);
      }
    }

    const N = trailBuf.length;
    head = (head + 1) % N;
    trailBuf[head].copy(material.uniforms.iMouse.value);
    const arr = material.uniforms.iPrevMouse.value;
    for (let i = 0; i < N; i++) {
      const srcIdx = (head - i + N) % N;
      arr[i].copy(trailBuf[srcIdx]);
    }

    let brightness = config.brightness;
    if (burstActive) {
      const k = Math.min(1, (now - burstStart) / 350);
      if (k >= 1) {
        burstActive = false;
      } else {
        const boost = (1 - k) * 1.6;
        brightness = config.brightness * (1 + boost);
        bloomPass.strength = config.bloomStrength * (1 + boost * 1.5);
      }
    }
    if (!burstActive) bloomPass.strength = config.bloomStrength;

    material.uniforms.iBrightness.value = brightness;
    material.uniforms.iOpacity.value = fadeOpacity;
    material.uniforms.iTime.value = t;

    if (filmPass.uniforms?.iTime) {
      filmPass.uniforms.iTime.value = t;
    }

    composer.render();
  };

  const animate = () => {
    if (!active || !visible) {
      running = false;
      raf = null;
      return;
    }

    if (!hasValidSize) {
      raf = requestAnimationFrame(animate);
      return;
    }

    renderFrame(performance.now());

    if (!pointerActive && fadeOpacity <= 0.001) {
      running = false;
      raf = null;
      return;
    }

    raf = requestAnimationFrame(animate);
  };

  const ensureLoop = () => {
    if (config.reducedMotion) {
      if (hasValidSize && visible) renderFrame(performance.now());
      return;
    }
    if (!running && visible) {
      running = true;
      raf = requestAnimationFrame(animate);
    }
  };

  const onPointerMove = (e) => {
    const rect = host.getBoundingClientRect();
    const x = THREE.MathUtils.clamp(
      (e.clientX - rect.left) / Math.max(1, rect.width),
      0,
      1,
    );
    const y = THREE.MathUtils.clamp(
      1 - (e.clientY - rect.top) / Math.max(1, rect.height),
      0,
      1,
    );
    currentMouse.set(x, y);
    pointerActive = true;
    lastMoveTime = performance.now();
    if (config.reducedMotion) {
      if (hasValidSize) renderFrame(performance.now());
      return;
    }
    ensureLoop();
  };
  const onPointerEnter = () => {
    pointerActive = true;
    ensureLoop();
  };
  const onPointerLeave = () => {
    pointerActive = false;
    lastMoveTime = performance.now();
    ensureLoop();
  };

  const burst = (x, y) => {
    const rect = host.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const bx = THREE.MathUtils.clamp(
      (x - rect.left) / Math.max(1, rect.width),
      0,
      1,
    );
    const by = THREE.MathUtils.clamp(
      1 - (y - rect.top) / Math.max(1, rect.height),
      0,
      1,
    );
    currentMouse.set(bx, by);
    pointerActive = true;
    lastMoveTime = performance.now();
    const arr = material.uniforms.iPrevMouse.value;
    for (let i = 0; i < Math.min(8, arr.length); i++) arr[i].set(bx, by);
    burstActive = true;
    burstStart = performance.now();
    ensureLoop();
  };

  const spawnSparks = (x, y) => {
    const rect = host.getBoundingClientRect();
    const cx = x - rect.left;
    const cy = y - rect.top;
    const color = config.sparkColor || config.color;
    const count = 8;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const dist = 26 + Math.random() * 34;
      const dot = document.createElement("span");
      dot.className = "ghost-cursor-spark";
      const size = 3 + Math.random() * 3;
      dot.style.cssText =
        "position:fixed;left:0;top:0;width:" +
        size +
        "px;height:" +
        size +
        "px;border-radius:50%;background:" +
        color +
        ";pointer-events:none;z-index:" +
        (config.zIndex + 1) +
        ";will-change:transform,opacity;mix-blend-mode:screen;";
      document.body.appendChild(dot);
      dot.animate(
        [
          {
            transform: "translate(" + cx + "px," + cy + "px) scale(1)",
            opacity: 0.95,
          },
          {
            transform:
              "translate(" +
              (cx + Math.cos(angle) * dist) +
              "px," +
              (cy + Math.sin(angle) * dist) +
              "px) scale(0.2)",
            opacity: 0,
          },
        ],
        {
          duration: 480 + Math.random() * 160,
          easing: "cubic-bezier(.22,1,.36,1)",
          fill: "forwards",
        },
      );
      setTimeout(() => dot.remove(), 900);
    }
  };

  const onPointerDown = (e) => {
    if (!visible || !config.burstEnabled || config.reducedMotion) return;
    burst(e.clientX, e.clientY);
    spawnSparks(e.clientX, e.clientY);
  };

  window.addEventListener("pointermove", onPointerMove, { passive: true });
  window.addEventListener("pointerenter", onPointerEnter, { passive: true });
  window.addEventListener("pointerleave", onPointerLeave, { passive: true });
  host.addEventListener("pointerdown", onPointerDown, { passive: true });

  const setColor = (hex) => {
    if (!hex) return;
    const c = new THREE.Color(hex);
    baseColor.copy(c);
    if (material.uniforms.iBaseColor) {
      material.uniforms.iBaseColor.value.set(c.r, c.g, c.b);
    }
  };

  const setVisible = (v) => {
    visible = !!v;
    if (host) host.style.visibility = visible ? "" : "hidden";
    if (visible) {
      ensureLoop();
    } else {
      if (raf) cancelAnimationFrame(raf);
      raf = null;
      running = false;
    }
  };

  if (!config.reducedMotion) ensureLoop();

  return {
    setColor,
    setVisible,
    burst,
    destroy() {
      active = false;
      hasValidSize = false;

      if (raf) cancelAnimationFrame(raf);
      running = false;
      raf = null;

      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerenter", onPointerEnter);
      window.removeEventListener("pointerleave", onPointerLeave);
      host.removeEventListener("pointerdown", onPointerDown);
      ro.disconnect();

      scene.clear();
      geom.dispose();
      material.dispose();
      composer.dispose();
      renderer.dispose();
      renderer.forceContextLoss();

      if (renderer.domElement && renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
    },
  };
}

function init() {
  if ("ontouchstart" in window || navigator.maxTouchPoints > 0) return;

  document.querySelectorAll("#ghostCursor, .ghost-cursor").forEach((el) => {
    if (el.__ghostCursorInit) return;
    el.__ghostCursorInit = true;
    try {
      const instance = initGhostCursor(el);
      el.__ghostCursorInstance = instance;
      if (!window.__ghostCursors) window.__ghostCursors = [];
      window.__ghostCursors.push(instance);
    } catch (err) {
      console.warn("[GhostCursor] failed to initialize:", err);
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
