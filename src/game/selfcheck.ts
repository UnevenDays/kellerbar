import { CELLAR, createGame, placeEnemy, updateGame, type InputState, type Weapon } from './engine.ts'

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg)
}

function input(partial: Partial<InputState> = {}): InputState {
  return {
    mx: 0,
    my: 0,
    strike: false,
    holding: false,
    aimX: null,
    aimY: null,
    weapon: 'bat',
    ...partial,
  }
}

function swingAt(weapon: Weapon, x: number) {
  const state = createGame(weapon, 0, 7)
  state.player.x = 400
  state.player.y = 300
  state.player.facing = 0
  const enemy = placeEnemy(state, x, 300)
  for (let i = 0; i < 24; i++) {
    updateGame(state, input({ weapon, strike: i === 0 }), 1 / 60)
  }
  return { state, enemy }
}

const bat = swingAt('bat', 464)
assert(bat.enemy.dizzy > 0, `Schläger trifft nicht, dizzy=${bat.enemy.dizzy}`)

bat.enemy.x = CELLAR.x
bat.enemy.y = CELLAR.y
bat.enemy.dizzy = 2
bat.enemy.vx = 0
bat.enemy.vy = 0
bat.enemy.reel = 0
for (let i = 0; i < 40 && bat.state.lockedTotal < 1; i++) {
  updateGame(bat.state, input(), 1 / 60)
}
assert(bat.state.lockedTotal === 1, `Keller nimmt niemanden auf, locked=${bat.state.lockedTotal}`)

const whip = swingAt('whip', 560)
assert(whip.enemy.dizzy > 0, 'Peitsche trifft nicht')
whip.state.cooldown = 0
whip.state.player.swingT = 0
whip.enemy.dizzy = 2
whip.enemy.x = 560
whip.enemy.y = 300
for (let i = 0; i < 24; i++) {
  updateGame(whip.state, input({ weapon: 'whip', strike: i === 0 }), 1 / 60)
}
assert(
  whip.enemy.reel > 0 || whip.enemy.sucking || whip.state.lockedTotal > 0 || whip.enemy.vy > 0,
  'Zweiter Peitschenknall schickt niemanden Richtung Keller',
)

const hurt = createGame('bat', 0, 3)
hurt.player.x = 300
hurt.player.y = 300
placeEnemy(hurt, 312, 300)
updateGame(hurt, input(), 1 / 60)
assert(hurt.lives === 2, `Treffer zieht kein Leben ab, lives=${hurt.lives}`)

const clear = createGame('bat', 0, 5)
clear.toSpawn = 0
clear.goal = 1
const last = placeEnemy(clear, CELLAR.x, CELLAR.y)
last.dizzy = 2
for (let i = 0; i < 50 && clear.phase === 'playing'; i++) {
  updateGame(clear, input(), 1 / 60)
}
assert(clear.phase === 'roundclear', `Runde endet nicht, phase=${clear.phase}`)

const over = createGame('bat', 10, 9)
over.lives = 1
over.player.x = 200
over.player.y = 240
placeEnemy(over, 210, 240)
updateGame(over, input(), 1 / 60)
assert(over.phase === 'gameover', 'Niederlage wird nicht erkannt')
assert(over.best === 10, 'Rekord bleibt der alte, wenn die Punkte nicht reichen')

console.log('Kellerbar selfcheck ok')
