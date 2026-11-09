export const WORLD = { w: 800, h: 600 }
export const FLOOR = { left: 46, right: 754, top: 176, bottom: 552 }
export const CELLAR = { x: 400, y: 492, r: 40 }

export type Weapon = 'bat' | 'whip'
export type Phase = 'playing' | 'roundclear' | 'gameover'

export interface InputState {
  mx: number
  my: number
  strike: boolean
  holding: boolean
  aimX: number | null
  aimY: number | null
  weapon: Weapon
}

export interface Enemy {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  dizzy: number
  sucking: boolean
  suck: number
  tilt: number
  wander: number
  wanderT: number
  phase: number
  flash: number
  enter: number
  radius: number
  hitSwing: number
  shade: number
  reel: number
}

export interface Player {
  x: number
  y: number
  facing: number
  radius: number
  swingT: number
  swingDur: number
  swingId: number
  swingFacing: number
  swingWeapon: Weapon
  invuln: number
  flash: number
}

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
  size: number
  rot: number
  vr: number
  kind: 'star' | 'dot'
  color: string
}

export interface Popup {
  x: number
  y: number
  text: string
  life: number
  max: number
}

export interface GameState {
  phase: Phase
  weapon: Weapon
  score: number
  best: number
  lives: number
  round: number
  goal: number
  lockedRound: number
  lockedTotal: number
  toSpawn: number
  maxAlive: number
  spawnIn: number
  cooldown: number
  shake: number
  banner: number
  elapsed: number
  combo: number
  comboT: number
  nextId: number
  rng: number
  hint: boolean
  player: Player
  enemies: Enemy[]
  particles: Particle[]
  popups: Popup[]
  cellarSlam: number
}

export type GameEvent =
  | { type: 'swing'; weapon: Weapon }
  | { type: 'hit'; weapon: Weapon }
  | { type: 'lock'; combo: number }
  | { type: 'hurt' }
  | { type: 'clear'; round: number }
  | { type: 'next'; round: number }
  | { type: 'over'; score: number; best: boolean }

export interface SwingPose {
  active: boolean
  u: number
  facing: number
  weapon: Weapon
}

function rnd(s: GameState) {
  s.rng = (Math.imul(s.rng, 1664525) + 1013904223) >>> 0
  return s.rng / 4294967296
}

function pace(round: number) {
  return Math.min(150, 68 + (round - 1) * 11)
}

function popup(s: GameState, x: number, y: number, text: string) {
  s.popups.push({ x, y, text, life: 0.9, max: 0.9 })
  if (s.popups.length > 8) s.popups.shift()
}

function burst(s: GameState, x: number, y: number, count: number, colors: string[]) {
  for (let i = 0; i < count; i++) {
    const a = rnd(s) * Math.PI * 2
    const sp = 50 + rnd(s) * 180
    const color = colors[Math.floor(rnd(s) * colors.length)] ?? '#f8fbff'
    s.particles.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 40,
      life: 0.35 + rnd(s) * 0.45,
      max: 0.8,
      size: 3 + rnd(s) * 5,
      rot: rnd(s) * Math.PI,
      vr: rnd(s) * 8 - 4,
      kind: rnd(s) > 0.45 ? 'star' : 'dot',
      color,
    })
  }
  if (s.particles.length > 120) s.particles.splice(0, s.particles.length - 120)
}

export function beginRound(s: GameState, round: number) {
  s.round = round
  s.goal = Math.min(4 + (round - 1) * 2, 14)
  s.lockedRound = 0
  s.toSpawn = s.goal
  s.maxAlive = Math.min(3 + Math.floor((round - 1) / 2), 6)
  s.spawnIn = 0.85
  s.phase = 'playing'
  s.banner = 0
  s.enemies = []
}

