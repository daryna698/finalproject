import * as THREE from 'three'
import { stripeTexture } from '../core/textures.js'

const RADIUS = 4.4
const POLES = 8
const POLE_R = 3.0
const CANOPY_Y = 4.2

const matCache = new Map()
const std = (color, extra = {}) => {
    const key = color + JSON.stringify(extra)
    if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.55, ...extra }))
    return matCache.get(key)
}

/**
 * Конячка з капсул, циліндрів і конусів (складна модель з ~14 деталей).
 * Дивиться в бік +z.
 */
function createHorse(coatColor, maneColor, saddleColor, materials) {
    const g = new THREE.Group()
    const coat = std(coatColor, { roughness: 0.45 })
    const mane = std(maneColor, { roughness: 0.9 })
    const add = (mesh, x, y, z, rx = 0, ry = 0, rz = 0) => {
        mesh.position.set(x, y, z)
        mesh.rotation.set(rx, ry, rz)
        mesh.castShadow = true
        g.add(mesh)
        return mesh
    }

    // тулуб
    add(new THREE.Mesh(new THREE.CapsuleGeometry(0.27, 0.85, 6, 14), coat), 0, 0.95, 0, Math.PI / 2, 0, 0)
    // шия й голова
    add(new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.5, 4, 10), coat), 0, 1.38, 0.6, 0.7, 0, 0)
    add(new THREE.Mesh(new THREE.CapsuleGeometry(0.115, 0.3, 4, 10), coat), 0, 1.62, 0.95, 1.25, 0, 0)
    // вуха
    add(new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 6), coat), -0.06, 1.8, 0.8)
    add(new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 6), coat), 0.06, 1.8, 0.8)
    // грива та хвіст
    add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.14), mane), 0, 1.5, 0.45, 0.7, 0, 0)
    add(new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.65, 8), mane), 0, 0.9, -0.7, -2.5, 0, 0)
    // ноги: передні підняті, задні відставлені
    const legGeometry = new THREE.CylinderGeometry(0.055, 0.045, 0.7, 8)
    add(new THREE.Mesh(legGeometry, coat), -0.14, 0.45, 0.4, -0.6, 0, 0)
    add(new THREE.Mesh(legGeometry, coat), 0.14, 0.45, 0.4, -0.45, 0, 0)
    add(new THREE.Mesh(legGeometry, coat), -0.14, 0.4, -0.42, 0.4, 0, 0)
    add(new THREE.Mesh(legGeometry, coat), 0.14, 0.4, -0.42, 0.55, 0, 0)
    // сідло та попона
    add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.45), std(saddleColor)), 0, 1.23, 0.05)
    add(new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.04, 0.1), materials.gold), 0, 1.27, 0.3)

    return g
}

/**
 * Карусель: платформа, центральна колона, 8 золотих стійок із кониками (вгору-вниз),
 * смугастий дах-конус, кільця лампочок, що "біжать". Усе обертається.
 */
export function createCarousel(ctx, { position }) {
    const { materials, fairy, physics, lights } = ctx

    const group = new THREE.Group()
    group.position.copy(position)

    const rotating = new THREE.Group()
    group.add(rotating)

    // платформа
    const platform = new THREE.Mesh(new THREE.CylinderGeometry(RADIUS, RADIUS + 0.1, 0.35, 48), std('#8c2a2a', { roughness: 0.6 }))
    platform.position.y = 0.175
    platform.receiveShadow = true
    platform.castShadow = true
    const rim = new THREE.Mesh(new THREE.TorusGeometry(RADIUS + 0.05, 0.07, 8, 64), materials.gold)
    rim.rotation.x = Math.PI / 2
    rim.position.y = 0.36
    rotating.add(platform, rim)

    // центральна колона з золотими кільцями
    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, CANOPY_Y, 24), std('#f2e6c9', { roughness: 0.5 }))
    column.position.y = CANOPY_Y / 2
    column.castShadow = true
    rotating.add(column)
    for (const y of [0.7, 2.2, 3.7]) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.05, 8, 24), materials.gold)
        ring.rotation.x = Math.PI / 2
        ring.position.y = y
        rotating.add(ring)
    }

    // дах: смугастий конус + золота окантовка + навершя
    const stripes = stripeTexture('#c8202a', '#fff4e6', 16)
    const canopy = new THREE.Mesh(
        new THREE.ConeGeometry(RADIUS + 0.35, 1.9, 48, 1, true),
        new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.85, side: THREE.DoubleSide })
    )
    canopy.position.y = CANOPY_Y + 0.95
    canopy.castShadow = true
    const ceiling = new THREE.Mesh(new THREE.CylinderGeometry(RADIUS + 0.3, RADIUS + 0.3, 0.1, 48), std('#f2e6c9'))
    ceiling.position.y = CANOPY_Y
    const canopyRim = new THREE.Mesh(new THREE.TorusGeometry(RADIUS + 0.33, 0.09, 8, 64), materials.gold)
    canopyRim.rotation.x = Math.PI / 2
    canopyRim.position.y = CANOPY_Y
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16), materials.gold)
    finial.position.y = CANOPY_Y + 1.95
    const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 6), materials.gold)
    flagPole.position.y = CANOPY_Y + 2.4
    rotating.add(canopy, ceiling, canopyRim, finial, flagPole)

    // стійки та коні
    const coats = ['#f6f1e7', '#8a5a36', '#555b66', '#c9a06b']
    const manes = ['#d8b8a0', '#2b1b10', '#1c1f26', '#fff1d0']
    const saddles = ['#c8202a', '#2c6fd6', '#2fae6b', '#8a3fd1']
    const horses = []

    for (let i = 0; i < POLES; i++) {
        const a = (i / POLES) * Math.PI * 2
        const x = Math.sin(a) * POLE_R
        const z = Math.cos(a) * POLE_R

        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, CANOPY_Y - 0.3, 10), materials.gold)
        pole.position.set(x, CANOPY_Y / 2 + 0.1, z)
        pole.castShadow = true
        rotating.add(pole)

        const horse = createHorse(coats[i % 4], manes[i % 4], saddles[i % 4], materials)
        horse.position.set(x, 0.4, z)
        horse.rotation.y = a + Math.PI / 2          // дивиться у напрямку обертання
        horse.scale.setScalar(1.05)
        rotating.add(horse)
        horses.push({ horse, phase: (i / POLES) * Math.PI * 2 })
    }

    // кільця лампочок, що "біжать"
    fairy.addRing(position, RADIUS + 0.33, 44, position.y + CANOPY_Y - 0.05, '#ffd27a', 'chase')
    fairy.addRing(position, RADIUS + 0.1, 40, position.y + 0.45, '#ff6a8a', 'chase')
    fairy.addRing(position, 0.62, 16, position.y + CANOPY_Y - 0.2, '#fff1c9', 'twinkle')

    // тепле світло під дахом
    const light = new THREE.PointLight('#ffb870', 22, 15, 2)
    light.position.set(position.x, position.y + 3.6, position.z)
    ctx.scene.add(light)
    lights.push(light)

    // фізика (спрощена: платформа)
    physics.addStaticBox(position.x, 0.2, position.z, RADIUS - 0.3, 0.2, RADIUS - 0.3, physics.mat.wood)

    const state = { speed: 0.45 }

    return {
        group,
        state,
        update(time, dt) {
            rotating.rotation.y += state.speed * dt
            for (const h of horses) {
                h.horse.position.y = 0.4 + 0.35 + Math.sin(time * 1.8 + h.phase) * 0.33
            }
        }
    }
}
