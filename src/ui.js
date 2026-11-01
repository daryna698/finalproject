import GUI from 'lil-gui'
import * as THREE from 'three'

/**
 * Панель налаштувань (lil-gui): світло, рендер, сніг, анімація, фізика, камера.
 * Усі повзунки напряму змінюють об'єкти сцени.
 */
export function createUI(app) {
    const { renderer, composer, bloom, grade, moon, hemi, fairy, warmLights, sky, snow, controls, carousel, rink, physicsProps, physics, applyQuality } = app

    const gui = new GUI({ title: '🎄 Налаштування сцени' })

    /* Рендер */
    const render = gui.addFolder('Рендер')
    const quality = { level: 'Висока' }
    render.add(quality, 'level', ['Низька', 'Середня', 'Висока']).name('Якість').onChange(applyQuality)
    render.add(renderer, 'toneMappingExposure', 0.3, 2.5, 0.01).name('Експозиція')
    render.add(bloom, 'strength', 0, 2, 0.01).name('Сяйво (bloom)')
    render.add(bloom, 'radius', 0, 1.5, 0.01).name('Радіус сяйва')
    render.add(bloom, 'threshold', 0, 2, 0.01).name('Поріг сяйва')
    render.add(grade.uniforms.uVignette, 'value', 0, 1.5, 0.01).name('Віньєтка')
    render.add(grade.uniforms.uGrain, 'value', 0, 0.15, 0.001).name('Зерно')
    render.add(grade.uniforms.uWarm, 'value', 0, 1, 0.01).name('Теплі світла')
    render.add(renderer.shadowMap, 'enabled').name('Тіні').onChange(() => {
        scene_needs_update(app)
    })

    /* Світло */
    const light = gui.addFolder('Світло')
    light.add(moon, 'intensity', 0, 3, 0.01).name('Місяць')
    light.addColor(moon, 'color').name('Колір місяця')
    light.add(hemi, 'intensity', 0, 2, 0.01).name('Розсіяне світло')
    const warm = { multiplier: 1 }
    light.add(warm, 'multiplier', 0, 2.5, 0.01).name('Тепле світло будиночків').onChange((v) => {
        for (const l of warmLights) l.intensity = l.userData.base * v
    })
    light.add(fairy, 'intensity', 0, 12, 0.1).name('Яскравість гірлянд')
    light.add(fairy, 'enabled').name('Гірлянди увімкнені')
    light.add(sky.material.uniforms.uAurora, 'value', 0, 2, 0.01).name('Північне сяйво')

    /* Сніг */
    const snowFolder = gui.addFolder('Сніг')
    snowFolder.add(snow.material.uniforms.uDensity, 'value', 0, 1, 0.01).name('Кількість')
    snowFolder.add(snow.material.uniforms.uWind, 'value', -3, 3, 0.01).name('Вітер')
    snowFolder.add(snow.material.uniforms.uSize, 'value', 0.3, 3, 0.01).name('Розмір сніжинок')

    /* Анімація */
    const anim = gui.addFolder('Анімація')
    anim.add(carousel.state, 'speed', 0, 2, 0.01).name('Швидкість каруселі')
    anim.add(rink.state, 'speed', 0, 3, 0.01).name('Швидкість ковзанярів')
    anim.add(controls, 'autoRotate').name('Автооберт камери')
    anim.add(controls, 'autoRotateSpeed', 0.2, 4, 0.1).name('Швидкість оберту')

    /* Фізика */
    const phys = gui.addFolder('Фізика')
    const g = { gravity: 9.81 }
    phys.add(g, 'gravity', 0, 25, 0.1).name('Гравітація').onChange((v) => physics.world.gravity.set(0, -v, 0))
    phys.add(physicsProps.settings, 'speed', 10, 50, 1).name('Швидкість сніжки')
    phys.add(physicsProps.settings, 'radius', 0.1, 0.8, 0.01).name('Розмір сніжки')
    phys.add({ rain: () => physicsProps.giftRain(14) }, 'rain').name('🎁 Дощ подарунків')
    phys.add({ reset: () => physicsProps.reset() }, 'reset').name('↺ Скинути сцену')

    for (const folder of [light, snowFolder, anim, phys]) folder.open()
    render.open()
    return gui
}

function scene_needs_update(app) {
    // при вимкненні/вмиканні тіней матеріалам потрібно перекомпілюватись
    app.scene.traverse((o) => {
        if (o.material) {
            const mats = Array.isArray(o.material) ? o.material : [o.material]
            mats.forEach((m) => { m.needsUpdate = true })
        }
    })
}
