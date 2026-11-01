/**
 * ШЕЙДЕР №3 — сніг. Усю анімацію (падіння, вітер, мерехтіння) рахує відеокарта:
 * на процесорі лише оновлюється uniform uTime, тому 14 000 сніжинок майже "безкоштовні".
 */
export const SnowShader = {
    vertexShader: /* glsl */`
        uniform float uTime;
        uniform vec3 uBox;
        uniform float uWind;
        uniform float uSize;
        uniform float uPixelRatio;
        uniform float uDensity;
        attribute vec4 aSeed;
        varying float vAlpha;

        void main() {
            vec3 p = position;
            float speed = 0.8 + aSeed.x * 1.4;

            p.y = mod(p.y - uTime * speed, uBox.y);
            p.x += sin(uTime * 0.6 + aSeed.y * 20.0) * 0.6 + uTime * uWind * (0.3 + aSeed.z);
            p.z += cos(uTime * 0.5 + aSeed.w * 20.0) * 0.6;
            p.x = mod(p.x + uBox.x * 0.5, uBox.x) - uBox.x * 0.5;
            p.z = mod(p.z + uBox.z * 0.5, uBox.z) - uBox.z * 0.5;

            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * mv;

            float size = uSize * (0.5 + aSeed.z);
            gl_PointSize = size * uPixelRatio * (42.0 / -mv.z);

            float keep = step(fract(aSeed.x * 37.1), uDensity);
            float twinkle = 0.65 + 0.35 * sin(uTime * 3.0 + aSeed.z * 40.0);
            vAlpha = keep * twinkle;
        }
    `,

    fragmentShader: /* glsl */`
        varying float vAlpha;

        void main() {
            float d = length(gl_PointCoord - 0.5);
            float a = smoothstep(0.5, 0.12, d) * vAlpha;
            if (a < 0.01) discard;
            gl_FragColor = vec4(vec3(1.0, 1.0, 1.05) * 1.3, a * 0.9);
        }
    `
}

/**
 * ШЕЙДЕР №4 — фінальна "кінематографічна" обробка кадру (пост-ефект):
 * віньєтка, колірна градація (холодні тіні, теплі світла) і легке плівкове зерно.
 */
export const GradeShader = {
    uniforms: {
        tDiffuse: { value: null },
        uTime: { value: 0 },
        uVignette: { value: 0.55 },
        uGrain: { value: 0.035 },
        uWarm: { value: 0.6 }
    },

    vertexShader: /* glsl */`
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,

    fragmentShader: /* glsl */`
        uniform sampler2D tDiffuse;
        uniform float uTime;
        uniform float uVignette;
        uniform float uGrain;
        uniform float uWarm;
        varying vec2 vUv;

        float hash(vec2 p) {
            p = fract(p * vec2(443.897, 441.423));
            p += dot(p, p.yx + 19.19);
            return fract((p.x + p.y) * p.x);
        }

        void main() {
            vec4 c = texture2D(tDiffuse, vUv);

            // віньєтка
            vec2 d = vUv - 0.5;
            float v = 1.0 - dot(d, d) * uVignette * 2.4;
            c.rgb *= clamp(v, 0.0, 1.0);

            // градація: холодні тіні, теплі світла
            float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
            vec3 cool = c.rgb * vec3(0.92, 0.98, 1.12);
            vec3 warm = c.rgb * vec3(1.10, 1.0, 0.90);
            c.rgb = mix(cool, warm, smoothstep(0.15, 1.6, l) * uWarm);

            // зерно
            c.rgb += (hash(vUv * vec2(1920.0, 1080.0) + fract(uTime)) - 0.5) * uGrain;

            gl_FragColor = c;
        }
    `
}