export function createGame(weapon: Weapon, best: number, seed = 0x4b454c4c): GameState {
  const state: GameState = {
    phase: 'playing',
    weapon,
    score: 0,
    best,
    lives: 3,
    round: 1,
    goal: 4,
    lockedRound: 0,
    lockedTotal: 0,
    toSpawn: 4,
    maxAlive: 3,
    spawnIn: 0.85,
    cooldown: 0,
    shake: 0,
    banner: 0,
    elapsed: 0,
    combo: 0,
    comboT: 0,
    nextId: 1,
    rng: seed >>> 0,
    hint: true,
    player: {
      x: 400,
      y: 320,
      facing: Math.PI / 2,
      radius: 18,
      swingT: 0,
      swingDur: 0,
      swingId: 0,
      swingFacing: Math.PI / 2,
      swingWeapon: weapon,
      invuln: 0,
      flash: 0,
    },
    enemies: [],
    particles: [],
    popups: [],
    cellarSlam: 0,
  }
  beginRound(state, 1)
  return state
}

export function placeEnemy(s: GameState, x: number, y: number, vx = 0, vy = 0): Enemy {
  const enemy: Enemy = {
    id: s.nextId++,
    x,
    y,
    vx,
    vy,
    dizzy: 0,
    sucking: false,
    suck: 0,
    tilt: 0,
    wander: rnd(s) * Math.PI * 2,
    wanderT: 0.4 + rnd(s),
    phase: rnd(s) * Math.PI * 2,
    flash: 0,
    enter: 0,
    radius: 20,
    hitSwing: -1,
    shade: rnd(s),
    reel: 0,
  }
  s.enemies.push(enemy)
  return enemy
}

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v))
}

function clampFloor(x: number, y: number, pad: number) {
  return {
    x: clamp(x, FLOOR.left + pad, FLOOR.right - pad),
    y: clamp(y, FLOOR.top + pad, FLOOR.bottom - pad),
  }
}

function startSwing(s: GameState, events: GameEvent[]) {
  const weapon = s.weapon
  const dur = weapon === 'bat' ? 0.24 : 0.32
  s.player.swingT = dur
  s.player.swingDur = dur
  s.player.swingId += 1
  s.player.swingFacing = s.player.facing
  s.player.swingWeapon = weapon
  s.cooldown = weapon === 'bat' ? 0.36 : 0.52
  s.shake = Math.max(s.shake, weapon === 'bat' ? 2.5 : 1.6)
  events.push({ type: 'swing', weapon })
  burst(
    s,
    s.player.x + Math.cos(s.player.facing) * 28,
    s.player.y + Math.sin(s.player.facing) * 20,
    4,
    ['#f8fbff', '#dbeafe'],
  )
}

function connectHit(s: GameState, e: Enemy, events: GameEvent[]) {
  const weapon = s.player.swingWeapon
  const wasDizzy = e.dizzy > 0.15
  e.hitSwing = s.player.swingId
  e.dizzy = Math.max(e.dizzy, weapon === 'bat' ? 2.7 : 3.2)
  e.flash = 0.16
  e.tilt = (rnd(s) - 0.5) * 1.1
  e.enter = 0
  if (weapon === 'bat') {
    e.reel = 0
    e.vx = Math.cos(s.player.swingFacing) * 560
    e.vy = Math.sin(s.player.swingFacing) * 560
    popup(s, e.x, e.y - 48, 'BONG')
  } else if (wasDizzy) {
    e.reel = 1.35
    const dx = CELLAR.x - e.x
    const dy = CELLAR.y - e.y
    const d = Math.hypot(dx, dy) || 1
    e.vx = (dx / d) * 420
    e.vy = (dy / d) * 420
    popup(s, e.x, e.y - 48, 'IN DEN KELLER')
  } else {
    e.reel = 0
    const dx = s.player.x - e.x
    const dy = s.player.y - e.y
    const d = Math.hypot(dx, dy) || 1
    e.vx = (dx / d) * 280
    e.vy = (dy / d) * 280
    popup(s, e.x, e.y - 48, 'ZACK')
  }
  s.score += 25
  s.shake = Math.max(s.shake, weapon === 'bat' ? 5 : 3.5)
  events.push({ type: 'hit', weapon })
  burst(s, e.x, e.y - 10, 10, ['#f8fbff', '#bfdbfe', '#ffffff', '#93c5fd'])
}

