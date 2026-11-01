/**
 * ШЕЙДЕР №2 — нічне небо: градієнт, мерехтливі зірки, місяць і північне сяйво (аврора).
 * Малюється на внутрішній стороні великої сфери, що рухається разом з камерою.
 */
export const SkyShader = {
    vertexShader: /* glsl */`
        varying vec3 vDir;
        void main() {
            vDir = normalize(position);
            vec4 pos = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * pos;
        }
    `,

    fragmentShader: /* glsl */`
        uniform float uTime;
        uniform vec3 uMoonDir;
        uniform float uAurora;
        varying vec3 vDir;

        float hash11(float p) { p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
        float hash31(vec3 p) {
            p = fract(p * 0.1031);
            p += dot(p, p.zyx + 31.32);
            return fract((p.x + p.y) * p.z);
        }
        float hash21(vec2 p) {
            p = fract(p * vec2(123.34, 456.21));
            p += dot(p, p + 45.32);
            return fract(p.x * p.y);
        }
        float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
                       mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x), f.y);
        }
        float fbm(vec2 p) {
            float v = 0.0;
            float a = 0.5;
            for (int i = 0; i < 4; i++) {
                v += a * noise(p);
                p *= 2.03;
                a *= 0.5;
            }
            return v;
        }

        void main() {
            vec3 d = normalize(vDir);
            float h = clamp(d.y, 0.0, 1.0);

            // градієнт неба
            vec3 horizon = vec3(0.045, 0.075, 0.17);
            vec3 zenith = vec3(0.002, 0.005, 0.02);
            vec3 col = mix(horizon, zenith, pow(h, 0.45));

            // зірки
            vec3 p = d * 170.0;
            vec3 id = floor(p);
            float r = hash31(id);
            vec3 f = fract(p) - 0.5;
            float star = step(0.9965, r) * smoothstep(0.38, 0.0, length(f));
            float tw = 0.65 + 0.35 * sin(uTime * 2.0 + r * 120.0);
            col += vec3(0.85, 0.9, 1.0) * star * tw * 1.6 * smoothstep(0.02, 0.25, d.y);

            // місяць + ореол
            float md = max(dot(d, normalize(uMoonDir)), 0.0);
            col += vec3(1.0, 0.96, 0.85) * smoothstep(0.9993, 0.9997, md) * 4.0;
            col += vec3(0.35, 0.45, 0.8) * pow(md, 90.0) * 0.5;
            col += vec3(0.12, 0.16, 0.3) * pow(md, 8.0) * 0.4;

            // аврора: хвилясті стрічки + промені
            vec2 uv = d.xz / max(d.y + 0.25, 0.05);
            float n = fbm(vec2(uv.x * 0.55 + uTime * 0.025, uTime * 0.02));
            float ribbon = smoothstep(0.42, 0.0, abs(uv.y * 0.28 - 0.95 + n * 1.5));
            float ribbon2 = smoothstep(0.30, 0.0, abs(uv.y * 0.28 - 1.55 + n * 1.2)) * 0.6;
            float rays = 0.55 + 0.45 * noise(vec2(uv.x * 9.0, uTime * 0.35));
            float fade = smoothstep(0.04, 0.3, d.y) * smoothstep(0.98, 0.45, d.y);
            vec3 aurora = mix(vec3(0.08, 1.0, 0.45), vec3(0.65, 0.22, 1.0), smoothstep(0.25, 1.1, n + uv.y * 0.08));
            col += aurora * (ribbon + ribbon2) * rays * fade * uAurora * 0.5;

            gl_FragColor = vec4(col, 1.0);
        }
    `
}
