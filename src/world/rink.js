import * as THREE from 'three'
import { Reflector } from 'three/addons/objects/Reflector.js'
import { IceShader } from '../shaders/ice.js'
import { iceMarksTexture } from '../core/textures.js'
import { createRandom } from '../core/random.js'
import { PALETTE } from '../core/fairy.js'
import { createPerson } from './people.js'

const ICE_Y = 0.06
const BOARD_H = 1.1

/**
 * Ковзанка:
 *  - крига = Reflector (справжнє дзеркальне відображення) + власний шейдер (див. shaders/ice.js),
 *  - дерев'яні борти зі стовпами, гірлянди, прожектори,
 *  - 14 ковзанярів, що їдуть по овальних орбітах із анімацією ніг і рук.
 */
export function createRink(ctx, { center, size }) {
    const { materials, fairy, physics, lights, scene } = ctx
    const group = new THREE.Group()
    const rnd = createRandom(77)

    /* ---------- крига ---------- */
    const ice = new Reflector(new THREE.PlaneGeometry(size.x, size.z), {
        shader: IceShader,
        textureWidth: 1024,
        textureHeight: 1024,
        clipBias: 0.003,
        color: 0x8aa8c8
    })
    ice.rotation.x = -Math.PI / 2
    ice.position.set(center.x, ICE_Y, center.z)

    // джерела блиску для шейдера: верхівки стовпів (6 штук)
    const poleTops = []
    const hx = size.x / 2
    const hz = size.z / 2
    const polePositions = [
        [-hx, -hz], [0, -hz], [hx, -hz],
        [-hx, hz], [0, hz], [hx, hz]
    ]
    const specColors = ['#ffb86b', '#ff6fa8', '#7cc4ff', '#ffd27a', '#8affc1', '#ffb86b']
    polePositions.forEach(([x, z], i) => {
        poleTops.push(new THREE.Vector3(center.x + x, 3.9, center.z + z))
    })

    const u = ice.material.uniforms
    u.uMarks.value = iceMarksTexture()
    u.uCenter.value = new THREE.Vector2(center.x, center.z)
    u.uSize.value = new THREE.Vector2(size.x, size.z)
    u.uLightPos.value = poleTops
    u.uLightCol.value = specColors.map((c) => new THREE.Color(c))

    // бортик криги (невеликий "підйом") — товщина льоду
    const slab = new THREE.Mesh(
        new THREE.BoxGeometry(size.x + 0.1, 0.12, size.z + 0.1),
        new THREE.MeshStandardMaterial({ color: '#a9c4dc', roughness: 0.3 })
    )
    slab.position.set(center.x, 0.0, center.z)
    slab.receiveShadow = true
    group.add(slab)
    group.add(ice)

    /* ---------- борти ---------- */
    const boardPaint = new THREE.MeshStandardMaterial({ color: '#f0e9db', roughness: 0.6 })
    const stripe = new THREE.MeshStandardMaterial({ color: '#c8202a', roughness: 0.6 })

    const addBoardSide = (length, x, z, rotY) => {
        const side = new THREE.Group()
        side.position.set(x, 0, z)
        side.rotation.y = rotY

        const panel = new THREE.Mesh(new THREE.BoxGeometry(length, 0.85, 0.1), boardPaint)
        panel.position.y = 0.47
        const redStripe = new THREE.Mesh(new THREE.BoxGeometry(length, 0.14, 0.11), stripe)
        redStripe.position.y = 0.6
        const rail = new THREE.Mesh(new THREE.BoxGeometry(length + 0.12, 0.1, 0.22), materials.woodDark)
        rail.position.y = BOARD_H
        for (const m of [panel, redStripe, rail]) {
            m.castShadow = true
            m.receiveShadow = true
            side.add(m)
        }
        const posts = Math.floor(length / 2)
        for (let i = 0; i <= posts; i++) {
            const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, BOARD_H + 0.05, 0.16), materials.woodDark)
            post.position.set(-length / 2 + (i * length) / posts, (BOARD_H + 0.05) / 2, 0)
            post.castShadow = true
            side.add(post)
        }
        group.add(side)
    }

    addBoardSide(size.x, center.x, center.z - hz, 0)
    addBoardSide(size.x, center.x, center.z + hz, 0)
    addBoardSide(size.z, center.x - hx, center.z, Math.PI / 2)
    addBoardSide(size.z, center.x + hx, center.z, Math.PI / 2)

    // фізика: борти + крига (низьке тертя)
    physics.addStaticBox(center.x, BOARD_H / 2, center.z - hz, hx + 0.1, BOARD_H / 2, 0.12)
    physics.addStaticBox(center.x, BOARD_H / 2, center.z + hz, hx + 0.1, BOARD_H / 2, 0.12)
    physics.addStaticBox(center.x - hx, BOARD_H / 2, center.z, 0.12, BOARD_H / 2, hz + 0.1)
    physics.addStaticBox(center.x + hx, BOARD_H / 2, center.z, 0.12, BOARD_H / 2, hz + 0.1)
    physics.addStaticBox(center.x, ICE_Y / 2, center.z, hx, ICE_Y / 2, hz, physics.mat.ice)

    /* ---------- стовпи, гірлянди, світло ---------- */
    const poleMaterial = materials.metal
    for (const [x, z] of polePositions) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 4, 10), poleMaterial)
        pole.position.set(center.x + x, 2, center.z + z)
        pole.castShadow = true
        group.add(pole)
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 14), materials.lantern)
        cap.position.set(center.x + x, 4.05, center.z + z)
        group.add(cap)
    }
    // гірлянди по периметру: верх стовпів + діагоналі через ковзанку
    const top = (i) => poleTops[i].clone().setY(3.85)
    const ring = [0, 1, 2, 5, 4, 3, 0]
    for (let i = 0; i < ring.length - 1; i++) {
        fairy.addString(top(ring[i]), top(ring[i + 1]), { sag: 0.55, spacing: 0.45 })
    }
    fairy.addString(top(1), top(4), { sag: 0.7, spacing: 0.5, palette: ['#ffd27a', '#fff1c9'] })

    // холодне світло над кригою
    for (const dx of [-0.25, 0.25]) {
        const l = new THREE.PointLight('#b5d4ff', 16, 22, 2)
        l.position.set(center.x + size.x * dx, 4.5, center.z)
        scene.add(l)
        lights.push(l)
    }

    /* ---------- ковзанярі ---------- */
    const skaters = []
    const coats = ['#d9534f', '#4a90d9', '#f0ad4e', '#5cb85c', '#9b59b6', '#e67e22', '#1abc9c', '#ec407a']
    const hats = ['#ffffff', '#c8202a', '#2c6fd6', '#ffd166', '#2fae6b']
    const COUNT = 14

    for (let i = 0; i < COUNT; i++) {
        const person = createPerson({
            coat: coats[i % coats.length],
            hat: hats[(i * 3) % hats.length],
            scarf: coats[(i + 3) % coats.length],
            scale: 0.8 + rnd() * 0.3
        })
        person.position.y = ICE_Y + 0.02
        group.add(person)

        const k = 0.28 + (i / COUNT) * 0.7                  // "орбіта": від центру до бортів
        skaters.push({
            person,
            rx: (hx - 1.7) * k,
            rz: (hz - 1.7) * k,
            speed: (0.7 + rnd() * 0.6) * (i % 2 === 0 ? 1 : -1),
            angle: rnd() * Math.PI * 2,
            gait: rnd() * 10
        })
    }

    const state = { speed: 1 }

    return {
        group,
        ice,
        state,
        update(time, dt) {
            u.uTime.value = time

            for (const s of skaters) {
                const avg = (s.rx + s.rz) / 2
                s.angle += (s.speed * state.speed * dt) * (2.2 / Math.max(avg, 1.5))

                const x = center.x + Math.cos(s.angle) * s.rx
                const z = center.z + Math.sin(s.angle) * s.rz
                const dir = Math.sign(s.speed)
                const dx = -Math.sin(s.angle) * s.rx * dir
                const dz = Math.cos(s.angle) * s.rz * dir

                s.person.position.x = x
                s.person.position.z = z
                s.person.rotation.y = Math.atan2(dx, dz)
                s.person.rotation.x = 0.08                  // легкий нахил уперед

                // ковзання: ноги по черзі відштовхуються, руки балансують
                const phase = time * 2.4 * Math.abs(s.speed) * state.speed + s.gait
                const [legL, legR] = s.person.userData.legs
                const [armL, armR] = s.person.userData.arms
                legL.rotation.x = Math.sin(phase) * 0.45
                legR.rotation.x = -Math.sin(phase) * 0.45
                legL.rotation.z = Math.max(0, Math.sin(phase + 1)) * 0.12
                legR.rotation.z = -Math.max(0, Math.sin(phase + 1)) * 0.12
                armL.rotation.x = -Math.sin(phase) * 0.5
                armR.rotation.x = Math.sin(phase) * 0.5
                armL.rotation.z = 0.25
                armR.rotation.z = -0.25
                s.person.position.y = ICE_Y + 0.02 + Math.abs(Math.sin(phase)) * 0.015
            }
        }
    }
}
