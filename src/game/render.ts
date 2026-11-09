import { BOXES, CELLAR, SHOWER, WORLD, swingPose, type Enemy, type GameState, type Particle, type Player } from './engine.ts'

const MARGIN_STARS = buildStars(16, 1)
const WALL_STARS = buildStars(7, 9)

function buildStars(count: number, seed: number) {
  let n = seed >>> 0
  const next = () => {
    n = (Math.imul(n, 1664525) + 1013904223) >>> 0
    return n / 4294967296
  }
  return Array.from({ length: count }, () => ({
    x: next(),
    y: next(),
    r: 2.2 + next() * 5.5,
    tw: next() * Math.PI * 2,
    a: 0.35 + next() * 0.65,
  }))
}

export function fitWorld(cssW: number, cssH: number) {
  const scale = Math.min(cssW / WORLD.w, cssH / WORLD.h)
  return {
    scale,
    ox: (cssW - WORLD.w * scale) / 2,
    oy: (cssH - WORLD.h * scale) / 2,
  }
}

export function screenToWorld(clientX: number, clientY: number, canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect()
  const fit = fitWorld(rect.width, rect.height)
  return {
    x: (clientX - rect.left - fit.ox) / fit.scale,
    y: (clientY - rect.top - fit.oy) / fit.scale,
  }
}

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string) {
  ctx.save()
  ctx.translate(x, y)
  ctx.fillStyle = fill
  for (const rot of [-Math.PI / 2, Math.PI / 2]) {
    ctx.beginPath()
    for (let i = 0; i < 3; i++) {
      const angle = rot + (i * 2 * Math.PI) / 3
      const px = Math.cos(angle) * r
      const py = Math.sin(angle) * r
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}

function round(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

export function drawGame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  cssW: number,
  cssH: number,
  reduceMotion: boolean,
) {
  const fit = fitWorld(cssW, cssH)
  const mag = reduceMotion ? 0 : state.shake
  const sx = Math.sin(state.elapsed * 46) * mag
  const sy = Math.cos(state.elapsed * 33) * mag

  const sky = ctx.createLinearGradient(0, 0, 0, cssH)
  sky.addColorStop(0, '#12306f')
  sky.addColorStop(0.45, '#0b1d4a')
  sky.addColorStop(1, '#071433')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, cssW, cssH)

  for (const star of MARGIN_STARS) {
    const tw = 0.55 + Math.sin(state.elapsed * 2 + star.tw) * 0.45
    ctx.globalAlpha = star.a * tw
    drawStar(ctx, star.x * cssW, star.y * cssH, star.r, '#f8fbff')
  }
  ctx.globalAlpha = 1

  ctx.save()
  ctx.translate(fit.ox + sx, fit.oy + sy)
  ctx.scale(fit.scale, fit.scale)
  drawRoom(ctx, state)
  ctx.restore()
}

function drawRoom(ctx: CanvasRenderingContext2D, state: GameState) {
  round(ctx, 16, 16, WORLD.w - 32, WORLD.h - 32, 28)
  const wall = ctx.createLinearGradient(0, 0, 0, 150)
  wall.addColorStop(0, '#16357a')
  wall.addColorStop(1, '#10285f')
  ctx.fillStyle = wall
  ctx.fill()

  for (const star of WALL_STARS) {
    const tw = 0.5 + Math.sin(state.elapsed * 2.4 + star.tw) * 0.5
    ctx.globalAlpha = 0.35 + star.a * 0.4 * tw
    drawStar(ctx, 40 + star.x * (WORLD.w - 80), 28 + star.y * 78, star.r * 0.7, '#f8fbff')
  }
  ctx.globalAlpha = 1

  drawBunting(ctx)
  drawFloor(ctx)
  drawCounter(ctx)
  drawShower(ctx)
  drawBoxes(ctx)
  drawCellar(ctx, state)
  drawDoor(ctx, 34, 188)
  drawDoor(ctx, WORLD.w - 34, 188)

  const actors: Array<{ y: number; draw: () => void }> = state.enemies.map((enemy) => ({
    y: enemy.y,
    draw: () => drawEnemy(ctx, enemy, state),
  }))
  actors.push({ y: state.player.y, draw: () => drawPlayer(ctx, state) })
  actors.sort((a, b) => a.y - b.y)
  for (const actor of actors) actor.draw()

  for (const particle of state.particles) drawParticle(ctx, particle)
  for (const pop of state.popups) drawPopup(ctx, pop)

  if (state.hint && state.phase === 'playing') {
    drawCaption(ctx, 'Dusche gibt Gift. Benommene in Keller oder Dusche.', true)
  } else if (
    state.phase === 'playing' &&
    state.toSpawn > 0 &&
    !state.enemies.some((enemy) => enemy.kind === 'netan')
  ) {
    drawCaption(ctx, 'Die nächsten Netanjahuuus kommen zur Tür.', false)
  }
  if (state.phase === 'roundclear') drawBanner(ctx, 'Runde geschafft', 'Die Luke ist zu. Nächste Schicht.')
}

function drawBunting(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = '#f8fbff'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(48, 34)
  ctx.quadraticCurveTo(WORLD.w / 2, 62, WORLD.w - 48, 34)
  ctx.stroke()
  for (let i = 0; i < 6; i++) {
    const t = i / 5
    const x = 48 + (WORLD.w - 96) * t
    const y = 34 + Math.sin(t * Math.PI) * 28
    drawStar(ctx, x, y + 10, i % 2 === 0 ? 7 : 5, i % 2 === 0 ? '#f8fbff' : '#93c5fd')
  }
}

function drawFloor(ctx: CanvasRenderingContext2D) {
  round(ctx, 28, 124, WORLD.w - 56, WORLD.h - 152, 22)
  const floor = ctx.createLinearGradient(0, 124, 0, WORLD.h)
  floor.addColorStop(0, '#2a66d4')
  floor.addColorStop(1, '#1d4ed8')
  ctx.fillStyle = floor
  ctx.fill()

  ctx.save()
  round(ctx, 28, 124, WORLD.w - 56, WORLD.h - 152, 22)
  ctx.clip()
  const tile = 64
  for (let y = 124; y < WORLD.h - 20; y += tile) {
    for (let x = 28; x < WORLD.w - 20; x += tile) {
      const alt = ((x / tile) | 0) + ((y / tile) | 0)
      ctx.fillStyle = alt % 2 === 0 ? 'rgba(248,251,255,0.07)' : 'rgba(7,20,51,0.08)'
      ctx.fillRect(x, y, tile, tile)
      ctx.globalAlpha = 0.72
      drawStar(ctx, x + tile / 2, y + tile / 2, 16, '#f8fbff')
      ctx.globalAlpha = 1
    }
  }
  ctx.restore()
  ctx.save()
  ctx.strokeStyle = 'rgba(248,251,255,0.85)'
  ctx.lineWidth = 4
  round(ctx, 28, 124, WORLD.w - 56, WORLD.h - 152, 22)
  ctx.stroke()
  ctx.restore()
}

function drawCounter(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = 'rgba(7,20,51,0.25)'
  ctx.fillRect(58, 118, 684, 14)
  round(ctx, 52, 48, 696, 76, 16)
  ctx.fillStyle = '#f8fbff'
  ctx.fill()
  ctx.fillStyle = '#1d4ed8'
  ctx.fillRect(52, 96, 696, 18)
  ctx.fillStyle = '#dbeafe'
  ctx.fillRect(52, 108, 696, 8)

  ctx.fillStyle = '#0c1b45'
  ctx.font = '700 18px "Geist Variable", sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText('KELLERBAR', 70, 74)
  ctx.font = '600 12px "Geist Variable", sans-serif'
  ctx.fillStyle = '#1d4ed8'
  ctx.fillText('weiß · blau', 196, 74)

  for (let i = 0; i < 4; i++) {
    const x = 520 + i * 42
    const h = 28
    const y = 90 - h
    round(ctx, x, y, 14, h, 4)
    ctx.fillStyle = i === 1 ? '#86efac' : '#f8fbff'
    ctx.fill()
    ctx.strokeStyle = '#1d4ed8'
    ctx.lineWidth = 1.5
    ctx.stroke()
  }
}

function drawDoor(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save()
  ctx.translate(x, y)
  round(ctx, -18, -28, 36, 70, 8)
  ctx.fillStyle = '#0c1b45'
  ctx.fill()
  ctx.strokeStyle = '#f8fbff'
  ctx.lineWidth = 2
  ctx.stroke()
  drawStar(ctx, 0, 0, 7, '#f8fbff')
  ctx.restore()
}

function drawShower(ctx: CanvasRenderingContext2D) {
  ctx.save()
  ctx.translate(SHOWER.x, SHOWER.y)
  round(ctx, -62, -78, 124, 150, 16)
  ctx.fillStyle = '#f8fbff'
  ctx.fill()
  ctx.strokeStyle = '#1d4ed8'
  ctx.lineWidth = 3
  ctx.stroke()
  ctx.fillStyle = '#dbeafe'
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 3; col++) ctx.fillRect(-48 + col * 32, -58 + row * 28, 28, 24)
  }
  ctx.fillStyle = '#1d4ed8'
  ctx.fillRect(-8, -72, 16, 10)
  ctx.beginPath()
  ctx.arc(0, -58, 8, 0, Math.PI)
  ctx.fill()
  ctx.strokeStyle = '#93c5fd'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(-4, -50)
  ctx.lineTo(-8, -28)
  ctx.moveTo(4, -50)
  ctx.lineTo(8, -30)
  ctx.stroke()
  ctx.fillStyle = 'rgba(29,78,216,0.72)'
  ctx.fillRect(28, -78, 34, 150)
  ctx.fillStyle = '#1d4ed8'
  ctx.font = '700 13px "Geist Variable", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('DUSCHE', 0, 60)
  ctx.restore()
}

