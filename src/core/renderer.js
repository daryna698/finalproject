import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { GradeShader } from '../shaders/snow.js'

/**
 * Рендерер + постобробка:
 *  RenderPass (сцена, MSAA 4x, HDR) → Bloom (сяйво гірлянд) → Grade (шейдер: віньєтка, градація, зерно)
 *  → OutputPass (тонмаппінг ACES + sRGB).
 */
export function createRenderer(canvas) {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(window.innerWidth, window.innerHeight)

    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap

    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.0
    renderer.outputColorSpace = THREE.SRGBColorSpace

    return renderer
}

export function createComposer(renderer, scene, camera) {
    const width = window.innerWidth
    const height = window.innerHeight
    const pixelRatio = renderer.getPixelRatio()

    const target = new THREE.WebGLRenderTarget(width * pixelRatio, height * pixelRatio, {
        type: THREE.HalfFloatType,   // HDR: яскраві гірлянди не "обрізаються" до 1.0
        samples: 4                   // MSAA — згладжування країв
    })

    const composer = new EffectComposer(renderer, target)
    composer.setPixelRatio(pixelRatio)
    composer.setSize(width, height)

    composer.addPass(new RenderPass(scene, camera))

    const bloom = new UnrealBloomPass(new THREE.Vector2(width, height), 0.55, 0.65, 1.0)
    composer.addPass(bloom)

    const grade = new ShaderPass(GradeShader)
    composer.addPass(grade)

    composer.addPass(new OutputPass())

    return { composer, bloom, grade }
}
