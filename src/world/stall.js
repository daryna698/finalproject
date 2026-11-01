import * as THREE from 'three'
import { stripeTexture, signTexture, softSpriteTexture } from '../core/textures.js'
import { createRandom } from '../core/random.js'
import { createPerson } from './people.js'

const W = 3.2          // ширина будиночка (x)
const D = 2.4          // глибина (z)
const WALL_H = 2.2
const FLOOR = 0.15
const ROOF_ANGLE = 0.5

// Кеш простих матеріалів і спільні геометрії
const matCache = new Map()
const std = (color, extra = {}) => {
    const key = color + JSON.stringify(extra)
    if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...extra }))
    return matCache.get(key)
}
const G = {
    mug: new THREE.CylinderGeometry(0.07, 0.06, 0.12, 14),
    handle: new THREE.TorusGeometry(0.045, 0.012, 6, 12, Math.PI),
    ball: new THREE.SphereGeometry(0.1, 14, 14),
    cookie: new THREE.CylinderGeometry(0.1, 0.1, 0.025, 14),
    jar: new THREE.CylinderGeometry(0.13, 0.13, 0.3, 16),
    candyBall: new THREE.SphereGeometry(0.035, 8, 8),
    cone: new THREE.ConeGeometry(0.12, 0.28, 12),
    box: new THREE.BoxGeometry(1, 1, 1)
}

