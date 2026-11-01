import * as THREE from 'three'
import { SkyShader } from '../shaders/sky.js'
import { SnowShader } from '../shaders/snow.js'
import { createRandom } from '../core/random.js'

export const MOON_DIR = new THREE.Vector3(-0.45, 0.62, -0.64).normalize()

/** Небо з авророю (шейдер) — сфера, що рухається разом з камерою. */
export function createSky() {
    const material = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uMoonDir: { value: MOON_DIR.clone() },
            uAurora: { value: 1 }
        },
        vertexShader: SkyShader.vertexShader,
        fragmentShader: SkyShader.fragmentShader,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false
    })
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(500, 48, 32), material)
    mesh.renderOrder = -1
    mesh.frustumCulled = false
    return {
        mesh,
        material,
        update(time, camera) {
            material.uniforms.uTime.value = time
            mesh.position.copy(camera.position)
        }
    }
}

/** Засніжена земля (файлові текстури). */
export function createGround(materials) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), materials.ground)
    mesh.rotation.x = -Math.PI / 2
    mesh.receiveShadow = true
    return mesh
}

/** Сніг: 14 000 точок, уся анімація — у вершинному шейдері. */
export function createSnow(renderer) {
    const COUNT = 14000
    const box = new THREE.Vector3(110, 38, 110)
    const rnd = createRandom(404)

    const positions = new Float32Array(COUNT * 3)
    const seeds = new Float32Array(COUNT * 4)
    for (let i = 0; i < COUNT; i++) {
        positions[i * 3] = (rnd() - 0.5) * box.x
        positions[i * 3 + 1] = rnd() * box.y
        positions[i * 3 + 2] = (rnd() - 0.5) * box.z
        for (let k = 0; k < 4; k++) seeds[i * 4 + k] = rnd()
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4))

    const material = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uBox: { value: box },
            uWind: { value: 0.6 },
            uSize: { value: 1.3 },
            uPixelRatio: { value: renderer.getPixelRatio() },
            uDensity: { value: 1 }
        },
        vertexShader: SnowShader.vertexShader,
        fragmentShader: SnowShader.fragmentShader,
        transparent: true,
        depthWrite: false
    })

    const points = new THREE.Points(geometry, material)
    points.frustumCulled = false

    return {
        points,
        material,
        update(time) { material.uniforms.uTime.value = time }
    }
}

/** Ялинковий ліс навколо площі: 2 InstancedMesh (хвоя + сніг). */
export function createForest(materials) {
    const rnd = createRandom(909)
    const COUNT = 150

    const treeGeometry = new THREE.ConeGeometry(1, 3.2, 8, 1)
    treeGeometry.translate(0, 1.6, 0)
    const capGeometry = new THREE.ConeGeometry(0.72, 1.7, 8, 1)
    capGeometry.translate(0, 2.4, 0)

    const treeMaterial = new THREE.MeshStandardMaterial({ color: '#17402a', roughness: 0.95 })
    const trees = new THREE.InstancedMesh(treeGeometry, treeMaterial, COUNT)
    const caps = new THREE.InstancedMesh(capGeometry, materials.snow, COUNT)

    const dummy = new THREE.Object3D()
    for (let i = 0; i < COUNT; i++) {
        const angle = rnd() * Math.PI * 2
        const radius = 52 + rnd() * 60
        const scale = 3 + rnd() * 4.5
        dummy.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius)
        dummy.rotation.set(0, rnd() * 6, 0)
        dummy.scale.set(scale * 0.8, scale, scale * 0.8)
        dummy.updateMatrix()
        trees.setMatrixAt(i, dummy.matrix)
        caps.setMatrixAt(i, dummy.matrix)
    }
    trees.castShadow = true
    caps.castShadow = true
    trees.frustumCulled = false
    caps.frustumCulled = false

    const group = new THREE.Group()
    group.add(trees, caps)
    return group
}
