// Living background: "silk light" — domain-warped ribbons of light in the part's colour over deep night,
// with an anamorphic flare that sweeps through on every click. Rendered at reduced resolution (it is soft
// by nature) so it stays smooth on a laptop iGPU driving a projector.
const canvas = document.getElementById('bg');
const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' });

const FRAG = `precision highp float;
uniform vec2 uRes; uniform float uT, uE, uAmt, uSpin, uFlare;
uniform vec3 uC1, uC2; uniform vec2 uF, uFlow;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
  return mix(mix(h(i), h(i+vec2(1.,0.)), f.x), mix(h(i+vec2(0.,1.)), h(i+1.), f.x), f.y); }
float fbm(vec2 p){ float v = 0., a = .5; mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 5; i++){ v += a*n(p); p = m*p; a *= .5; } return v; }
void main(){
  vec2 p = (gl_FragCoord.xy - .5*uRes) / uRes.y;
  vec2 fp = (uF - .5) * vec2(uRes.x/uRes.y, 1.); fp.y = -fp.y;
  float t = uT * .035;
  float a = uT * .02 * uSpin; mat2 R = mat2(cos(a), -sin(a), sin(a), cos(a));
  vec2 s = R * (p - fp) + fp + uFlow;
  vec2 q = vec2(fbm(s*1.3 + vec2(0., t)), fbm(s*1.3 + vec2(5.2, 1.3) - t));
  vec2 r = vec2(fbm(s*1.1 + 3.2*q + vec2(1.7, 9.2) + t*1.4), fbm(s*1.1 + 3.2*q + vec2(8.3, 2.8) - t));
  float f = fbm(s*1.05 + 2.6*r);
  float silk = pow(smoothstep(.38, .98, f), 2.4);
  float band = exp(-pow((f - .6) * 10., 2.));
  float d = length(p - fp);
  float glow = exp(-d*d*1.8);
  vec3 col = mix(uC2, uC1, clamp(r.x*1.5 - .25, 0., 1.));
  vec3 c = col * (silk*.6 + band*.4) * (.25 + 1.1*glow) * uAmt;
  c += uC1 * glow * .05 * (1. + uE*2.5);
  c += col * band * uE * .55 * glow;
  // anamorphic flare through the focus line
  float fl = exp(-abs(p.y - fp.y) * 90.) * exp(-abs(p.x - fp.x) * .9) + exp(-abs(p.y - fp.y) * 14.) * .12;
  c += mix(uC1, vec3(1.), .35) * fl * uFlare * .9;
  // sparse breathing stars
  vec2 g = floor(gl_FragCoord.xy / 2.); float st = h(g);
  c += step(.9975, st) * vec3(.55) * (.35 + .65 * sin(uT*1.3 + st*80.)) * (1. - glow*.6);
  c *= smoothstep(1.35, .2, length(p * vec2(.78, 1.)));
  c = 1. - exp(-c * 1.35);
  gl_FragColor = vec4(c + vec3(.022, .028, .042), 1.);
}`;
const VERT = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }';

const S = { c1: [255, 122, 26], c2: [40, 50, 110], fx: 0.5, fy: 0.5, amt: 1, spin: 0, flowx: 0, flowy: 0, e: 0, flare: 0 };
const T = { ...S, c1: [...S.c1], c2: [...S.c2] };
const MODES = { drift: [0.15, 0.05, 0], rise: [0, 1, 0], fall: [0, -1, 0], orbit: [0, 0, 1.4] };

export function setBg(o) {
  if (o.hue) T.c1 = o.hue.slice();
  if (o.hue2) T.c2 = o.hue2.slice(); else if (o.hue) T.c2 = [o.hue[0] * 0.18 + 30, o.hue[1] * 0.16 + 36, o.hue[2] * 0.2 + 90];
  if (o.fx !== undefined) T.fx = o.fx;
  if (o.fy !== undefined) T.fy = o.fy;
  T.amt = o.amt ?? (0.75 + (o.pull || 0) * 0.5);
  const m = MODES[o.mode] || MODES.drift;
  T.flowx = m[0] * (o.speed || 1); T.flowy = m[1] * (o.speed || 1); T.spin = m[2];
}
export function pulse(k = 1) { S.e = Math.min(1.4, S.e + 0.9 * k); S.flare = Math.min(1.2, S.flare + 1 * k); }

let prog, U = {};
// Resolution follows the real (physical) pixels of the screen so a 4K wall stays crisp, capped at
// ~2200 px wide internally (the silk is soft by nature); 'quality' drops by itself on slow GPUs.
let quality = 1, W = 0, H = 0;
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 3), pw = innerWidth * dpr, ph = innerHeight * dpr;
  const k = Math.min(0.6, 2200 / pw) * quality;
  W = Math.max(2, Math.round(pw * k)); H = Math.max(2, Math.round(ph * k));
  canvas.width = W; canvas.height = H;
  gl && gl.viewport(0, 0, W, H);
}
if (gl) {
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s)); return s; };
  prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG)); gl.linkProgram(prog); gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  for (const u of ['uRes', 'uT', 'uE', 'uAmt', 'uSpin', 'uFlare', 'uC1', 'uC2', 'uF', 'uFlow']) U[u] = gl.getUniformLocation(prog, u);
}
addEventListener('resize', resize); resize();
matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`).addEventListener?.('change', resize); // moved to another screen

// keep frame time honest on weak GPUs: drop resolution if we fall behind
let last = performance.now(), slow = 0, flowX = 0, flowY = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (dt > 0.034 && quality > 0.45) { if (++slow > 40) { quality -= 0.12; resize(); slow = 0; } } else slow = Math.max(0, slow - 1);
  const k = Math.min(1, dt * 1.2);
  for (const key of ['fx', 'fy', 'amt', 'spin', 'flowx', 'flowy']) S[key] += (T[key] - S[key]) * k;
  for (let i = 0; i < 3; i++) { S.c1[i] += (T.c1[i] - S.c1[i]) * k; S.c2[i] += (T.c2[i] - S.c2[i]) * k; }
  S.e = Math.max(0, S.e - dt * 0.8); S.flare = Math.max(0, S.flare - dt * 1.6);
  flowX -= S.flowx * dt * 0.05; flowY -= S.flowy * dt * 0.05; // sampling backwards = ribbons drift forwards
  if (gl) {
    gl.uniform2f(U.uRes, W, H); gl.uniform1f(U.uT, now / 1000); gl.uniform1f(U.uE, S.e); gl.uniform1f(U.uAmt, S.amt);
    gl.uniform1f(U.uSpin, S.spin); gl.uniform1f(U.uFlare, S.flare);
    gl.uniform3f(U.uC1, S.c1[0] / 255, S.c1[1] / 255, S.c1[2] / 255); gl.uniform3f(U.uC2, S.c2[0] / 255, S.c2[1] / 255, S.c2[2] / 255);
    gl.uniform2f(U.uF, S.fx, S.fy); gl.uniform2f(U.uFlow, flowX, flowY);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
