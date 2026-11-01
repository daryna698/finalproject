import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { woodTexture, needleBumpTexture, candyTexture } from './textures.js'

/**
 * Карта оточення для відблисків на металі та кульках (RoomEnvironment → PMREM).
 * Використовується лише в окремих матеріалах (envMap), щоб не засвітлювати всю нічну сцену.
 */
export function createEnvMap(renderer) {
    const pmrem = new THREE.PMREMGenerator(renderer)
    const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    pmrem.dispose()
    return envMap
}

/** Усі спільні матеріали сцени (створюються один раз). */
export function createMaterials(assets, envMap) {
    const wood = woodTexture()
    const candy = candyTexture()
    candy.repeat.set(5, 1)

    // Сніг на землі: файлові текстури (diff + normal + AO/roughness)
    const ground = new THREE.MeshStandardMaterial({
        map: assets.groundDiff,
        normalMap: assets.groundNor,
        normalScale: new THREE.Vector2(0.8, 0.8),
        aoMap: assets.groundArm,
        roughnessMap: assets.groundArm,
        color: '#f1f6ff',
        roughness: 1
    })

    const brick = new THREE.MeshStandardMaterial({
        map: assets.brickDiff,
        normalMap: assets.brickNor,
        aoMap: assets.brickArm,
        roughnessMap: assets.brickArm,
        color: '#d9b8a8'
    })

    const makeWood = (tint = '#ffffff') => new THREE.MeshStandardMaterial({ map: wood, color: tint, roughness: 0.82 })

    return {
        envMap,
        ground,
        brick,
        wood: makeWood(),
        woodDark: makeWood('#b08a68'),
        woodLight: makeWood('#f0e4d0'),
        snow: new THREE.MeshStandardMaterial({ color: '#f4f8ff', roughness: 0.95 }),
        // хвоя: кольори вершин + bump-текстура
        needles: new THREE.MeshStandardMaterial({
            vertexColors: true, bumpMap: needleBumpTexture(), bumpScale: 2.5, roughness: 0.9, side: THREE.DoubleSide
        }),
        gold: new THREE.MeshStandardMaterial({
            color: '#ffcf6a', metalness: 1, roughness: 0.25, envMap, envMapIntensity: 1.1,
            emissive: '#ff9d1f', emissiveIntensity: 0.12
        }),
        metal: new THREE.MeshStandardMaterial({ color: '#1d1f24', roughness: 0.5, metalness: 0.7 }),
        copper: new THREE.MeshStandardMaterial({ color: '#c46f3f', metalness: 0.9, roughness: 0.35, envMap, envMapIntensity: 0.9 }),
        ceramic: new THREE.MeshStandardMaterial({ color: '#f3ece0', roughness: 0.35 }),
        icicle: new THREE.MeshStandardMaterial({
            color: '#cfe8ff', roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.75,
            emissive: '#5f8fbf', emissiveIntensity: 0.25
        }),
        candy: new THREE.MeshStandardMaterial({ map: candy, roughness: 0.3 }),
        // емісійні матеріали (світяться → bloom)
        lantern: new THREE.MeshStandardMaterial({ color: '#fff0d0', emissive: '#ffb25a', emissiveIntensity: 3.2 }),
        star: new THREE.MeshStandardMaterial({
            color: '#ffe08a', metalness: 0.6, roughness: 0.3, emissive: '#ffb81f', emissiveIntensity: 2.4
        }),
        wire: new THREE.MeshStandardMaterial({ color: '#0e0f12', roughness: 0.6 })
    }
}