function applySwing(s: GameState, events: GameEvent[]) {
  const p = s.player
  if (p.swingT <= 0 || p.swingDur <= 0) return
  const u = 1 - p.swingT / p.swingDur
  const weapon = p.swingWeapon
  const windowOk = weapon === 'bat' ? u >= 0.16 && u <= 0.62 : u >= 0.22 && u <= 0.72
  if (!windowOk) return

  const range = weapon === 'bat' ? 82 : 206
  const limit = weapon === 'bat' ? 1.05 : 0.52
  let whipTarget: Enemy | null = null
  let whipDist = Infinity

  for (const e of s.enemies) {
    if (e.sucking || e.hitSwing === p.swingId) continue
    const dx = e.x - p.x
    const dy = e.y - p.y
    const d = Math.hypot(dx, dy)
    if (d > range + e.radius * 0.4) continue
    const da = Math.atan2(Math.sin(Math.atan2(dy, dx) - p.swingFacing), Math.cos(Math.atan2(dy, dx) - p.swingFacing))
    const pointBlank = weapon === 'bat' && d < 38
    if (!pointBlank && Math.abs(da) > limit) continue
    if (weapon === 'whip') {
      if (d < whipDist) {
        whipTarget = e
        whipDist = d
      }
    } else {
      connectHit(s, e, events)
    }
  }
  if (whipTarget) connectHit(s, whipTarget, events)
}

function beginSuck(e: Enemy) {
  if (e.sucking) return
  e.sucking = true
  e.suck = 0
  e.vx = 0
  e.vy = 0
  e.reel = 0
}

function finishSuck(s: GameState, e: Enemy, events: GameEvent[]) {
  s.lockedRound += 1
  s.lockedTotal += 1
  s.hint = false
  if (s.comboT > 0) s.combo += 1
  else s.combo = 1
  s.comboT = 3.3
  s.score += 100 * s.combo
  s.cellarSlam = 0.38
  s.shake = Math.max(s.shake, 6)
  popup(s, CELLAR.x, CELLAR.y - 70, s.combo > 1 ? `KELLER x${s.combo}` : 'EINGESPERRT')
  burst(s, CELLAR.x, CELLAR.y, 16, ['#f8fbff', '#dbeafe', '#ffffff', '#60a5fa'])
  events.push({ type: 'lock', combo: s.combo })
  const idx = s.enemies.indexOf(e)
  if (idx >= 0) s.enemies.splice(idx, 1)
}

function pushApart(px: number, py: number, pr: number, e: Enemy) {
  let dx = e.x - px
  let dy = e.y - py
  let d = Math.hypot(dx, dy)
  if (d === 0) {
    dx = 1
    dy = 0
    d = 1
  }
  const min = pr + e.radius
  if (d >= min) return null
  const nx = dx / d
  const ny = dy / d
  return { x: px + nx * min, y: py + ny * min, nx, ny }
}

