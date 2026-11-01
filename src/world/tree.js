import * as THREE from 'three'
import { createRandom } from '../core/random.js'
import { PALETTE } from '../core/fairy.js'

const HEIGHT = 11.5
const BASE_Y = 1.3
const R0 = 3.7

// Радіус ялинки на заданій висоті (для розміщення гірлянд і кульок)
const radiusAt = (y) => {
    const t = THREE.MathUtils.clamp((y - BASE_Y) / (HEIGHT - BASE_Y - 0.5), 0, 1)
    return R0 * (1 - t * 0.9) * 0.92 + 0.15
}

/**
 * Один ярус ялинки: конус із "обвислим" краєм, кольорами вершин
 * (зелень → сніг на верхніх гілках) і трохи неправильною формою.
 */
function makeTierGeometry(radius, height, seed) {
    const geometry = new THREE.ConeGeometry(radius, height, 44, 5, true)
    const pos = geometry.attributes.position
    const colors = new Float32Array(pos.count * 3)

    const green = new THREE.Color('#1c5530')
    const green2 = new THREE.Color('#2f7a43')
    const white = new THREE.Color('#f4f8ff')
    const c = new THREE.Color()

    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i)
        const y = pos.getY(i)
        const z = pos.getZ(i)
        const yy = (y + height / 2) / height          // 0 унизу ... 1 угорі
        const a = Math.atan2(z, x)
        const skirt = 1 - yy
        const wob = Math.sin(a * 11 + seed * 2.3) * 0.5 + 0.5

        const k = 1 + 0.08 * Math.sin(a * 7 + seed) * skirt + 0.06 * wob * skirt
        pos.setX(i, x * k)
        pos.setZ(i, z * k)
        pos.setY(i, y - 0.4 * wob * skirt * skirt)    // гілки обвисають

        const n = 0.5 + 0.5 * Math.sin(a * 6 + seed * 1.9) * Math.sin(yy * 9 + a * 2)
        const snow = THREE.MathUtils.clamp(n * 1.4 - 0.5 + yy * 0.45, 0, 1)
        c.copy(green).lerp(green2, wob * 0.6).lerp(white, snow * 0.85)
        colors[i * 3] = c.r
        colors[i * 3 + 1] = c.g
        colors[i * 3 + 2] = c.b
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.computeVertexNormals()
    return geometry
}

function makeStarShape(outer, inner) {
    const shape = new THREE.Shape()
    for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? outer : inner
        const a = (i / 10) * Math.PI * 2 + Math.PI / 2
        const x = Math.cos(a) * r
        const y = Math.sin(a) * r
        if (i === 0) shape.moveTo(x, y)
        else shape.lineTo(x, y)
    }
    shape.closePath()
    return shape
}

/**
 * Велика новорічна ялинка (складна модель):
 * яруси, стовбур, спіральна гірлянда (TubeGeometry), лампочки, 90 кульок (InstancedMesh), зірка.
 */
export function createTree({ materials, fairy, position, lights }) {
    const group = new THREE.Group()
    group.position.copy(position)
    const rnd = createRandom(2024)

    // стовбур і підставка
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.55, 2.4, 14), materials.woodDark)
    trunk.position.y = 1.2
    const stand = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 2.2), materials.wood)
    stand.position.y = 0.25
    group.add(trunk, stand)

    // яруси
    const tiers = 7
    for (let i = 0; i < tiers; i++) {
        const t = i / tiers
        const radius = R0 * (1 - t * 0.88)
        const height = 2.7 - t * 0.5
        const y = BASE_Y + t * (HEIGHT - BASE_Y - 1.8)
        const tier = new THREE.Mesh(makeTierGeometry(radius, height, i), materials.needles)
        tier.position.y = y + height / 2
        tier.castShadow = true
        tier.receiveShadow = true
        group.add(tier)
    }

    // спіральна гірлянда
    const spiralPoints = []
    const N = 260
    for (let i = 0; i <= N; i++) {
        const t = i / N
        const y = BASE_Y + 0.7 + t * (HEIGHT - BASE_Y - 2.4)
        const r = radiusAt(y) + 0.16
        const a = t * Math.PI * 2 * 7
        spiralPoints.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r))
    }
    const garland = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(spiralPoints), 520, 0.06, 6),
        materials.gold
    )
    garland.castShadow = true
    group.add(garland)

    // лампочки на гірлянді (малюються системою гірлянд, координати — світові)
    spiralPoints.forEach((p, i) => {
        if (i % 3 !== 0) return
        fairy.addBulb(p.clone().add(position), PALETTE[(i / 3) % PALETTE.length], 'twinkle')
    })

    // ялинкові кульки (InstancedMesh з кольором на кожну)
    const BALLS = 90
    const ballColors = ['#d8232a', '#ffcf6a', '#2c6fd6', '#e8e8f0', '#ff59c9', '#2fae6b']
    const ballMaterial = new THREE.MeshStandardMaterial({
        metalness: 0.95, roughness: 0.12, envMap: materials.envMap, envMapIntensity: 1.3
    })
    const balls = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 20, 20), ballMaterial, BALLS)
    const dummy = new THREE.Object3D()
    const color = new THREE.Color()
    for (let i = 0; i < BALLS; i++) {
        const y = BASE_Y + 0.5 + rnd() * (HEIGHT - BASE_Y - 2.6)
        const a = rnd() * Math.PI * 2
        const r = radiusAt(y) + 0.14
        const s = 0.15 + rnd() * 0.12
        dummy.position.set(Math.cos(a) * r, y, Math.sin(a) * r)
        dummy.scale.setScalar(s)
        dummy.updateMatrix()
        balls.setMatrixAt(i, dummy.matrix)
        balls.setColorAt(i, color.set(ballColors[Math.floor(rnd() * ballColors.length)]))
    }
    balls.castShadow = true
    group.add(balls)

    // зірка на верхівці
    const starGeometry = new THREE.ExtrudeGeometry(makeStarShape(0.85, 0.38), {
        depth: 0.25, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.06, bevelSegments: 2
    })
    starGeometry.center()
    const star = new THREE.Mesh(starGeometry, materials.star)
    star.position.y = HEIGHT + 0.25
    group.add(star)

    // світло від зірки та два тепліших прожектори спереду
    const starLight = new THREE.PointLight('#ffd890', 40, 22, 2)
    starLight.position.set(0, HEIGHT - 0.5, 0.2)
    group.add(starLight)
    lights.push(starLight)

    for (const x of [-5.5, 5.5]) {
        const front = new THREE.PointLight('#ffc77a', 26, 20, 2)
        front.position.set(x, 4.5, 5.5)
        group.add(front)
        lights.push(front)
    }

    return {
        group,
        update(time) {
            star.rotation.y = time * 0.8
            star.scale.setScalar(1 + Math.sin(time * 2) * 0.04)
        }
    }
}

export const TREE_HEIGHT = HEIGHT
