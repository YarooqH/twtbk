// A halftone dot field drawn with one WebGL fragment shader. Two looks:
//
// feed:     an abstract X timeline (avatar, name, 1-3 lines of text, an action
//           bar) drifting upward in columns. A few posts are already saved and
//           their XMarks dot is lit in the accent; now and then a post gets saved
//           as it passes. The cursor is a lens, and pulseAt() sends a ring out.
// wordmark: halftone letters. Dots shrink toward the letter edges, a band of
//           accent light sweeps across, and the cursor lights them up.
//
// Colors follow the page's CSS variables and update when the accent changes.
//
// If WebGL is unavailable the canvas stays transparent and the page underneath
// (plain background, fallback wordmark text) shows through.

import { ACCENT_EVENT } from './accent';

type Mode = 'feed' | 'wordmark';

export interface DotFieldOptions {
  mode: Mode;
  /** Grid cell size in CSS px. */
  cell: number;
  /** Feed only: element whose box is kept clear of dots (the headline block). */
  clearTarget?: HTMLElement | null;
  /** Wordmark only: the text and the CSS font family to draw it in. */
  text?: string;
  fontFamily?: string;
}

const FRAG = `
precision highp float;
uniform vec2 u_res; uniform float u_dpr; uniform float u_time;
uniform vec2 u_mouse; uniform float u_mouseOn;
uniform vec3 u_bg; uniform vec3 u_dot; uniform vec3 u_acc;
uniform vec3 u_pulse; uniform float u_cell; uniform float u_mask; uniform vec4 u_clear;
uniform sampler2D u_tex;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float disc(float d, float r){ return 1.0 - smoothstep(r - 0.8, r + 0.8, d); }
float lens(vec2 c){ return u_mouseOn * (1.0 - smoothstep(0.0, 230.0, distance(c, u_mouse))); }
float ringAt(vec2 c){
  float age = u_time - u_pulse.z;
  if (age <= 0.0 || age > 3.5) return 0.0;
  float k = (distance(c, u_pulse.xy) - age * 760.0) / 90.0;
  return exp(-k * k) * exp(-age * 0.9);
}
float cov(vec2 uv){ return texture2D(u_tex, uv).a; }

void main(){
  vec2 res = u_res / u_dpr;
  vec2 px = vec2(gl_FragCoord.x, u_res.y - gl_FragCoord.y) / u_dpr;
  float cell = u_cell;

  if (u_mask > 0.5) {
    vec2 center = (floor(px / cell) + 0.5) * cell;
    vec2 uv = center / res; vec2 s = vec2(cell) / res;
    float c = (cov(uv) * 2.0 + cov(uv + vec2(s.x, 0.0)) + cov(uv - vec2(s.x, 0.0)) + cov(uv + vec2(0.0, s.y)) + cov(uv - vec2(0.0, s.y))) / 6.0;
    if (c < 0.05) { gl_FragColor = vec4(u_bg, 1.0); return; }
    float sweep = mod(u_time * 260.0, res.x + 1400.0) - 700.0;
    float kb = (center.x + center.y * 0.55 - sweep) / 120.0;
    float w = clamp(max(max(lens(center), ringAt(center)), exp(-kb * kb) * 0.6), 0.0, 1.0);
    float r = cell * (mix(0.1, 0.45, c) + w * 0.05);
    float a = disc(distance(px, center), r) * mix(0.6, 1.0, w);
    gl_FragColor = vec4(mix(u_bg, mix(u_dot, u_acc, w), a), 1.0);
    return;
  }

  float colCells = 40.0;
  float period = (colCells + 6.0) * cell;
  float offX = mod(res.x * 0.5 - colCells * cell * 0.5, period);
  float x = px.x - offX + period;
  float ci = floor(x / period);
  float xin = x - ci * period;
  float speed = 9.0 + 7.0 * hash(vec2(ci, 1.7));
  float y = px.y + u_time * speed + hash(vec2(ci, 9.1)) * 900.0;
  vec2 g = floor(vec2(xin, y) / cell);
  vec2 center = px - (vec2(xin, y) - (g + 0.5) * cell);

  float rows = 7.0;
  float pi = floor(g.y / rows);
  float r = g.y - pi * rows;
  float c = g.x;
  float h1 = hash(vec2(ci * 13.0 + pi, 4.3));
  float h2 = hash(vec2(ci * 7.0 + pi, 8.9));
  float h3 = hash(vec2(ci * 3.0 + pi, 2.2));
  float l1 = floor(20.0 + h1 * 16.0);
  float l2 = floor(10.0 + h2 * 26.0);
  float l3 = h1 > 0.5 ? floor(6.0 + h3 * 22.0) : 0.0;
  float nl = floor(5.0 + h2 * 7.0);
  float inCol = 1.0 - step(colCells - 0.5, c);

  // 0 faint grid, 1 text, 2 action icon, 3 name, 4 the XMarks button
  float kind = 0.0;
  if (inCol > 0.5 && c >= 4.0) {
    float t = c - 4.0;
    if (r == 1.0 && t < nl) kind = 3.0;
    else if (r == 2.0 && t < l1) kind = 1.0;
    else if (r == 3.0 && t < l2) kind = 1.0;
    else if (r == 4.0 && t < l3) kind = 1.0;
    else if (r == 5.0 && mod(t, 6.0) < 0.5 && t < 30.5) kind = t > 29.5 ? 4.0 : 2.0;
  }

  float saved = step(h3, 0.12);
  float ft = mod(u_time + hash(vec2(ci * 5.0 + pi, 6.6)) * 30.0, 30.0);
  float flash = smoothstep(0.0, 0.3, ft) * exp(-max(ft - 0.3, 0.0) * 1.4) * step(ft, 4.0);
  float m = lens(center);
  float ring = ringAt(center);

  float rad = 0.06; float vis = 0.26; float w = 0.0;
  if (kind == 1.0) { rad = 0.22; vis = 0.5; w = flash * 0.5; }
  else if (kind == 3.0) { rad = 0.27; vis = 0.72; w = flash * 0.5; }
  else if (kind == 2.0) { rad = 0.2; vis = 0.42; }
  else if (kind == 4.0) { float on = max(saved, flash); rad = mix(0.2, 0.38, on); vis = mix(0.42, 1.0, on); w = on; }
  w = max(w, max(m * 0.75, ring));
  rad += m * 0.12 + ring * 0.2;
  vis = mix(vis, 1.0, max(m * 0.7, ring));
  float a = disc(length(px - center), rad * cell) * vis;

  vec2 avC = vec2(2.0 * cell, (pi * rows + 2.0) * cell);
  float av = inCol * disc(length(vec2(xin, y) - avC), 0.62 * cell) * mix(0.4, 0.85, max(m, max(flash, saved * 0.6)));
  float avW = max(m * 0.55, max(flash, saved) * 0.9);
  if (av > a) { a = av; w = avW; }

  float clear = smoothstep(0.55, 1.25, length((px - u_clear.xy) / u_clear.zw));
  float fade = (1.0 - smoothstep(res.y * 0.7, res.y, px.y)) * smoothstep(70.0, 170.0, px.y);
  float alpha = clamp(a * mix(0.08, 1.0, max(clear, ring * 0.8)) * fade, 0.0, 1.0);
  vec3 col = mix(u_dot, u_acc, clamp(w, 0.0, 1.0));
  gl_FragColor = vec4(col * alpha, alpha);
}
`;