function updateEnemy(s: GameState, e: Enemy, events: GameEvent[], dt: number) {
  e.flash = Math.max(0, e.flash - dt)
  e.enter = Math.max(0, e.enter - dt)
  if (Math.abs(e.tilt) > 0.02) e.tilt *= Math.exp(-1.4 * dt)

  if (e.sucking) {
    e.suck += dt / 0.38
    e.x += (CELLAR.x - e.x) * Math.min(1, dt * 8)
    e.y += (CELLAR.y - e.y) * Math.min(1, dt * 8)
    if (e.suck >= 1) finishSuck(s, e, events)
    return
  }

  if (e.dizzy > 0) {
    e.dizzy -= dt
    if (e.reel > 0) {
      e.reel -= dt
      const dx = CELLAR.x - e.x
      const dy = CELLAR.y - e.y
      const d = Math.hypot(dx, dy) || 1
      e.vx = (dx / d) * 420
      e.vy = (dy / d) * 420
    } else {
      const drag = Math.exp(-2.6 * dt)
      e.vx *= drag
      e.vy *= drag
    }
    e.x += e.vx * dt
    e.y += e.vy * dt
    const pushed = pushApart(s.player.x, s.player.y, s.player.radius, e)
    if (pushed) {
      e.x = pushed.x
      e.y = pushed.y
      e.vx += pushed.nx * 240
      e.vy += pushed.ny * 240
    }
    const spot = clampFloor(e.x, e.y, e.radius * 0.2)
    if (spot.x !== e.x) e.vx = Math.abs(e.vx) * 0.45 * Math.sign(spot.x - e.x)
    if (spot.y !== e.y) e.vy = Math.abs(e.vy) * 0.45 * Math.sign(spot.y - e.y)
    e.x = spot.x
    e.y = spot.y
    if (e.dizzy <= 0) {
      e.dizzy = 0
      e.reel = 0
      e.vx = 0
      e.vy = 0
    }
    if (Math.hypot(e.x - CELLAR.x, e.y - CELLAR.y) < CELLAR.r) beginSuck(e)
    return
  }

  const speed = pace(s.round)
  const pdx = s.player.x - e.x
  const pdy = s.player.y - e.y
  const pd = Math.hypot(pdx, pdy) || 1
  if (e.enter <= 0 && pd < 230) {
    e.vx = (pdx / pd) * speed
    e.vy = (pdy / pd) * speed
  } else {
    e.wanderT -= dt
    if (e.wanderT <= 0) {
      e.wander = rnd(s) * Math.PI * 2
      e.wanderT = 0.55 + rnd(s) * 1.3
    }
    e.vx = Math.cos(e.wander) * speed * 0.72
    e.vy = Math.sin(e.wander) * speed * 0.72
  }

  const cdx = e.x - CELLAR.x
  const cdy = e.y - CELLAR.y
  const cd = Math.hypot(cdx, cdy) || 1
  if (cd < 96) {
    e.vx += (cdx / cd) * 120
    e.vy += (cdy / cd) * 120
  }

  e.x += e.vx * dt
  e.y += e.vy * dt
  const spot = clampFloor(e.x, e.y, 8)
  e.x = spot.x
  e.y = spot.y

  if (e.enter > 0 || s.phase !== 'playing') return
  const dx = s.player.x - e.x
  const dy = s.player.y - e.y
  const d = Math.hypot(dx, dy) || 1
  const min = s.player.radius + e.radius - 2
  if (d >= min) return
  const nx = dx / d
  const ny = dy / d
  if (s.player.invuln <= 0) {
    s.lives -= 1
    s.player.invuln = 1.15
    s.player.flash = 0.28
    s.shake = Math.max(s.shake, 8)
    s.player.x += nx * 30
    s.player.y += ny * 30
    popup(s, s.player.x, s.player.y - 36, 'AUTSCH')
    events.push({ type: 'hurt' })
    if (s.lives <= 0) {
      s.phase = 'gameover'
      const isBest = s.score > s.best
      if (isBest) s.best = s.score
      events.push({ type: 'over', score: s.score, best: isBest })
    }
  } else {
    s.player.x += nx * (min - d)
    s.player.y += ny * (min - d)
  }
  const parked = clampFloor(s.player.x, s.player.y, s.player.radius * 0.2)
  s.player.x = parked.x
  s.player.y = parked.y
}

function separateEnemies(s: GameState) {
  const list = s.enemies
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i]
      const b = list[j]
      if (!a || !b || a.sucking || b.sucking) continue
      const dx = b.x - a.x
      const dy = b.y - a.y
      const d = Math.hypot(dx, dy) || 1
      const min = a.radius + b.radius - 4
      if (d >= min) continue
      const push = (min - d) / 2
      const nx = dx / d
      const ny = dy / d
      a.x -= nx * push
      a.y -= ny * push
      b.x += nx * push
      b.y += ny * push
    }
  }
}

function spawnEnemy(s: GameState) {
  const fromLeft = rnd(s) > 0.5
  const y = FLOOR.top + 24 + rnd(s) * (FLOOR.bottom - FLOOR.top - 150)
  const x = fromLeft ? FLOOR.left + 16 : FLOOR.right - 16
  const enemy = placeEnemy(s, x, y, fromLeft ? 40 : -40, 0)
  enemy.enter = 0.7
  s.toSpawn -= 1
}

