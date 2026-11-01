import * as THREE from 'three'
import { CANNON } from '../core/physics.js'
import { createRandom } from '../core/random.js'

const PAPER = ['#d8232a', '#2c6fd6', '#2fae6b', '#ffcf6a', '#9b59b6', '#ec407a', '#f4f1ea']
const RIBBON = ['#ffcf6a', '#ffffff', '#d8232a', '#2c6fd6']

/** Подарункова коробка зі стрічкою та бантом (складна модель). */
function createGiftMesh(w, h, d, paperColor, ribbonColor, envMap) {
    const group = new THREE.Group()
    const paper = new THREE.MeshStandardMaterial({ color: paperColor, roughness: 0.35, metalness: 0.15, envMap, envMapIntensity: 0.7 })
    const ribbon = new THREE.MeshStandardMaterial({ color: ribbonColor, roughness: 0.3, metalness: 0.4, envMap, envMapIntensity: 0.9 })

    const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), paper)
    const ribbonA = new THREE.Mesh(new THREE.BoxGeometry(w * 0.16, h * 1.02, d * 1.02), ribbon)
    const ribbonB = new THREE.Mesh(new THREE.BoxGeometry(w * 1.02, h * 1.02, d * 0.16), ribbon)
    const bowL = new THREE.Mesh(new THREE.TorusGeometry(Math.min(w, d) * 0.14, 0.025, 8, 16), ribbon)
    bowL.position.set(-Math.min(w, d) * 0.13, h / 2 + 0.05, 0)
    bowL.rotation.y = Math.PI / 2
    bowL.rotation.x = 0.5
    const bowR = bowL.clone()
    bowR.position.x *= -1
    bowR.rotation.x = -0.5

    for (const m of [box, ribbonA, ribbonB, bowL, bowR]) {
        m.castShadow = true
        m.receiveShadow = true
        group.add(m)
    }
    return group
}

/** Сніговик: 3 кулі, ніс-морквина, вугільні очі, циліндр, шарф, руки-гілки. */
function createSnowmanMesh(materials) {
    const g = new THREE.Group()
    const parts = [
        { r: 0.7, y: 0.7 }, { r: 0.5, y: 1.65 }, { r: 0.36, y: 2.4 }
    ]
    for (const p of parts) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(p.r, 24, 24), materials.snow)
        m.position.y = p.y
        m.castShadow = true
        m.receiveShadow = true
        g.add(m)
    }
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.4, 10), new THREE.MeshStandardMaterial({ color: '#ff7a1a' }))
    nose.rotation.x = Math.PI / 2
    nose.position.set(0, 2.4, 0.4)
    const coal = new THREE.MeshStandardMaterial({ color: '#15161a', roughness: 0.6 })
    const eyeGeo = new THREE.SphereGeometry(0.045, 8, 8)
    for (const s of [-1, 1]) {
        const eye = new THREE.Mesh(eyeGeo, coal)
        eye.position.set(s * 0.13, 2.5, 0.32)
        g.add(eye)
    }
    for (let i = 0; i < 3; i++) {
        const button = new THREE.Mesh(eyeGeo, coal)
        button.position.set(0, 1.85 - i * 0.22, 0.47 - i * 0.02)
        g.add(button)
    }
    const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.04, 20), coal)
    hatBrim.position.y = 2.72
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.27, 0.4, 20), coal)
    hat.position.y = 2.94
    const hatBand = new THREE.Mesh(new THREE.CylinderGeometry(0.265, 0.275, 0.07, 20), new THREE.MeshStandardMaterial({ color: '#c8202a' }))
    hatBand.position.y = 2.79
    const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.08, 10, 24), new THREE.MeshStandardMaterial({ color: '#c8202a', roughness: 0.9 }))
    scarf.position.y = 2.1
    scarf.rotation.x = Math.PI / 2
    const armGeo = new THREE.CylinderGeometry(0.025, 0.02, 0.8, 6)
    const armMat = materials.woodDark
    for (const s of [-1, 1]) {
        const arm = new THREE.Mesh(armGeo, armMat)
        arm.position.set(s * 0.65, 1.8, 0)
        arm.rotation.z = s * -1.0
        arm.castShadow = true
        g.add(arm)
    }
    for (const m of [nose, hat, hatBrim, scarf]) m.castShadow = true
    g.add(nose, hatBrim, hat, hatBand, scarf)
    return g
}