// Дрібні предмети на прилавку, залежно від типу будиночка
function addGoods(kind, group, materials, rnd) {
    const y = FLOOR + 0.95 + 0.07 + 0.005       // поверхня прилавка
    const z = D / 2 - 0.05
    const place = (mesh, x, yy, zz = z) => {
        mesh.position.set(x, yy, zz)
        mesh.castShadow = true
        group.add(mesh)
        return mesh
    }

    if (kind === 'mulled' || kind === 'chocolate') {
        const color = kind === 'mulled' ? '#f3ece0' : '#ffd0e0'
        for (let i = 0; i < 6; i++) {
            const mug = place(new THREE.Mesh(G.mug, std(color, { roughness: 0.35 })), -1.2 + i * 0.28, y + 0.06, z + 0.08 + (i % 2) * 0.08)
            const handle = new THREE.Mesh(G.handle, std(color, { roughness: 0.35 }))
            handle.position.set(0.075, 0, 0)
            handle.rotation.z = -Math.PI / 2
            mug.add(handle)
        }
        // великий мідний казан
        const pot = place(new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.23, 0.32, 20), materials.copper), 0.9, y + 0.16, z - 0.05)
        const lid = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), materials.copper)
        lid.position.y = 0.16
        pot.add(lid)
    } else if (kind === 'gingerbread') {
        const cookieColors = ['#8a4b21', '#a05f2c', '#7a3f1a']
        for (let s = 0; s < 4; s++) {
            for (let i = 0; i < 6; i++) {
                const cookie = place(new THREE.Mesh(G.cookie, std(cookieColors[(s + i) % 3])), -1.1 + s * 0.55, y + 0.015 + i * 0.027, z + 0.05)
                if (i === 5) {
                    const icing = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.008, 6, 14), std('#ffffff'))
                    icing.rotation.x = Math.PI / 2
                    icing.position.y = 0.016
                    cookie.add(icing)
                }
            }
        }
        // подарункова коробка з пряниками
        place(new THREE.Mesh(G.box, std('#c8202a')), 1.15, y + 0.12, z + 0.02).scale.set(0.4, 0.24, 0.3)
    } else if (kind === 'toys') {
        const colors = ['#e63946', '#2a9d8f', '#f4a261', '#4361ee', '#ffd166']
        for (let i = 0; i < 9; i++) {
            const ball = place(new THREE.Mesh(G.ball, std(colors[i % 5], { roughness: 0.25, metalness: 0.2 })), -1.3 + i * 0.3, y + 0.1, z + 0.05 + (i % 3) * 0.07)
            ball.scale.setScalar(0.7 + rnd() * 0.4)
        }
        // ведмедик
        const bear = place(new THREE.Group(), 1.2, y, z)
        const bodyMat = std('#b5835a', { roughness: 1 })
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 14), bodyMat)
        body.position.y = 0.15
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 14), bodyMat)
        head.position.y = 0.36
        const ear1 = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), bodyMat)
        ear1.position.set(-0.08, 0.45, 0)
        const ear2 = ear1.clone()
        ear2.position.x = 0.08
        bear.add(body, head, ear1, ear2)
    } else if (kind === 'chestnuts') {
        const drum = place(new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.28, 24), std('#222328', { metalness: 0.7, roughness: 0.4 })), 0, y + 0.14, z)
        const nuts = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 8, 8), std('#b4581f'), 40)
        const d = new THREE.Object3D()
        for (let i = 0; i < 40; i++) {
            const a = rnd() * Math.PI * 2
            const r = Math.sqrt(rnd()) * 0.28
            d.position.set(Math.cos(a) * r, 0.14 + rnd() * 0.04, Math.sin(a) * r)
            d.updateMatrix()
            nuts.setMatrixAt(i, d.matrix)
        }
        drum.add(nuts)
        // пакетики
        for (let i = 0; i < 4; i++) {
            const bag = place(new THREE.Mesh(G.cone, std('#d9c7a0', { roughness: 1 })), -1.2 + i * 0.25, y + 0.14, z + 0.05)
            bag.scale.set(0.8, 1, 0.8)
        }
    } else if (kind === 'candy') {
        const colors = ['#ff4d6d', '#ffd23f', '#5bd1d7', '#9b5de5', '#6ede8a']
        for (let j = 0; j < 4; j++) {
            const jar = place(new THREE.Mesh(G.jar, std('#dff3ff', { transparent: true, opacity: 0.35, roughness: 0.05 })), -1.1 + j * 0.45, y + 0.15, z + 0.04)
            for (let i = 0; i < 26; i++) {
                const c = new THREE.Mesh(G.candyBall, std(colors[(i + j) % 5], { roughness: 0.3 }))
                const a = rnd() * Math.PI * 2
                const r = Math.sqrt(rnd()) * 0.09
                c.position.set(Math.cos(a) * r, -0.12 + rnd() * 0.2, Math.sin(a) * r)
                jar.add(c)
            }
        }
        // льодяники
        for (let i = 0; i < 5; i++) {
            const stick = place(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.5, 8), materials.candy), 0.85 + i * 0.1, y + 0.25, z + 0.05)
            stick.rotation.z = (i - 2) * 0.12
        }
    } else if (kind === 'hats') {
        const colors = ['#e63946', '#2a9d8f', '#4361ee', '#ffd166', '#9b5de5']
        for (let i = 0; i < 5; i++) {
            const hat = place(new THREE.Mesh(G.cone, std(colors[i], { roughness: 1 })), -1.1 + i * 0.5, y + 0.14, z + 0.04)
            hat.scale.set(1.1, 1.2, 1.1)
            const pom = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), std('#ffffff', { roughness: 1 }))
            pom.position.y = 0.16
            hat.add(pom)
        }
        for (let i = 0; i < 3; i++) {
            const scarf = place(new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.045, 8, 16), std(colors[(i + 2) % 5], { roughness: 1 })), 1.0 + i * 0.22, y + 0.05, z + 0.1)
            scarf.rotation.x = Math.PI / 2
        }
    }
}

/**
 * Ярмарковий будиночок (складна модель):
 * дерев'яний каркас, двосхилий дах зі снігом і бурульками, смугастий навіс, вивіска,
 * гірлянди, товари, продавець, димар із димом, тепле світло.
 */