function drawBoxes(ctx: CanvasRenderingContext2D) {
  for (const box of BOXES) {
    ctx.save()
    ctx.translate(box.x, box.y)
    round(ctx, -40, -46, 80, 86, 8)
    ctx.fillStyle = '#f8fbff'
    ctx.fill()
    ctx.strokeStyle = '#1d4ed8'
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.strokeStyle = '#93c5fd'
    ctx.beginPath()
    ctx.moveTo(-40, -8)
    ctx.lineTo(40, -8)
    ctx.moveTo(0, -46)
    ctx.lineTo(0, 40)
    ctx.stroke()
    ctx.fillStyle = '#1d4ed8'
    ctx.font = '700 11px "Geist Variable", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('BOX', 0, 32)
    ctx.restore()
  }
}

function drawCellar(ctx: CanvasRenderingContext2D, state: GameState) {
  const near = state.enemies.some((e) => e.dizzy > 0 && Math.hypot(e.x - CELLAR.x, e.y - CELLAR.y) < 130)
  ctx.save()
  ctx.translate(CELLAR.x, CELLAR.y)
  if (near) {
    ctx.fillStyle = 'rgba(248,251,255,0.18)'
    ctx.beginPath()
    ctx.arc(0, 0, 74, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = 'rgba(7,20,51,0.35)'
  ctx.beginPath()
  ctx.ellipse(0, 10, 58, 24, 0, 0, Math.PI * 2)
  ctx.fill()

  const slam = state.cellarSlam > 0 ? state.cellarSlam / 0.38 : 0
  ctx.fillStyle = '#071433'
  ctx.beginPath()
  ctx.ellipse(0, 0, 46, 28, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#f8fbff'
  ctx.lineWidth = 3
  ctx.stroke()

  ctx.save()
  ctx.beginPath()
  ctx.ellipse(0, 0, 40, 22, 0, 0, Math.PI * 2)
  ctx.clip()
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#12306f' : '#0b1d4a'
    ctx.fillRect(-40, -18 + i * 9, 80, 9)
  }
  ctx.restore()

  const open = 34 - slam * 22
  drawHatch(ctx, -open, -1)
  drawHatch(ctx, open, 1)
  ctx.fillStyle = '#f8fbff'
  ctx.font = '700 13px "Geist Variable", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('KELLER', 0, 46)
  ctx.font = '600 11px "Geist Variable", sans-serif'
  ctx.fillStyle = '#dbeafe'
  ctx.fillText(`${state.lockedRound} / ${state.goal}`, 0, 62)
  ctx.restore()
}

function drawHatch(ctx: CanvasRenderingContext2D, x: number, dir: number) {
  ctx.save()
  ctx.translate(x, -6)
  ctx.rotate(dir * 0.15)
  round(ctx, -16, -22, 32, 44, 6)
  ctx.fillStyle = '#f8fbff'
  ctx.fill()
  ctx.strokeStyle = '#1d4ed8'
  ctx.lineWidth = 2
  ctx.stroke()
  drawStar(ctx, 0, 0, 6, '#1d4ed8')
  ctx.restore()
}

function shadow(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = 'rgba(7,20,51,0.28)'
  ctx.beginPath()
  ctx.ellipse(x, y + 24, 16, 7, 0, 0, Math.PI * 2)
  ctx.fill()
}

function drawPlayer(ctx: CanvasRenderingContext2D, state: GameState) {
  const p = state.player
  const blink = p.invuln > 0 && Math.sin(state.elapsed * 28) > 0
  ctx.save()
  ctx.globalAlpha = blink ? 0.45 : 1
  shadow(ctx, p.x, p.y)
  drawBody(ctx, p.x, p.y, 'player', 0, state.elapsed, p.facing, false, '#1d4ed8')
  if (state.bottles > 0) drawFlask(ctx, p.x - 18, p.y - 6)
  if (p.swingT <= 0) drawAim(ctx, p)
  drawWeapon(ctx, state)
  ctx.restore()
}

function drawAim(ctx: CanvasRenderingContext2D, p: Player) {
  ctx.save()
  ctx.translate(p.x + Math.cos(p.facing) * 34, p.y + Math.sin(p.facing) * 26)
  ctx.rotate(p.facing)
  ctx.fillStyle = '#f8fbff'
  ctx.beginPath()
  ctx.moveTo(8, 0)
  ctx.lineTo(-5, 5)
  ctx.lineTo(-5, -5)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy, state: GameState) {
  const bob = Math.sin(state.elapsed * 6 + e.phase) * (e.dizzy > 0 ? 1 : 2.2)
  const scale = e.sucking ? Math.max(0.05, 1 - e.suck * 0.9) : 1
  ctx.save()
  ctx.globalAlpha = e.enter > 0 ? 0.55 + (1 - e.enter / 0.7) * 0.45 : 1
  ctx.translate(e.x, e.y + bob)
  ctx.scale(scale, scale)
  ctx.translate(-e.x, -(e.y + bob))
  shadow(ctx, e.x, e.y + bob)
  const tone = e.kind === 'pinsel' ? '#1e3a5f' : e.kind === 'putin' ? '#334155' : e.shade > 0.5 ? '#1e3a8a' : '#2563eb'
  drawBody(
    ctx,
    e.x,
    e.y + bob,
    e.kind,
    e.tilt + (e.dizzy > 0 ? Math.sin(state.elapsed * 8) * 0.2 : 0),
    state.elapsed + e.phase,
    0,
    e.dizzy > 0,
    tone,
  )
  if (e.poison > 0 && !e.sucking) {
    for (let i = 0; i < 3; i++) {
      const a = state.elapsed * 5 + i * 2
      ctx.fillStyle = '#4ade80'
      ctx.globalAlpha = 0.75
      ctx.beginPath()
      ctx.arc(e.x + Math.cos(a) * 16, e.y + bob - 20 + Math.sin(a) * 8, 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }
  }
  if (e.dizzy > 0 && !e.sucking) {
    for (let i = 0; i < 3; i++) {
      const a = state.elapsed * 6 + i * 2.1
      drawStar(ctx, e.x + Math.cos(a) * 24, e.y + bob - 36 + Math.sin(a) * 7, 4.5, '#f8fbff')
    }
  }
  const plate = e.kind === 'pinsel' ? 'Pinsel' : e.kind === 'putin' ? 'Putinnn' : 'Netanjahuuu'
  drawName(ctx, e.x, e.y + bob - 58, plate)
  ctx.restore()
}

function drawBody(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  look: 'player' | Enemy['kind'],
  tilt: number,
  time: number,
  facing: number,
  dizzy: boolean,
  tone: string,
) {
  const step = Math.sin(time * 8) * 3
  ctx.fillStyle = '#0c1b45'
  ctx.fillRect(x - 9, y + 8, 6, 12 + step)
  ctx.fillRect(x + 3, y + 8, 6, 12 - step)
  ctx.fillStyle = '#f8fbff'
  round(ctx, x - 7, y + 18, 6, 5, 2)
  ctx.fill()
  round(ctx, x + 2, y + 18, 6, 5, 2)
  ctx.fill()

  round(ctx, x - 14, y - 8, 28, 24, 8)
  ctx.fillStyle = look === 'player' ? '#f8fbff' : tone
  ctx.fill()
  ctx.strokeStyle = look === 'player' ? '#1d4ed8' : '#dbeafe'
  ctx.lineWidth = 2
  ctx.stroke()
  if (look === 'player') {
    ctx.fillStyle = '#1d4ed8'
    ctx.fillRect(x - 3, y - 8, 6, 24)
    drawStar(ctx, x, y + 2, 4, '#1d4ed8')
  } else if (look === 'pinsel') {
    ctx.fillStyle = '#f8fbff'
    ctx.fillRect(x - 14, y - 2, 28, 4)
    ctx.fillRect(x - 4, y - 6, 8, 16)
    ctx.fillStyle = '#86efac'
    ctx.fillRect(x - 14, y + 8, 28, 4)
  } else {
    ctx.fillStyle = '#f8fbff'
    ctx.fillRect(x - 4, y - 6, 8, 16)
    ctx.fillStyle = look === 'putin' ? '#cbd5e1' : '#dbeafe'
    ctx.fillRect(x - 14, y + 6, 28, 5)
  }

  ctx.fillStyle = '#f3c7a1'
  ctx.beginPath()
  ctx.arc(x, y - 18, 13, 0, Math.PI * 2)
  ctx.fill()
  if (look === 'player') {
    ctx.fillStyle = '#1a2744'
    ctx.beginPath()
    ctx.arc(x, y - 24, 12, Math.PI, 0)
    ctx.fill()
  }

  const glance = look === 'player' ? Math.cos(facing) * 2 : 0
  if (dizzy) {
    ctx.strokeStyle = '#0c1b45'
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.arc(x - 4, y - 18, 3, time * 8, time * 8 + 4)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(x + 4, y - 18, 3, -time * 8, -time * 8 + 4)
    ctx.stroke()
  } else {
    ctx.fillStyle = '#0c1b45'
    ctx.beginPath()
    ctx.arc(x - 4 + glance, y - 18, 1.7, 0, Math.PI * 2)
    ctx.arc(x + 4 + glance, y - 18, 1.7, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#0c1b45'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(x - 8, y - 23)
    ctx.lineTo(x - 2, y - 21)
    ctx.moveTo(x + 8, y - 23)
    ctx.lineTo(x + 2, y - 21)
    ctx.stroke()
  }
  ctx.strokeStyle = '#a15b48'
  ctx.lineWidth = 1.4
  ctx.beginPath()
  ctx.arc(x, y - 13, 4, 0.2, Math.PI - 0.2)
  ctx.stroke()
  if (look === 'pinsel') {
    ctx.fillStyle = '#2a211c'
    ctx.fillRect(x - 4, y - 16, 8, 5)
    drawCap(ctx, x, y - 28)
  } else if (look === 'netan') {
    drawTopHat(ctx, x, y - 30, tilt)
  }
}

function drawCap(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = '#0f2744'
  ctx.beginPath()
  ctx.ellipse(x, y + 4, 14, 5, 0, 0, Math.PI * 2)
  ctx.fill()
  round(ctx, x - 9, y - 10, 18, 14, 4)
  ctx.fill()
  ctx.fillStyle = '#f8fbff'
  ctx.fillRect(x - 9, y + 1, 18, 2)
}

function drawFlask(ctx: CanvasRenderingContext2D, x: number, y: number) {
  round(ctx, x - 5, y - 8, 10, 16, 3)
  ctx.fillStyle = '#4ade80'
  ctx.fill()
  ctx.strokeStyle = '#14532d'
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.fillStyle = '#14532d'
  ctx.fillRect(x - 2, y - 12, 4, 5)
}

function drawTopHat(ctx: CanvasRenderingContext2D, x: number, y: number, tilt: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(tilt)
  ctx.fillStyle = '#141821'
  ctx.beginPath()
  ctx.ellipse(0, 2, 18, 5.5, 0, 0, Math.PI * 2)
  ctx.fill()
  round(ctx, -10, -24, 20, 24, 3)
  ctx.fill()
  ctx.fillStyle = '#f8fbff'
  ctx.fillRect(-10, -8, 20, 3)
  ctx.fillStyle = '#1d4ed8'
  ctx.fillRect(-10, -5, 20, 3)
  drawStar(ctx, 0, -16, 3.2, '#f8fbff')
  ctx.restore()
}

function drawName(ctx: CanvasRenderingContext2D, x: number, y: number, text: string) {
  ctx.font = '700 11px "Geist Variable", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const w = ctx.measureText(text).width
  round(ctx, x - w / 2 - 6, y - 8, w + 12, 16, 8)
  ctx.fillStyle = 'rgba(248,251,255,0.95)'
  ctx.fill()
  ctx.fillStyle = '#1d4ed8'
  ctx.fillText(text, x, y)
}

function drawWeapon(ctx: CanvasRenderingContext2D, state: GameState) {
  const pose = swingPose(state.player, state.weapon)
  const hx = state.player.x + Math.cos(pose.facing) * 16
  const hy = state.player.y + Math.sin(pose.facing) * 10 + 2
  if (pose.weapon === 'bat') drawBat(ctx, hx, hy, pose)
  else drawWhip(ctx, hx, hy, pose)
}

function drawBat(
  ctx: CanvasRenderingContext2D,
  hx: number,
  hy: number,
  pose: { active: boolean; u: number; facing: number },
) {
  const swing = pose.active ? ease(pose.u) : 0
  const ang = pose.facing + (pose.active ? -1.1 + 2.5 * swing : -0.9)
  const tx = hx + Math.cos(ang) * 48
  const ty = hy + Math.sin(ang) * 48
  ctx.strokeStyle = '#8a5a2a'
  ctx.lineWidth = 7
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(hx, hy)
  ctx.lineTo(tx, ty)
  ctx.stroke()
  ctx.strokeStyle = '#e7c08a'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(hx + Math.cos(ang) * 20, hy + Math.sin(ang) * 20)
  ctx.lineTo(tx, ty)
  ctx.stroke()
  ctx.fillStyle = '#f3c7a1'
  ctx.beginPath()
  ctx.arc(hx, hy, 5, 0, Math.PI * 2)
  ctx.fill()
}

function drawWhip(
  ctx: CanvasRenderingContext2D,
  hx: number,
  hy: number,
  pose: { active: boolean; u: number; facing: number },
) {
  const wave = pose.active ? Math.sin(pose.u * Math.PI) : 0.15
  const reach = 18 + wave * 168
  const tipX = hx + Math.cos(pose.facing) * reach
  const tipY = hy + Math.sin(pose.facing) * reach
  const wobble = pose.active ? Math.sin(pose.u * 16) * 12 * wave : 4
  const mx = (hx + tipX) / 2 - Math.sin(pose.facing) * wobble
  const my = (hy + tipY) / 2 + Math.cos(pose.facing) * wobble
  ctx.strokeStyle = '#6b3a1e'
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(hx, hy)
  ctx.quadraticCurveTo(mx, my, tipX, tipY)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(248,251,255,0.9)'
  ctx.lineWidth = 1.3
  ctx.stroke()
  if (pose.active && pose.u > 0.2 && pose.u < 0.8) {
    drawStar(ctx, tipX, tipY, 7, '#f8fbff')
    drawStar(ctx, tipX - Math.sin(pose.facing) * 8, tipY + Math.cos(pose.facing) * 8, 4, '#93c5fd')
  }
  ctx.fillStyle = '#f3c7a1'
  ctx.beginPath()
  ctx.arc(hx, hy, 5, 0, Math.PI * 2)
  ctx.fill()
}

function drawParticle(ctx: CanvasRenderingContext2D, p: Particle) {
  ctx.save()
  ctx.globalAlpha = Math.max(0, p.life / p.max)
  ctx.translate(p.x, p.y)
  ctx.rotate(p.rot)
  if (p.kind === 'star') drawStar(ctx, 0, 0, p.size, p.color)
  else {
    ctx.fillStyle = p.color
    ctx.beginPath()
    ctx.arc(0, 0, p.size * 0.45, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

function drawPopup(ctx: CanvasRenderingContext2D, pop: { x: number; y: number; text: string; life: number; max: number }) {
  ctx.save()
  ctx.globalAlpha = Math.max(0, pop.life / pop.max)
  ctx.font = '800 16px "Geist Variable", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineWidth = 4
  ctx.strokeStyle = '#0c1b45'
  ctx.fillStyle = '#f8fbff'
  ctx.strokeText(pop.text, pop.x, pop.y)
  ctx.fillText(pop.text, pop.x, pop.y)
  ctx.restore()
}

function drawCaption(ctx: CanvasRenderingContext2D, text: string, light: boolean) {
  ctx.font = '600 13px "Geist Variable", sans-serif'
  const w = ctx.measureText(text).width
  const x = WORLD.w / 2
  const y = 148
  round(ctx, x - w / 2 - 12, y - 12, w + 24, 24, 12)
  ctx.fillStyle = light ? 'rgba(248,251,255,0.92)' : 'rgba(12,27,69,0.72)'
  ctx.fill()
  ctx.fillStyle = light ? '#0c1b45' : '#f8fbff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x, y)
}

function drawBanner(ctx: CanvasRenderingContext2D, title: string, sub: string) {
  round(ctx, 180, 250, 440, 92, 18)
  ctx.fillStyle = 'rgba(248,251,255,0.94)'
  ctx.fill()
  ctx.strokeStyle = '#1d4ed8'
  ctx.lineWidth = 3
  ctx.stroke()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#1d4ed8'
  ctx.font = '800 26px "Geist Variable", sans-serif'
  ctx.fillText(title, 400, 282)
  ctx.fillStyle = '#0c1b45'
  ctx.font = '600 14px "Geist Variable", sans-serif'
  ctx.fillText(sub, 400, 312)
}

function ease(u: number) {
  return u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2
}
