import * as CANNON from 'cannon-es'

/**
 * Обгортка над cannon-es: фізичний світ + синхронізація тіл із 3D-об'єктами.
 *  - static  : нерухомі перешкоди (ялинка, прилавки, борти ковзанки, карусель)
 *  - dynamic : подарунки, сніговики, сніжки — рухаються за законами фізики
 */
export function createPhysics() {
    const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.81, 0) })
    world.allowSleep = true                              // тіла, що заспокоїлись, "засинають" (економія CPU)
    world.broadphase = new CANNON.SAPBroadphase(world)
    world.solver.iterations = 12

    // Матеріали поверхонь: від них залежать тертя та пружність
    const mat = {
        snow: new CANNON.Material('snow'),
        ice: new CANNON.Material('ice'),
        wood: new CANNON.Material('wood'),
        gift: new CANNON.Material('gift'),
        ball: new CANNON.Material('ball'),
        snowman: new CANNON.Material('snowman')
    }
    const contact = (a, b, friction, restitution) =>
        world.addContactMaterial(new CANNON.ContactMaterial(mat[a], mat[b], { friction, restitution }))

    contact('gift', 'snow', 0.55, 0.12)
    contact('gift', 'ice', 0.04, 0.2)      // на кризі подарунки ковзають
    contact('gift', 'wood', 0.4, 0.2)
    contact('gift', 'gift', 0.45, 0.15)
    contact('ball', 'snow', 0.5, 0.25)
    contact('ball', 'ice', 0.02, 0.35)
    contact('ball', 'wood', 0.3, 0.4)
    contact('ball', 'gift', 0.3, 0.25)
    contact('ball', 'snowman', 0.3, 0.2)
    contact('snowman', 'snow', 0.6, 0.05)
    contact('snowman', 'ice', 0.05, 0.1)
    contact('snowman', 'gift', 0.4, 0.15)

    const dynamics = []   // { body, object, born }

    // земля
    const ground = new CANNON.Body({ type: CANNON.Body.STATIC, shape: new CANNON.Plane(), material: mat.snow })
    ground.quaternion.setFromEuler(-Math.PI / 2, 0, 0)
    world.addBody(ground)

    function addStaticBox(x, y, z, hx, hy, hz, material = mat.wood, rotationY = 0) {
        const body = new CANNON.Body({ type: CANNON.Body.STATIC, material })
        body.addShape(new CANNON.Box(new CANNON.Vec3(hx, hy, hz)))
        body.position.set(x, y, z)
        body.quaternion.setFromEuler(0, rotationY, 0)
        world.addBody(body)
        return body
    }

    function addDynamic(body, object, { asleep = false } = {}) {
        world.addBody(body)
        object.position.copy(body.position)
        object.quaternion.copy(body.quaternion)
        if (asleep) body.sleep()
        const entry = { body, object, born: performance.now() }
        dynamics.push(entry)
        return entry
    }

    function remove(entry) {
        world.removeBody(entry.body)
        entry.object.removeFromParent()
        const i = dynamics.indexOf(entry)
        if (i >= 0) dynamics.splice(i, 1)
    }

    function step(dt) {
        world.step(1 / 60, dt, 4)
        for (const { body, object } of dynamics) {
            object.position.copy(body.position)
            object.quaternion.copy(body.quaternion)
        }
    }

    return { world, mat, dynamics, addStaticBox, addDynamic, remove, step }
}

export { CANNON }
