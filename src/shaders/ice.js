/**
 * ШЕЙДЕР №1 — крига.
 * Працює разом з Reflector (він дає текстуру tDiffuse з відображенням сцени).
 * До відображення додаємо:
 *  - ефект Френеля (під пологим кутом крига дзеркальніша),
 *  - подряпини від ковзанів (текстура uMarks) і шум, що "ламає" відображення,
 *  - блиски від гірлянд (Blinn-Phong для 6 кольорових джерел),
 *  - мерехтливі іскорки.
 * Імена uniform tDiffuse / textureMatrix / color обов'язкові для Reflector.
 */
export const IceShader = {
    name: 'IceShader',

    uniforms: {
        color: { value: null },
        tDiffuse: { value: null },
        textureMatrix: { value: null },
        uMarks: { value: null },
        uTime: { value: 0 },
        uCenter: { value: null },
        uSize: { value: null },
        uReflectivity: { value: 0.55 },
        uLightPos: { value: [] },
        uLightCol: { value: [] }
    },

    vertexShader: /* glsl */`
        uniform mat4 textureMatrix;
        varying vec4 vReflectUv;
        varying vec3 vWorld;

        void main() {
            vReflectUv = textureMatrix * vec4(position, 1.0);
            vec4 world = modelMatrix * vec4(position, 1.0);
            vWorld = world.xyz;
            gl_Position = projectionMatrix * viewMatrix * world;
        }
    `,

    fragmentShader: /* glsl */`
        uniform vec3 color;
        uniform sampler2D tDiffuse;
        uniform sampler2D uMarks;
        uniform float uTime;
        uniform vec2 uCenter;
        uniform vec2 uSize;
        uniform float uReflectivity;
        uniform vec3 uLightPos[6];
        uniform vec3 uLightCol[6];

        varying vec4 vReflectUv;
        varying vec3 vWorld;

        float hash21(vec2 p) {
            p = fract(p * vec2(123.34, 456.21));
            p += dot(p, p + 45.32);
            return fract(p.x * p.y);
        }

        float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            float a = hash21(i);
            float b = hash21(i + vec2(1.0, 0.0));
            float c = hash21(i + vec2(0.0, 1.0));
            float d = hash21(i + vec2(1.0, 1.0));
            return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        void main() {
            // подряпини від ковзанів
            vec2 rinkUv = (vWorld.xz - uCenter) / uSize + 0.5;
            float marks = texture2D(uMarks, rinkUv).r;

            // шум, що трохи спотворює відображення
            float n1 = noise(vWorld.xz * 1.7 + uTime * 0.02);
            float n2 = noise(vWorld.xz * 5.3 - 11.0);

            vec4 proj = vReflectUv;
            proj.xy += (vec2(n1, n2) - 0.5) * (0.012 + marks * 0.05) * proj.w;
            vec3 reflection = texture2DProj(tDiffuse, proj).rgb;

            // Френель
            vec3 V = normalize(cameraPosition - vWorld);
            float fresnel = pow(1.0 - clamp(V.y, 0.0, 1.0), 4.0);
            float k = mix(uReflectivity, 1.0, fresnel);

            // власний колір криги: темно-блакитна глибина, світліші подряпини
            vec3 body = mix(vec3(0.04, 0.10, 0.16), vec3(0.45, 0.62, 0.78), marks * 0.7 + n1 * 0.25);
            vec3 col = body * (1.0 - 0.5 * k) + reflection * k * (1.0 - marks * 0.35);

            // блиски від гірлянд
            for (int i = 0; i < 6; i++) {
                vec3 L = uLightPos[i] - vWorld;
                float d = length(L);
                L /= d;
                vec3 H = normalize(L + V);
                float h = max(H.y, 0.0);
                float spec = pow(h, 180.0) + 0.15 * pow(h, 30.0) * marks;
                col += uLightCol[i] * spec * (10.0 / (1.0 + d * d * 0.04));
            }

            // іскорки
            vec2 cell = floor(vWorld.xz * 55.0);
            float rnd = hash21(cell);
            float twinkle = step(0.9985, rnd) * (0.5 + 0.5 * sin(uTime * 6.0 + rnd * 200.0));
            col += vec3(0.9, 0.95, 1.0) * twinkle * 1.8 * (0.3 + marks);

            gl_FragColor = vec4(col, 1.0);
        }
    `
}
