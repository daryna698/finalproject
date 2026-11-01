import * as THREE from 'three'
import { createRandom } from './random.js'

/* ------------------------------------------------------------------
 *  Текстури, що малюються кодом (canvas) — окремі файли не потрібні
 * ------------------------------------------------------------------ */

function makeCanvas(w, h) {
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    return [canvas, canvas.getContext('2d')]
}

function toTexture(canvas, { repeat = false, srgb = true } = {}) {
    const texture = new THREE.CanvasTexture(canvas)
    if (srgb) texture.colorSpace = THREE.SRGBColorSpace
    if (repeat) {
        texture.wrapS = THREE.RepeatWrapping
        texture.wrapT = THREE.RepeatWrapping
    }
    texture.anisotropy = 8
    return texture
}

// Дерев'яні дошки
export function woodTexture() {
    const [canvas, g] = makeCanvas(512, 512)
    const rnd = createRandom(5)
    const planks = 8
    const h = 512 / planks

    for (let i = 0; i < planks; i++) {
        g.fillStyle = `hsl(${26 + rnd() * 6}, ${36 + rnd() * 14}%, ${40 + rnd() * 10}%)`
        g.fillRect(0, i * h, 512, h)

        for (let j = 0; j < 18; j++) {
            const y = i * h + rnd() * h
            g.strokeStyle = `rgba(40, 22, 8, ${0.05 + rnd() * 0.12})`
            g.lineWidth = 1 + rnd() * 1.5
            g.beginPath()
            g.moveTo(0, y)
            g.bezierCurveTo(150, y + rnd() * 6 - 3, 350, y + rnd() * 6 - 3, 512, y + rnd() * 4 - 2)
            g.stroke()
        }
        g.fillStyle = 'rgba(20, 10, 4, 0.55)'
        g.fillRect(0, i * h, 512, 2)
    }
    return toTexture(canvas, { repeat: true })
}

// Смугасте полотно (навіси над прилавками, дах каруселі)
export function stripeTexture(colorA, colorB, count = 8) {
    const [canvas, g] = makeCanvas(512, 64)
    const w = 512 / count
    for (let i = 0; i < count; i++) {
        g.fillStyle = i % 2 === 0 ? colorA : colorB
        g.fillRect(i * w, 0, w + 1, 64)
    }
    return toTexture(canvas, { repeat: true })
}

// Хвоя — використовується як bump-map для ялинки
export function needleBumpTexture() {
    const [canvas, g] = makeCanvas(256, 256)
    const rnd = createRandom(8)
    g.fillStyle = '#808080'
    g.fillRect(0, 0, 256, 256)
    for (let i = 0; i < 2200; i++) {
        const x = rnd() * 256
        const y = rnd() * 256
        const len = 6 + rnd() * 14
        const a = -Math.PI / 2 + (rnd() - 0.5) * 1.6
        g.strokeStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)'
        g.lineWidth = 1
        g.beginPath()
        g.moveTo(x, y)
        g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len)
        g.stroke()
    }
    return toTexture(canvas, { repeat: true, srgb: false })
}

// Льодяник: діагональні червоно-білі смуги
export function candyTexture() {
    const [canvas, g] = makeCanvas(256, 256)
    g.fillStyle = '#fff7f0'
    g.fillRect(0, 0, 256, 256)
    g.fillStyle = '#d8232a'
    for (let x0 = -256; x0 < 512; x0 += 64) {
        g.beginPath()
        g.moveTo(x0, 0)
        g.lineTo(x0 + 32, 0)
        g.lineTo(x0 + 32 + 256, 256)
        g.lineTo(x0 + 256, 256)
        g.closePath()
        g.fill()
    }
    return toTexture(canvas, { repeat: true })
}