/**
 * Подарунки під ялинкою + сніговики (динамічні тіла) + сніжки + "дощ подарунків".
 * Усе, що "засинає", не завантажує процесор.
 */
export function createPhysicsProps(ctx, { treePosition, snowmanSpots }) {
    const { physics, materials, scene } = ctx
    const rnd = createRandom(31)
    const group = new THREE.Group()
    scene.add(group)

    const initial = []     // для кнопки "скинути"
    const extras = []      // подарунки з "дощу" та сніжки

    function makeGift(x, y, z, w, h, d, { asleep, rotation } = {}) {
        const mesh = createGiftMesh(w, h, d, PAPER[Math.floor(rnd() * PAPER.length)], RIBBON[Math.floor(rnd() * RIBBON.length)], materials.envMap)
        group.add(mesh)
        const body = new CANNON.Body({ mass: w * h * d * 40, material: physics.mat.gift })
        body.addShape(new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, d / 2)))
        body.position.set(x, y, z)
        if (rotation) body.quaternion.setFromEuler(rotation.x, rotation.y, rotation.z)
        body.linearDamping = 0.05
        body.angularDamping = 0.2
        body.sleepSpeedLimit = 0.15
        body.sleepTimeLimit = 0.6
        return physics.addDynamic(body, mesh, { asleep })
    }

    // подарунки навколо ялинки: перший шар по дузі, другий шар поверх деяких
    const baseLayer = []
    const count = 11
    for (let i = 0; i < count; i++) {
        const angle = THREE.MathUtils.lerp(-1.2, 1.2, i / (count - 1))
        const radius = 4.6 + (i % 2) * 0.9
        const w = 0.5 + rnd() * 0.35
        const h = 0.4 + rnd() * 0.4
        const d = 0.5 + rnd() * 0.35
        const x = treePosition.x + Math.sin(angle) * radius
        const z = treePosition.z + Math.cos(angle) * radius
        const entry = makeGift(x, h / 2 + 0.01, z, w, h, d, { asleep: true })
        entry.home = { pos: new THREE.Vector3(x, h / 2 + 0.01, z), quat: new THREE.Quaternion() }
        initial.push(entry)
        baseLayer.push({ x, z, h, w, d })
    }
    for (let i = 0; i < baseLayer.length; i += 3) {
        const b = baseLayer[i]
        const w = b.w * 0.7
        const h = 0.3 + rnd() * 0.25
        const d = b.d * 0.7
        const y = b.h + h / 2 + 0.02
        const entry = makeGift(b.x, y, b.z, w, h, d, { asleep: true })
        entry.home = { pos: new THREE.Vector3(b.x, y, b.z), quat: new THREE.Quaternion() }
        initial.push(entry)
    }

    // сніговики
    for (const [x, z] of snowmanSpots) {
        const mesh = createSnowmanMesh(materials)
        group.add(mesh)
        // тіло з трьох куль; центр мас — біля землі, тому сніговик нахиляється і "встає" (ванька-встанька)
        const body = new CANNON.Body({ mass: 25, material: physics.mat.snowman })
        body.addShape(new CANNON.Sphere(0.7), new CANNON.Vec3(0, 0.7, 0))
        body.addShape(new CANNON.Sphere(0.5), new CANNON.Vec3(0, 1.65, 0))
        body.addShape(new CANNON.Sphere(0.36), new CANNON.Vec3(0, 2.4, 0))
        body.position.set(x, 0, z)
        body.angularDamping = 0.9
        body.linearDamping = 0.5
        body.sleepSpeedLimit = 0.2
        body.sleepTimeLimit = 0.5
        const entry = physics.addDynamic(body, mesh, { asleep: true })
        entry.home = { pos: new THREE.Vector3(x, 0, z), quat: new THREE.Quaternion() }
        initial.push(entry)
    }

    /* ---------- сніжки ---------- */
    const ballGeometry = new THREE.SphereGeometry(1, 16, 16)
    const settings = { speed: 28, radius: 0.28, maxBalls: 60 }

    function throwSnowball(from, target) {
        const dir = target.clone().sub(from)
        const distance = dir.length()
        const time = Math.max(distance / settings.speed, 0.05)
        // балістичний розрахунок: враховуємо гравітацію, щоб сніжка влучила туди, куди клікнули
        const g = -physics.world.gravity.y
        const velocity = dir.divideScalar(time)
        velocity.y += 0.5 * g * time

        const mesh = new THREE.Mesh(ballGeometry, materials.snow)
        mesh.scale.setScalar(settings.radius)
        mesh.castShadow = true
        group.add(mesh)

        const body = new CANNON.Body({ mass: 1.2, material: physics.mat.ball })
        body.addShape(new CANNON.Sphere(settings.radius))
        body.position.set(from.x, from.y, from.z)
        body.velocity.set(velocity.x, velocity.y, velocity.z)
        body.linearDamping = 0.02
        const entry = physics.addDynamic(body, mesh)
        extras.push(entry)
        trim()
    }

    function trim() {
        const balls = extras.filter((e) => e.kind !== 'gift')
        while (balls.length > settings.maxBalls) {
            const old = balls.shift()
            extras.splice(extras.indexOf(old), 1)
            physics.remove(old)
        }
    }

    /* ---------- дощ подарунків ---------- */
    function giftRain(n = 14) {
        for (let i = 0; i < n; i++) {
            const w = 0.5 + rnd() * 0.5
            const h = 0.35 + rnd() * 0.4
            const d = 0.5 + rnd() * 0.5
            const entry = makeGift(
                treePosition.x + (rnd() - 0.5) * 16,
                12 + rnd() * 14,
                treePosition.z + 3 + rnd() * 9,
                w, h, d,
                { rotation: { x: rnd() * 3, y: rnd() * 3, z: rnd() * 3 } }
            )
            entry.body.angularVelocity.set((rnd() - 0.5) * 4, (rnd() - 0.5) * 4, (rnd() - 0.5) * 4)
            entry.kind = 'gift'
            extras.push(entry)
        }
        // не даємо сцені захаращуватись: залишаємо до 50 "дощових" подарунків
        const gifts = extras.filter((e) => e.kind === 'gift')
        while (gifts.length > 50) {
            const old = gifts.shift()
            extras.splice(extras.indexOf(old), 1)
            physics.remove(old)
        }
    }

    function reset() {
        for (const e of extras.splice(0)) physics.remove(e)
        for (const e of initial) {
            e.body.position.set(e.home.pos.x, e.home.pos.y, e.home.pos.z)
            e.body.quaternion.set(0, 0, 0, 1)
            e.body.velocity.setZero()
            e.body.angularVelocity.setZero()
            e.body.sleep()
            e.object.position.copy(e.body.position)
            e.object.quaternion.copy(e.body.quaternion)
        }
    }

    // видаляємо старі сніжки (старші за 25 с)
    function cleanup() {
        const now = performance.now()
        for (let i = extras.length - 1; i >= 0; i--) {
            const e = extras[i]
            if (e.kind !== 'gift' && now - e.born > 25000) {
                physics.remove(e)
                extras.splice(i, 1)
            }
        }
    }

    return { settings, throwSnowball, giftRain, reset, cleanup }
}