export function createStall(ctx, { name, kind, accent, position, rotationY = 0, smoke = false, seed = 1 }) {
    const { materials, fairy, physics, lights, updaters } = ctx
    const rnd = createRandom(seed)

    const group = new THREE.Group()
    group.position.copy(position)
    group.rotation.y = rotationY

    const woodAccent = new THREE.MeshStandardMaterial({ map: materials.wood.map, color: accent, roughness: 0.8 })
    const add = (mesh, x, y, z, material) => {
        mesh.position.set(x, y, z)
        mesh.castShadow = true
        mesh.receiveShadow = true
        group.add(mesh)
        return mesh
    }
    const box = (w, h, d, material) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material)

    // основа, стіни, прилавок
    add(box(W + 0.3, FLOOR, D + 0.3, materials.woodDark), 0, FLOOR / 2, 0)
    add(box(W, WALL_H, 0.1, materials.wood), 0, FLOOR + WALL_H / 2, -D / 2)
    for (const s of [-1, 1]) add(box(0.1, WALL_H, D, materials.wood), s * W / 2, FLOOR + WALL_H / 2, 0)
    add(box(W, 0.95, 0.5, woodAccent), 0, FLOOR + 0.475, D / 2 - 0.15)
    add(box(W + 0.15, 0.07, 0.7, materials.woodDark), 0, FLOOR + 0.95 + 0.035, D / 2 - 0.05)
    for (const s of [-1, 1]) add(box(0.12, 2.1, 0.12, materials.woodDark), s * (W / 2 - 0.06), FLOOR + 1.05, D / 2 + 0.35)

    // двосхилий дах
    const span = 1.6
    const slabLength = span / Math.cos(ROOF_ANGLE) + 0.1
    const roofY = FLOOR + WALL_H + (span / 2) * Math.tan(ROOF_ANGLE) + 0.05
    const eaveY = roofY - Math.sin(ROOF_ANGLE) * slabLength / 2 - 0.05      // нижній край передньго схилу
    const eaveZ = span / 2 + Math.cos(ROOF_ANGLE) * slabLength / 2
    for (const s of [-1, 1]) {
        const slab = add(box(W + 0.7, 0.1, slabLength, woodAccent), 0, roofY, s * span / 2)
        slab.rotation.x = s * ROOF_ANGLE
        // шапка снігу над кожним схилом (зсув уздовж нормалі схилу)
        const snow = box(W + 0.85, 0.16, slabLength + 0.04, materials.snow)
        snow.position.set(0, roofY + 0.1 * Math.cos(ROOF_ANGLE), s * span / 2 + s * 0.1 * Math.sin(ROOF_ANGLE))
        snow.rotation.x = s * ROOF_ANGLE
        snow.castShadow = true
        group.add(snow)
    }

    // фронтони (трикутники)
    const gableShape = new THREE.Shape()
    gableShape.moveTo(-span, 0)
    gableShape.lineTo(span, 0)
    gableShape.lineTo(0, span * Math.tan(ROOF_ANGLE))
    gableShape.closePath()
    const gableGeometry = new THREE.ExtrudeGeometry(gableShape, { depth: 0.08, bevelEnabled: false })
    gableGeometry.rotateY(Math.PI / 2)
    for (const s of [-1, 1]) {
        const gable = new THREE.Mesh(gableGeometry, materials.wood)
        gable.position.set(s * (W / 2) - (s > 0 ? 0 : 0.08), FLOOR + WALL_H, 0)
        gable.castShadow = true
        group.add(gable)
    }

    // смугастий навіс спереду
    const stripes = stripeTexture(accent, '#fff4e6', 8)
    const awningMaterial = new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.9, side: THREE.DoubleSide })
    const awning = add(box(W + 0.3, 0.05, 1.15, awningMaterial), 0, 2.2, D / 2 + 0.45)
    awning.rotation.x = 0.22
    // фестон (трикутні зубці) по краю навісу
    for (let i = 0; i < 8; i++) {
        const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.2, 4), std(i % 2 === 0 ? accent : '#fff4e6', { roughness: 0.9 }))
        tooth.rotation.x = Math.PI
        tooth.rotation.y = Math.PI / 4
        tooth.scale.set(1, 1, 0.3)
        tooth.position.set(-W / 2 - 0.05 + 0.2 + i * ((W + 0.1) / 8), 2.0, D / 2 + 1.02)
        group.add(tooth)
    }

    // вивіска
    const signBoard = add(box(1.9, 0.45, 0.06, materials.woodDark), 0, 1.68, D / 2 + 0.98)
    const signFace = new THREE.Mesh(
        new THREE.PlaneGeometry(1.82, 0.4),
        new THREE.MeshStandardMaterial({ map: signTexture(name, { bg: accent }), roughness: 0.7 })
    )
    signFace.position.z = 0.032
    signBoard.add(signFace)

    // полиця й товари на задній стіні
    add(box(W - 0.2, 0.05, 0.35, materials.woodDark), 0, 1.65, -D / 2 + 0.25)
    for (let i = 0; i < 7; i++) {
        const item = new THREE.Mesh(G.box, std(['#e63946', '#2a9d8f', '#f4a261', '#4361ee', '#ffd166'][i % 5], { roughness: 0.5 }))
        const h = 0.18 + rnd() * 0.15
        item.scale.set(0.2, h, 0.2)
        item.position.set(-1.2 + i * 0.4, 1.675 + h / 2, -D / 2 + 0.25)
        group.add(item)
    }

    // лампа-ліхтарик під дахом
    const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), materials.lantern)
    lantern.position.set(0, 2.2, 0.1)
    group.add(lantern)

    addGoods(kind, group, materials, rnd)

    // продавець за прилавком
    const vendor = createPerson({
        santa: kind === 'mulled' || kind === 'candy', coat: '#2a6f4a', hat: '#c8202a',
        scarf: '#ffffff', skates: false, scale: 0.95
    })
    vendor.position.set(0, FLOOR, -0.15)
    vendor.rotation.y = 0
    group.add(vendor)

    // димар (цегла) і дим
    group.updateMatrixWorld(true)
    if (smoke) {
        const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.1, 0.55), materials.brick)
        chimney.position.set(W / 2 - 0.55, roofY + 0.5, -0.5)
        chimney.castShadow = true
        const cap = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.7), materials.snow)
        cap.position.set(W / 2 - 0.55, roofY + 1.08, -0.5)
        group.add(chimney, cap)

        const SMOKE = 14
        const spritePositions = new Float32Array(SMOKE * 3)
        const smokeGeometry = new THREE.BufferGeometry()
        smokeGeometry.setAttribute('position', new THREE.BufferAttribute(spritePositions, 3))
        const smokePoints = new THREE.Points(smokeGeometry, new THREE.PointsMaterial({
            map: softSpriteTexture(), color: '#cdd5e2', size: 1.1, transparent: true, opacity: 0.32, depthWrite: false
        }))
        smokePoints.frustumCulled = false
        const origin = new THREE.Vector3(W / 2 - 0.55, roofY + 1.2, -0.5).applyMatrix4(group.matrixWorld)

        ctx.scene.add(smokePoints)
        updaters.push((time) => {
            for (let i = 0; i < SMOKE; i++) {
                const t = (time * 0.18 + i / SMOKE) % 1
                spritePositions[i * 3] = origin.x + t * 1.6 + Math.sin(time + i) * 0.15
                spritePositions[i * 3 + 1] = origin.y + t * 4
                spritePositions[i * 3 + 2] = origin.z + Math.cos(time * 0.7 + i) * 0.15
            }
            smokeGeometry.attributes.position.needsUpdate = true
        })
    }

    // бурульки по краю даху
    for (let i = 0; i < 14; i++) {
        const length = 0.12 + rnd() * 0.22
        const icicle = new THREE.Mesh(new THREE.ConeGeometry(0.03, length, 6), materials.icicle)
        icicle.rotation.x = Math.PI
        icicle.position.set(-W / 2 - 0.2 + i * ((W + 0.4) / 13), eaveY - length / 2 + 0.02, eaveZ - 0.03)
        group.add(icicle)
    }

    // гірлянди: під навісом і вздовж карниза даху (світові координати)
    group.updateMatrixWorld(true)
    const world = (x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(group.matrixWorld)
    fairy.addString(world(-W / 2 - 0.1, 2.02, D / 2 + 1.02), world(W / 2 + 0.1, 2.02, D / 2 + 1.02), { sag: 0.12, spacing: 0.33 })
    fairy.addString(world(-W / 2 - 0.3, eaveY - 0.1, eaveZ + 0.02), world(W / 2 + 0.3, eaveY - 0.1, eaveZ + 0.02), { sag: 0.16, spacing: 0.36 })

    // світло
    const light = new THREE.PointLight('#ffb35c', 14, 12, 2)
    light.position.copy(world(0, 1.9, D / 2 + 0.25))
    ctx.scene.add(light)
    lights.push(light)

    // фізична перешкода (спрощений паралелепіпед)
    physics.addStaticBox(position.x, 1.4, position.z, W / 2 + 0.15, 1.4, D / 2 + 0.15, physics.mat.wood, rotationY)

    // легке "дихання" продавця
    updaters.push((time) => {
        vendor.userData.torso.position.y = 1.2 + Math.sin(time * 1.6 + seed) * 0.01
        vendor.userData.arms[0].rotation.z = 0.1 + Math.sin(time * 1.2 + seed) * 0.05
        vendor.userData.arms[1].rotation.z = -0.1 - Math.sin(time * 1.2 + seed) * 0.05
    })

    return group
}
