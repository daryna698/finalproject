import * as THREE from 'three'

/**
 * Декор площі: ліхтарні стовпи, бочки, льодяники-вказівники.
 * Складний об'єкт "льодяник" будується з кривої (TubeGeometry) зі смугастою текстурою.
 */
export function createProps(ctx) {
    const { materials, scene, fairy } = ctx
    const group = new THREE.Group()

    // ліхтарні стовпи вздовж центральної доріжки
    const lampSpots = [[-2, 10], [6, 10], [-2, 1], [6, 1], [-17, -10], [17, -10]]
    for (const [x, z] of lampSpots) {
        const lamp = new THREE.Group()
        lamp.position.set(x, 0, z)

        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.5, 12), materials.metal)
        base.position.y = 0.25
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 4.2, 10), materials.metal)
        pole.position.y = 2.3
        const arm = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.04, 6, 14, Math.PI), materials.metal)
        arm.position.set(0.35, 4.4, 0)
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 16), materials.lantern)
        bulb.position.set(0.7, 4.3, 0)
        const wreath = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.07, 8, 20), new THREE.MeshStandardMaterial({ color: '#1f6b3a', roughness: 0.9 }))
        wreath.position.set(0, 3.2, 0.1)
        const bow = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), new THREE.MeshStandardMaterial({ color: '#c8202a' }))
        bow.position.set(0, 2.93, 0.14)

        for (const m of [base, pole, arm, wreath]) m.castShadow = true
        lamp.add(base, pole, arm, bulb, wreath, bow)
        group.add(lamp)
    }

    // бочки зі снігом
    const hoopMaterial = materials.metal
    const barrelSpots = [[-3.5, -8.5], [3.5, -8.5], [-15.5, -9.5], [15.5, -9.5], [8, 1]]
    for (const [x, z] of barrelSpots) {
        const barrel = new THREE.Group()
        barrel.position.set(x, 0, z)
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.38, 0.95, 18), materials.woodDark)
        body.position.y = 0.475
        body.castShadow = true
        body.receiveShadow = true
        barrel.add(body)
        for (const y of [0.2, 0.75]) {
            const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.405, 0.02, 6, 20), hoopMaterial)
            hoop.rotation.x = Math.PI / 2
            hoop.position.y = y
            barrel.add(hoop)
        }
        const snowTop = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.06, 18), materials.snow)
        snowTop.position.y = 0.97
        barrel.add(snowTop)
        group.add(barrel)
    }

    // льодяники-вказівники вздовж доріжки
    const pts = []
    for (let i = 0; i <= 10; i++) pts.push(new THREE.Vector3(0, i * 0.1, 0))
    for (let i = 1; i <= 14; i++) {
        const a = (i / 14) * Math.PI
        pts.push(new THREE.Vector3(0.2 - Math.cos(a) * 0.2, 1 + Math.sin(a) * 0.2, 0))
    }
    const caneGeometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.045, 10)
    const caneSpots = []
    for (let i = 0; i < 8; i++) {
        caneSpots.push([0.2, 3.2 + i * 1.6], [3.8, 3.2 + i * 1.6])
    }
    caneSpots.forEach(([x, z], i) => {
        const cane = new THREE.Mesh(caneGeometry, materials.candy)
        cane.position.set(x, 0, z)
        cane.rotation.y = x < 2 ? Math.PI : 0
        cane.scale.setScalar(0.9 + (i % 3) * 0.08)
        cane.castShadow = true
        group.add(cane)
    })

    // гірлянди між лампами центральної доріжки
    const top = (x, z) => new THREE.Vector3(x + 0.7, 4.3, z)
    fairy.addString(top(-2, 10), top(-2, 1), { sag: 0.9, spacing: 0.5 })
    fairy.addString(top(6, 10), top(6, 1), { sag: 0.9, spacing: 0.5 })
    fairy.addString(top(-2, 1), top(6, 1), { sag: 1.0, spacing: 0.5 })

    scene.add(group)
}
