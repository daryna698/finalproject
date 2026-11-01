import * as THREE from 'three'

// Спільні геометрії (всі люди використовують одні й ті самі — економимо пам'ять)
const G = {
    leg: new THREE.CapsuleGeometry(0.075, 0.6, 4, 8),
    arm: new THREE.CapsuleGeometry(0.058, 0.42, 4, 8),
    torso: new THREE.CapsuleGeometry(0.17, 0.42, 6, 12),
    head: new THREE.SphereGeometry(0.13, 16, 16),
    hat: new THREE.ConeGeometry(0.14, 0.3, 14),
    hatBand: new THREE.TorusGeometry(0.13, 0.03, 8, 16),
    pom: new THREE.SphereGeometry(0.045, 10, 10),
    scarf: new THREE.TorusGeometry(0.15, 0.05, 8, 16),
    blade: new THREE.BoxGeometry(0.05, 0.035, 0.3),
    nose: new THREE.SphereGeometry(0.02, 6, 6)
}

const matCache = new Map()
const std = (color, roughness = 0.8) => {
    const key = color + roughness
    if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness }))
    return matCache.get(key)
}

/**
 * Проста "складна" модель людини з рухомими кінцівками.
 * Повертає групу; у group.userData лежать шарніри: legL, legR, armL, armR — їх крутить анімація.
 * Модель дивиться в бік +z.
 */
export function createPerson({
    coat = '#d9534f', pants = '#2c3e50', hat = '#ffffff', scarf = '#f5e6c8',
    skin = '#e0b08c', skates = true, santa = false, scale = 1
} = {}) {
    const group = new THREE.Group()
    const metal = std('#c9ced6', 0.3)

    // ноги (шарнір у стегні)
    const legs = []
    for (const side of [-1, 1]) {
        const pivot = new THREE.Group()
        pivot.position.set(side * 0.1, 0.9, 0)
        const leg = new THREE.Mesh(G.leg, std(pants))
        leg.position.y = -0.45
        leg.castShadow = true
        pivot.add(leg)
        if (skates) {
            const blade = new THREE.Mesh(G.blade, metal)
            blade.position.set(0, -0.93, 0.04)
            pivot.add(blade)
        } else {
            const boot = new THREE.Mesh(G.blade, std('#2a1f1a'))
            boot.scale.set(1.8, 2.2, 0.8)
            boot.position.set(0, -0.9, 0.04)
            pivot.add(boot)
        }
        group.add(pivot)
        legs.push(pivot)
    }

    // тулуб
    const torso = new THREE.Mesh(G.torso, std(santa ? '#c8202a' : coat))
    torso.position.y = 1.2
    torso.castShadow = true
    group.add(torso)

    // руки
    const arms = []
    for (const side of [-1, 1]) {
        const pivot = new THREE.Group()
        pivot.position.set(side * 0.24, 1.38, 0)
        const arm = new THREE.Mesh(G.arm, std(santa ? '#c8202a' : coat))
        arm.position.y = -0.26
        arm.castShadow = true
        pivot.add(arm)
        group.add(pivot)
        arms.push(pivot)
    }

    // голова, шарф, шапка
    const head = new THREE.Mesh(G.head, std(skin, 0.6))
    head.position.y = 1.68
    head.castShadow = true
    group.add(head)

    const scarfMesh = new THREE.Mesh(G.scarf, std(scarf, 0.9))
    scarfMesh.position.y = 1.5
    scarfMesh.rotation.x = Math.PI / 2
    group.add(scarfMesh)

    const hatMesh = new THREE.Mesh(G.hat, std(santa ? '#c8202a' : hat, 0.9))
    hatMesh.position.y = 1.86
    hatMesh.castShadow = true
    const pom = new THREE.Mesh(G.pom, std('#ffffff', 1))
    pom.position.y = 1.99
    const band = new THREE.Mesh(G.hatBand, std('#ffffff', 1))
    band.position.y = 1.76
    band.rotation.x = Math.PI / 2
    group.add(hatMesh, pom, band)

    if (santa) {
        // борода
        const beard = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 12), std('#ffffff', 1))
        beard.position.set(0, 1.6, 0.07)
        beard.scale.set(1, 1.2, 0.7)
        group.add(beard)
    }

    group.scale.setScalar(scale)
    group.userData = { legs, arms, torso, head }
    return group
}