// Вивіска з текстом
export function signTexture(text, { bg = '#7b2d26', fg = '#fff1cf', border = '#e8c36a' } = {}) {
    const [canvas, g] = makeCanvas(512, 128)
    g.fillStyle = bg
    g.fillRect(0, 0, 512, 128)
    g.strokeStyle = border
    g.lineWidth = 6
    g.strokeRect(8, 8, 496, 112)
    g.fillStyle = fg
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    let size = 62
    g.font = `bold ${size}px Georgia, serif`
    while (g.measureText(text).width > 440 && size > 24) {
        size -= 2
        g.font = `bold ${size}px Georgia, serif`
    }
    g.fillText(text, 256, 68)
    return toTexture(canvas)
}

// Подряпини від ковзанів на льоду: багато дуг різної довжини (береться червоний канал)
export function iceMarksTexture() {
    const size = 1024
    const [canvas, g] = makeCanvas(size, size)
    const rnd = createRandom(13)
    g.fillStyle = '#000'
    g.fillRect(0, 0, size, size)
    g.lineCap = 'round'

    for (let i = 0; i < 520; i++) {
        const cx = rnd() * size
        const cy = rnd() * size
        const radius = 80 + rnd() * 520
        const start = rnd() * Math.PI * 2
        const length = 0.15 + rnd() * 0.8
        const shade = Math.floor(70 + rnd() * 150)
        g.strokeStyle = `rgba(${shade},${shade},${shade},${0.25 + rnd() * 0.5})`
        g.lineWidth = 0.6 + rnd() * 1.8
        g.beginPath()
        g.arc(cx, cy, radius, start, start + length)
        g.stroke()
    }
    // кілька "вісімок" та кіл — слід від фігуристів
    for (let i = 0; i < 12; i++) {
        const cx = size * (0.2 + rnd() * 0.6)
        const cy = size * (0.2 + rnd() * 0.6)
        const r = 40 + rnd() * 90
        g.strokeStyle = 'rgba(210,210,210,0.55)'
        g.lineWidth = 1.4
        g.beginPath()
        g.arc(cx - r * 0.5, cy, r, 0, Math.PI * 2)
        g.stroke()
        g.beginPath()
        g.arc(cx + r * 0.5, cy, r, 0, Math.PI * 2)
        g.stroke()
    }
    const texture = toTexture(canvas, { srgb: false })
    texture.wrapS = THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping
    return texture
}

// М'який круглий спрайт (дим із димарів)
export function softSpriteTexture() {
    const [canvas, g] = makeCanvas(64, 64)
    const gradient = g.createRadialGradient(32, 32, 0, 32, 32, 30)
    gradient.addColorStop(0, 'rgba(255,255,255,0.9)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = gradient
    g.fillRect(0, 0, 64, 64)
    return toTexture(canvas)
}

/* ------------------------------------------------------------------
 *  Завантаження файлових текстур (імпорт)
 * ------------------------------------------------------------------ */
const FILES = {
    groundDiff: 'ground_diff.webp',
    groundNor: 'ground_nor.webp',
    groundArm: 'ground_arm.webp',
    brickDiff: 'brick_diff.webp',
    brickNor: 'brick_nor.webp',
    brickArm: 'brick_arm.webp'
}
const COLOR_MAPS = new Set(['groundDiff', 'brickDiff'])

export async function loadAssets(onProgress) {
    const manager = new THREE.LoadingManager()
    manager.onProgress = (url, loaded, total) => onProgress?.(loaded / total)
    const loader = new THREE.TextureLoader(manager)
    const base = `${import.meta.env.BASE_URL}textures/`

    const entries = await Promise.all(
        Object.entries(FILES).map(async ([key, file]) => {
            const texture = await loader.loadAsync(base + file)
            texture.wrapS = THREE.RepeatWrapping
            texture.wrapT = THREE.RepeatWrapping
            texture.anisotropy = 8
            if (COLOR_MAPS.has(key)) texture.colorSpace = THREE.SRGBColorSpace
            return [key, texture]
        })
    )
    const assets = Object.fromEntries(entries)

    // земля: велика площа → багато повторень
    for (const key of ['groundDiff', 'groundNor', 'groundArm']) assets[key].repeat.set(110, 110)

    return assets
}
