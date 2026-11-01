import * as THREE from 'three'

export const PALETTE = ['#ff3b3b', '#ffb21e', '#3bd16f', '#35a7ff', '#ff59c9', '#fff1c9']

/**
 * Система гірлянд: сотні лампочок малюються ОДНИМ InstancedMesh.
 * Кожна лампочка має режим:
 *   'twinkle' — мерехтить,  'chase' — "біжить" по колу/ланцюжку,  'steady' — світить рівно.
 * Колір лампочки множиться на intensity > 1 (HDR), тому Bloom робить навколо неї сяйво.
 */
export class FairyLights {
    constructor(wireMaterial) {
        this.bulbs = []
        this.wires = new THREE.Group()
        this.wireMaterial = wireMaterial
        this.intensity = 4
        this.enabled = true
        this.mesh = null
        this._color = new THREE.Color()
    }

    addBulb(position, color, mode = 'twinkle', extra = {}) {
        this.bulbs.push({
            p: position.clone(),
            color: new THREE.Color(color),
            phase: Math.random() * Math.PI * 2,
            speed: 1.2 + Math.random() * 2,
            mode,
            order: 0,
            ...extra
        })
    }

    // Гірлянда між двома точками з провисанням
    addString(a, b, { sag = 0.3, spacing = 0.4, palette = PALETTE, mode = 'twinkle', wire = true } = {}) {
        const pts = []
        const segments = 20
        for (let i = 0; i <= segments; i++) {
            const s = i / segments
            const p = new THREE.Vector3().lerpVectors(a, b, s)
            p.y -= sag * 4 * s * (1 - s)
            pts.push(p)
        }
        const curve = new THREE.CatmullRomCurve3(pts)

        if (wire) {
            const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.012, 4), this.wireMaterial)
            this.wires.add(tube)
        }

        const count = Math.max(2, Math.floor(curve.getLength() / spacing))
        for (let i = 0; i <= count; i++) {
            this.addBulb(curve.getPointAt(i / count), palette[i % palette.length], mode, { order: i })
        }
    }

    // Кільце лампочок (карусель)
    addRing(center, radius, count, y, color, mode = 'chase') {
        for (let i = 0; i < count; i++) {
            const a = (i / count) * Math.PI * 2
            const p = new THREE.Vector3(center.x + Math.cos(a) * radius, y, center.z + Math.sin(a) * radius)
            this.addBulb(p, color, mode, { order: i })
        }
    }

    // Створюємо InstancedMesh (викликати ПІСЛЯ того, як усі лампочки додані)
    build(scene) {
        const geometry = new THREE.SphereGeometry(0.055, 10, 10)
        const material = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false })
        this.mesh = new THREE.InstancedMesh(geometry, material, this.bulbs.length)
        this.mesh.frustumCulled = false

        const dummy = new THREE.Object3D()
        this.bulbs.forEach((b, i) => {
            dummy.position.copy(b.p)
            dummy.updateMatrix()
            this.mesh.setMatrixAt(i, dummy.matrix)
            this.mesh.setColorAt(i, b.color)
        })
        this.mesh.instanceMatrix.needsUpdate = true

        scene.add(this.mesh, this.wires)
    }

    update(time) {
        if (!this.mesh) return
        const base = this.enabled ? this.intensity : 0

        for (let i = 0; i < this.bulbs.length; i++) {
            const b = this.bulbs[i]
            let k = 1
            if (b.mode === 'twinkle') {
                k = 0.55 + 0.45 * Math.sin(time * b.speed + b.phase)
            } else if (b.mode === 'chase') {
                const s = Math.sin(time * 4 - b.order * 0.5)
                k = 0.2 + 1.1 * Math.max(0, s) ** 2
            }
            this._color.copy(b.color).multiplyScalar(k * base)
            this.mesh.setColorAt(i, this._color)
        }
        this.mesh.instanceColor.needsUpdate = true
    }
}