const VERT = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';

// Shared across every field on the page: pointer position and the last save.
let mouse: { x: number; y: number } | null = null;
let pulse: { x: number; y: number; at: number } | null = null;
let listening = false;

function listen() {
  if (listening) return;
  listening = true;
  window.addEventListener('pointermove', (e) => { mouse = { x: e.clientX, y: e.clientY }; }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { mouse = null; });
}

/** Send a ring of accent through every field, centered on a viewport point. */
export function pulseAt(clientX: number, clientY: number) {
  pulse = { x: clientX, y: clientY, at: performance.now() };
}

function rgb(value: string): [number, number, number] {
  const hex = value.trim().replace('#', '');
  const full = hex.length === 3 ? hex.split('').map((ch) => ch + ch).join('') : hex;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255) as [number, number, number];
}

function palette() {
  const css = getComputedStyle(document.documentElement);
  return {
    bg: rgb(css.getPropertyValue('--bg') || '#000000'),
    dot: rgb(css.getPropertyValue('--muted') || '#71767b'),
    acc: rgb(css.getPropertyValue('--accent') || '#1d9bf0'),
  };
}

export function startDotField(canvas: HTMLCanvasElement, opts: DotFieldOptions): () => void {
  let gl: WebGLRenderingContext | null = null;
  try {
    gl = canvas.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: true });
  } catch {
    gl = null;
  }
  if (!gl) return () => {};

  const compile = (type: number, src: string) => {
    const s = gl!.createShader(type)!;
    gl!.shaderSource(s, src);
    gl!.compileShader(s);
    return s;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return () => {};
  gl.useProgram(prog);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const names = ['u_res', 'u_dpr', 'u_time', 'u_mouse', 'u_mouseOn', 'u_bg', 'u_dot', 'u_acc', 'u_pulse', 'u_cell', 'u_mask', 'u_clear', 'u_tex'];
  const U: Record<string, WebGLUniformLocation | null> = {};
  names.forEach((n) => { U[n] = gl!.getUniformLocation(prog, n); });

  const isWordmark = opts.mode === 'wordmark';
  let tex: WebGLTexture | null = null;
  let texKey = '';

  const makeMask = (w: number, h: number) => {
    // An offscreen 2D canvas, used only as a texture.
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const x = c.getContext('2d')!;
    const text = opts.text ?? 'XMarks';
    const fontAt = (size: number) => `800 ${size}px ${opts.fontFamily ?? 'sans-serif'}`;
    x.font = fontAt(100);
    if ('letterSpacing' in x) (x as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '-3px';
    const size = Math.floor((100 * (w * 0.97)) / x.measureText(text).width);
    x.font = fontAt(size);
    if ('letterSpacing' in x) (x as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${-size * 0.03}px`;
    x.fillStyle = '#ffffff';
    x.textAlign = 'center';
    x.textBaseline = 'alphabetic';
    // Baseline just below the bottom edge, so the letters are cropped slightly.
    x.fillText(text, w / 2, h + size * 0.05);

    if (!tex) tex = gl!.createTexture();
    gl!.bindTexture(gl!.TEXTURE_2D, tex);
    gl!.pixelStorei(gl!.UNPACK_FLIP_Y_WEBGL, false);
    gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, gl!.RGBA, gl!.UNSIGNED_BYTE, c);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.NEAREST);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.NEAREST);
  };

  if (isWordmark && document.fonts) {
    // Redraw the letters once the webfont has arrived.
    document.fonts.load(`800 100px ${opts.fontFamily ?? 'sans-serif'}`, opts.text ?? 'XMarks').then(() => { texKey = ''; }).catch(() => {});
  }

  listen();
  let colors = palette();
  const onAccent = () => { colors = palette(); };
  window.addEventListener(ACCENT_EVENT, onAccent);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const t0 = performance.now();
  // Start the clock mid-scroll so the timeline is already populated on first paint.
  const clock = (ms: number) => (reduce ? 12 : 12 + (ms - t0) / 1000);
  const lensState = { x: -9999, y: -9999, on: 0 };
  let visible = true;
  const io = new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; });
  io.observe(canvas);

  let raf = 0;
  const frame = () => {
    raf = requestAnimationFrame(frame);
    if (!visible) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pw = Math.round(w * dpr);
    const ph = Math.round(h * dpr);
    if (canvas.width !== pw || canvas.height !== ph) {
      canvas.width = pw;
      canvas.height = ph;
    }
    gl!.viewport(0, 0, pw, ph);
    if (isWordmark && texKey !== `${w}x${h}`) {
      makeMask(w, h);
      texKey = `${w}x${h}`;
    }

    const box = canvas.getBoundingClientRect();
    const tx = mouse ? mouse.x - box.left : -9999;
    const ty = mouse ? mouse.y - box.top : -9999;
    const near = !!mouse && tx > -240 && tx < w + 240 && ty > -240 && ty < h + 240;
    if (lensState.x < -9000 && mouse) {
      lensState.x = tx;
      lensState.y = ty;
    }
    lensState.x += (tx - lensState.x) * 0.14;
    lensState.y += (ty - lensState.y) * 0.14;
    lensState.on += ((near ? 1 : 0) - lensState.on) * 0.06;

    let clear: [number, number, number, number] = [w / 2, 330, Math.min(620, w * 0.46), 200];
    if (opts.clearTarget) {
      const r = opts.clearTarget.getBoundingClientRect();
      clear = [r.left - box.left + r.width / 2, r.top - box.top + r.height / 2, Math.max(160, r.width * 0.62), Math.max(120, r.height * 0.72)];
    }

    gl!.uniform2f(U.u_res, pw, ph);
    gl!.uniform1f(U.u_dpr, dpr);
    gl!.uniform1f(U.u_time, clock(performance.now()));
    gl!.uniform2f(U.u_mouse, lensState.x, lensState.y);
    gl!.uniform1f(U.u_mouseOn, lensState.on);
    gl!.uniform3fv(U.u_bg, colors.bg);
    gl!.uniform3fv(U.u_dot, colors.dot);
    gl!.uniform3fv(U.u_acc, colors.acc);
    gl!.uniform3f(U.u_pulse, pulse ? pulse.x - box.left : -9999, pulse ? pulse.y - box.top : -9999, pulse && !reduce ? clock(pulse.at) : -99);
    gl!.uniform1f(U.u_cell, opts.cell);
    gl!.uniform1f(U.u_mask, isWordmark ? 1 : 0);
    gl!.uniform4f(U.u_clear, clear[0], clear[1], clear[2], clear[3]);
    if (tex) {
      gl!.activeTexture(gl!.TEXTURE0);
      gl!.bindTexture(gl!.TEXTURE_2D, tex);
      gl!.uniform1i(U.u_tex, 0);
    }
    gl!.drawArrays(gl!.TRIANGLES, 0, 3);
  };
  frame();

  return () => {
    cancelAnimationFrame(raf);
    io.disconnect();
    window.removeEventListener(ACCENT_EVENT, onAccent);
    gl!.getExtension('WEBGL_lose_context')?.loseContext();
  };
}