function updateParticles(s: GameState, dt: number) {
  for (const p of s.particles) {
    p.life -= dt
    p.vy += 20 * dt
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.rot += p.vr * dt
  }
  s.particles = s.particles.filter((p) => p.life > 0)
  for (const pop of s.popups) {
    pop.life -= dt
    pop.y -= 26 * dt
  }
  s.popups = s.popups.filter((p) => p.life > 0)
}

export function swingPose(p: Player, resting: Weapon): SwingPose {
  if (p.swingT <= 0 || p.swingDur <= 0) {
    return { active: false, u: 0, facing: p.facing, weapon: resting }
  }
  return {
    active: true,
    u: 1 - p.swingT / p.swingDur,
    facing: p.swingFacing,
    weapon: p.swingWeapon,
  }
}

export function updateGame(s: GameState, input: InputState, dt: number): GameEvent[] {
  const events: GameEvent[] = []
  dt = clamp(dt, 0, 0.05)
  s.elapsed += dt
  s.weapon = input.weapon
  s.shake = Math.max(0, s.shake - dt * 16)
  s.cellarSlam = Math.max(0, s.cellarSlam - dt)
  s.cooldown = Math.max(0, s.cooldown - dt)
  s.player.invuln = Math.max(0, s.player.invuln - dt)
  s.player.flash = Math.max(0, s.player.flash - dt)
  if (s.comboT > 0) {
    s.comboT = Math.max(0, s.comboT - dt)
    if (s.comboT === 0) s.combo = 0
  }

  if (s.phase !== 'gameover') {
    const mx = input.mx
    const my = input.my
    const mag = Math.hypot(mx, my)
    if (mag > 0.12) {
      const scale = Math.min(1, mag)
      const nx = mx / mag
      const ny = my / mag
      s.player.x += nx * scale * 268 * dt
      s.player.y += ny * scale * 268 * dt
      if (s.player.swingT <= 0) s.player.facing = Math.atan2(ny, nx)
    }
    if (input.aimX !== null && input.aimY !== null && s.player.swingT <= 0) {
      const ax = input.aimX - s.player.x
      const ay = input.aimY - s.player.y
      if (Math.hypot(ax, ay) > 8) s.player.facing = Math.atan2(ay, ax)
    }
    const spot = clampFloor(s.player.x, s.player.y, 10)
    s.player.x = spot.x
    s.player.y = spot.y
  }

  if (s.phase === 'playing') {
    const wantSwing = input.strike || input.holding || input.aimX !== null
    if (wantSwing && s.cooldown <= 0 && s.player.swingT <= 0) startSwing(s, events)
    if (s.player.swingT > 0) {
      s.player.swingT = Math.max(0, s.player.swingT - dt)
      applySwing(s, events)
    }

    for (let i = s.enemies.length - 1; i >= 0; i--) {
      const enemy = s.enemies[i]
      if (!enemy) continue
      updateEnemy(s, enemy, events, dt)
      if (s.lives <= 0) break
    }
    if (s.phase === 'playing') {
      separateEnemies(s)
      s.spawnIn -= dt
      const alive = s.enemies.filter((e) => !e.sucking).length
      if (s.toSpawn > 0 && alive < s.maxAlive && s.spawnIn <= 0) {
        spawnEnemy(s)
        s.spawnIn = Math.max(0.62, 2.05 - s.round * 0.12)
      }
      const busy = s.enemies.some((e) => e.sucking)
      if (s.toSpawn <= 0 && s.lockedRound >= s.goal && !busy && s.enemies.length === 0) {
        s.phase = 'roundclear'
        s.banner = 2.15
        s.score += 50 * s.round
        events.push({ type: 'clear', round: s.round })
      }
    }
  } else if (s.phase === 'roundclear') {
    s.banner -= dt
    if (s.player.swingT > 0) s.player.swingT = Math.max(0, s.player.swingT - dt)
    if (s.banner <= 0) {
      beginRound(s, s.round + 1)
      events.push({ type: 'next', round: s.round })
    }
  }

  updateParticles(s, dt)
  return events
}
