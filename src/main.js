import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

import { createRenderer, createComposer } from './core/renderer.js'
import { loadAssets } from './core/textures.js'
import { createEnvMap, createMaterials } from './core/materials.js'
import { createPhysics } from './core/physics.js'
import { FairyLights } from './core/fairy.js'

import { createSky, createGround, createSnow, createForest, MOON_DIR } from './world/atmosphere.js'
import { createTree } from './world/tree.js'
import { createStall } from './world/stall.js'
import { createCarousel } from './world/carousel.js'
import { createRink } from './world/rink.js'
import { createProps } from './world/props.js'
import { createPhysicsProps } from './world/physicsProps.js'
import { createUI } from './ui.js'

const loaderEl = document.getElementById('loader')
const loaderFill = document.getElementById('loader-fill')
const loaderText = document.getElementById('loader-text')

async function start() {
    /* ---------- завантаження ресурсів ---------- */
    const assets = await loadAssets((p) => { loaderFill.style.width = `${Math.round(p * 100)}%` })
    loaderText.textContent = 'Будуємо ярмарок…'
    await new Promise((r) => requestAnimationFrame(r))

    /* ---------- рендерер, сцена, камера ---------- */
    const canvas = document.getElementById('scene')
    const renderer = createRenderer(canvas)

    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2('#0d1830', 0.011)

    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.3, 1200)
    camera.position.set(0, 9, 38)

    const controls = new OrbitControls(camera, canvas)
    controls.target.set(0, 3.5, 0)
    controls.enableDamping = true
    controls.minDistance = 4
    controls.maxDistance = 90
    controls.maxPolarAngle = Math.PI / 2 - 0.02
    controls.autoRotateSpeed = 0.6
    controls.update()

    const { composer, bloom, grade } = createComposer(renderer, scene, camera)

    /* ---------- спільні об'єкти ---------- */
    const envMap = createEnvMap(renderer)
    const materials = createMaterials(assets, envMap)
    const physics = createPhysics()
    const fairy = new FairyLights(materials.wire)
    const warmLights = []
    const updaters = []
    const ctx = { scene, materials, fairy, physics, lights: warmLights, updaters }

    /* ---------- небо, земля, сніг ---------- */
    const sky = createSky()
    scene.add(sky.mesh)
    scene.add(createGround(materials))
    scene.add(createForest(materials))
    const snow = createSnow(renderer)
    scene.add(snow.points)

    /* ---------- освітлення ---------- */
    const hemi = new THREE.HemisphereLight('#5a78b8', '#1b2540', 0.55)
    scene.add(hemi)

    const moon = new THREE.DirectionalLight('#a9c4ff', 1.2)
    moon.position.copy(MOON_DIR).multiplyScalar(90)
    moon.castShadow = true
    moon.shadow.mapSize.set(4096, 4096)
    moon.shadow.camera.left = -55
    moon.shadow.camera.right = 55
    moon.shadow.camera.top = 55
    moon.shadow.camera.bottom = -55
    moon.shadow.camera.near = 1
    moon.shadow.camera.far = 220
    moon.shadow.bias = -0.0003
    moon.shadow.normalBias = 0.04
    scene.add(moon)

    /* ---------- об'єкти ярмарку ---------- */
    const treePosition = new THREE.Vector3(0, 0, -6)
    const tree = createTree({ materials, fairy, position: treePosition, lights: warmLights })
    scene.add(tree.group)
    physics.addStaticBox(treePosition.x, 6, treePosition.z, 1.2, 6, 1.2)
    physics.addStaticBox(treePosition.x, 0.25, treePosition.z, 1.1, 0.25, 1.1)

    const stalls = [
        { name: 'Глінтвейн', kind: 'mulled', accent: '#b3262e', x: -10, z: -17, rot: 0, smoke: true },
        { name: 'Пряники', kind: 'gingerbread', accent: '#c9772b', x: 0, z: -17, rot: 0 },
        { name: 'Іграшки', kind: 'toys', accent: '#2d6fd6', x: 10, z: -17, rot: 0 },
        { name: 'Гарячий шоколад', kind: 'chocolate', accent: '#a0407a', x: -20, z: -17, rot: 0 },
        { name: 'Каштани', kind: 'chestnuts', accent: '#7a4b2a', x: 20, z: -17, rot: 0, smoke: true },
        { name: 'Цукерки', kind: 'candy', accent: '#d94f8a', x: -11, z: -5, rot: Math.PI / 2 },
        { name: 'Шапки та шарфи', kind: 'hats', accent: '#2a9d8f', x: 11, z: -5, rot: -Math.PI / 2, smoke: true }
    ]
    stalls.forEach((s, i) => {
        const stall = createStall(ctx, {
            name: s.name, kind: s.kind, accent: s.accent,
            position: new THREE.Vector3(s.x, 0, s.z), rotationY: s.rot, smoke: s.smoke, seed: i + 1
        })
        scene.add(stall)
    })

    const carousel = createCarousel(ctx, { position: new THREE.Vector3(15, 0, 10) })
    scene.add(carousel.group)

    const rink = createRink(ctx, { center: new THREE.Vector3(-14, 0, 12), size: { x: 20, z: 12 } })
    scene.add(rink.group)

    createProps(ctx)

    const physicsProps = createPhysicsProps(ctx, {
        treePosition,
        snowmanSpots: [[5.5, 4], [7.8, 5.8], [4.2, 7.2]]
    })

    fairy.build(scene)
    warmLights.forEach((l) => { l.userData.base = l.intensity })

    /* ---------- якість рендеру ---------- */
    const QUALITY = {
        'Низька': { pixelRatio: 1, shadow: 1024, bloom: false },
        'Середня': { pixelRatio: 1.5, shadow: 2048, bloom: true },
        'Висока': { pixelRatio: 2, shadow: 4096, bloom: true }
    }
    function applyQuality(name) {
        const q = QUALITY[name]
        const pr = Math.min(window.devicePixelRatio, q.pixelRatio)
        renderer.setPixelRatio(pr)
        composer.setPixelRatio(pr)
        composer.setSize(window.innerWidth, window.innerHeight)
        snow.material.uniforms.uPixelRatio.value = pr

        moon.shadow.mapSize.set(q.shadow, q.shadow)
        if (moon.shadow.map) {
            moon.shadow.map.dispose()
            moon.shadow.map = null
        }
        bloom.enabled = q.bloom
    }

    /* ---------- інтерфейс ---------- */
    createUI({
        scene, renderer, composer, bloom, grade, moon, hemi, fairy, warmLights, sky, snow,
        controls, carousel: carousel, rink, physicsProps, physics, applyQuality
    })

    /* ---------- кидання сніжок кліком ---------- */
    const raycaster = new THREE.Raycaster()
    const ndc = new THREE.Vector2()
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    const hit = new THREE.Vector3()
    let down = null

    canvas.addEventListener('pointerdown', (e) => {
        down = { x: e.clientX, y: e.clientY, t: performance.now() }
    })
    canvas.addEventListener('pointerup', (e) => {
        if (!down || e.button !== 0) return
        const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y)
        const duration = performance.now() - down.t
        down = null
        if (moved > 6 || duration > 350) return          // це було обертання камери, а не клік

        ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1)
        raycaster.setFromCamera(ndc, camera)
        const ray = raycaster.ray

        const target = ray.intersectPlane(groundPlane, hit) && hit.distanceTo(camera.position) < 90
            ? hit.clone()
            : ray.origin.clone().addScaledVector(ray.direction, 40)
        const from = camera.position.clone().addScaledVector(ray.direction, 1.5)
        from.y -= 0.25
        physicsProps.throwSnowball(from, target)
    })

    /* ---------- зміна розміру ---------- */
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight
        camera.updateProjectionMatrix()
        renderer.setSize(window.innerWidth, window.innerHeight)
        composer.setSize(window.innerWidth, window.innerHeight)
    })

    /* ---------- головний цикл ---------- */
    const clock = new THREE.Clock()
    let time = 0
    let cleanupTimer = 0

    function tick() {
        const dt = Math.min(clock.getDelta(), 0.05)
        time += dt

        controls.update()
        physics.step(dt)

        cleanupTimer += dt
        if (cleanupTimer > 1) {
            cleanupTimer = 0
            physicsProps.cleanup()
        }

        tree.update(time)
        carousel.update(time, dt)
        rink.update(time, dt)
        for (const u of updaters) u(time, dt)
        fairy.update(time)

        sky.update(time, camera)
        snow.update(time)
        grade.uniforms.uTime.value = time

        composer.render()
        requestAnimationFrame(tick)
    }
    tick()

    // прибираємо екран завантаження
    loaderEl.classList.add('hidden')
    setTimeout(() => loaderEl.remove(), 1000)

    // для відлагодження в консолі: window.__app
    window.__app = { scene, renderer, physics }
}

start().catch((err) => {
    console.error(err)
    loaderText.textContent = 'Помилка: ' + err.message + ' (дивись консоль F12)'
})
