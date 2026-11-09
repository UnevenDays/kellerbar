import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Button } from '@/components/ui/button'
import { createAudio, type AudioBus } from '../game/audio.ts'
import { createGame, updateGame, type GameState, type Phase, type Weapon } from '../game/engine.ts'
import { drawGame, screenToWorld } from '../game/render.ts'
import { BatIcon, StarIcon, WhipIcon } from './icons.tsx'

interface Hud {
  score: number
  best: number
  lives: number
  round: number
  locked: number
  goal: number
  total: number
  phase: Phase
  combo: number
}

interface Stick {
  joyX: number
  joyY: number
  strike: boolean
  holding: boolean
  aimX: number | null
  aimY: number | null
  keys: Set<string>
}

function readHud(state: GameState): Hud {
  return {
    score: state.score,
    best: state.best,
    lives: state.lives,
    round: state.round,
    locked: state.lockedRound,
    goal: state.goal,
    total: state.lockedTotal,
    phase: state.phase,
    combo: state.combo,
  }
}

export function GameScreen({
  weapon,
  best,
  onWeapon,
  onBest,
  onMenu,
  onRetry,
}: {
  weapon: Weapon
  best: number
  onWeapon: (weapon: Weapon) => void
  onBest: (score: number) => void
  onMenu: () => void
  onRetry: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stick = useRef<Stick>({
    joyX: 0,
    joyY: 0,
    strike: false,
    holding: false,
    aimX: null,
    aimY: null,
    keys: new Set(),
  })
  const weaponRef = useRef(weapon)
  const onWeaponRef = useRef(onWeapon)
  const onBestRef = useRef(onBest)
  const bestRef = useRef(best)
  const [hud, setHud] = useState<Hud>({
    score: 0,
    best,
    lives: 3,
    round: 1,
    locked: 0,
    goal: 4,
    total: 0,
    phase: 'playing',
    combo: 0,
  })
  const [paused, setPaused] = useState(false)
  const [muted, setMuted] = useState(false)
  const [down, setDown] = useState(false)
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  const [canvasError, setCanvasError] = useState(false)
  const pausedRef = useRef(false)
  const mutedRef = useRef(false)
  const audioRef = useRef<AudioBus | null>(null)

  useEffect(() => {
    weaponRef.current = weapon
    onWeaponRef.current = onWeapon
    onBestRef.current = onBest
    pausedRef.current = paused
    mutedRef.current = muted
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setCanvasError(true)
      return
    }
    const state = createGame(weaponRef.current, bestRef.current)
    const audio = createAudio()
    audioRef.current = audio
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    let last = performance.now()
    let hudKey = ''

    const frame = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      const pad = stick.current
      const aimX = pad.aimX
      const aimY = pad.aimY
      const strike = pad.strike
      pad.aimX = null
      pad.aimY = null
      pad.strike = false
      let mx = pad.joyX
      let my = pad.joyY
      if (pad.keys.has('a') || pad.keys.has('arrowleft')) mx -= 1
      if (pad.keys.has('d') || pad.keys.has('arrowright')) mx += 1
      if (pad.keys.has('w') || pad.keys.has('arrowup')) my -= 1
      if (pad.keys.has('s') || pad.keys.has('arrowdown')) my += 1
      audio.setMuted(mutedRef.current)
      if (!pausedRef.current) {
        const events = updateGame(
          state,
          {
            mx,
            my,
            strike,
            holding: pad.holding || pad.keys.has(' ') || pad.keys.has('k'),
            aimX,
            aimY,
            weapon: weaponRef.current,
          },
          dt,
        )
        for (const event of events) {
          audio.play(event)
          if ((event.type === 'hit' || event.type === 'lock') && 'vibrate' in navigator) {
            navigator.vibrate(event.type === 'lock' ? 24 : 12)
          }
          if (event.type === 'over' && event.best) onBestRef.current(state.best)
        }
      }
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const width = Math.max(1, Math.round(rect.width * dpr))
      const height = Math.max(1, Math.round(rect.height * dpr))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      drawGame(ctx, state, rect.width, rect.height, reduce)
      const next = readHud(state)
      const key = JSON.stringify(next)
      if (key !== hudKey) {
        hudKey = key
        setHud(next)
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    const downKey = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(event.key.toLowerCase()) || event.key === ' ') {
        event.preventDefault()
      }
      stick.current.keys.add(key)
      if (!event.repeat && key === 'q') {
        onWeaponRef.current(weaponRef.current === 'bat' ? 'whip' : 'bat')
      }
      if (!event.repeat && event.key === 'Escape') {
        setPaused((value) => {
          pausedRef.current = !value
          return !value
        })
      }
    }
    const upKey = (event: KeyboardEvent) => {
      stick.current.keys.delete(event.key.toLowerCase())
    }
    const blur = () => {
      stick.current.keys.clear()
      stick.current.holding = false
      stick.current.joyX = 0
      stick.current.joyY = 0
      setKnob({ x: 0, y: 0 })
      setDown(false)
    }
    window.addEventListener('keydown', downKey)
    window.addEventListener('keyup', upKey)
    window.addEventListener('blur', blur)
    return () => {
      cancelAnimationFrame(raf)
      audioRef.current = null
      window.removeEventListener('keydown', downKey)
      window.removeEventListener('keyup', upKey)
      window.removeEventListener('blur', blur)
    }
  }, [])

  const releaseStick = () => {
    stick.current.joyX = 0
    stick.current.joyY = 0
    setKnob({ x: 0, y: 0 })
  }

  return (
    <div className="game-shell" onContextMenu={(event) => event.preventDefault()}>
      <header className="flex items-center gap-3 px-3 pt-[max(8px,env(safe-area-inset-top))] pb-2 text-white">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-[0.18em] text-blue-100 uppercase">Kellerbar</p>
          <p className="truncate text-lg font-bold">{hud.score.toLocaleString('de-DE')} Punkte</p>
          <div className="mt-1 flex gap-1" aria-label={`${hud.lives} Leben`}>
            {[0, 1, 2].map((life) => (
              <StarIcon key={life} className="size-4" filled={life < hud.lives} />
            ))}
          </div>
        </div>
        <div className="text-right text-sm leading-tight">
          <p>Runde {hud.round}</p>
          <p className="font-semibold">
            Keller {hud.locked}/{hud.goal}
          </p>
          {hud.combo > 1 ? <p>Kombo x{hud.combo}</p> : null}
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            className="size-12 rounded-full text-sm"
            aria-pressed={muted}
            onClick={() => {
              setMuted((value) => {
                mutedRef.current = !value
                return !value
              })
            }}
          >
            {muted ? 'Aus' : 'Ton'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="size-12 rounded-full text-sm"
            onClick={() => {
              setPaused((value) => {
                pausedRef.current = !value
                return !value
              })
            }}
          >
            {paused ? 'Weiter' : 'Pause'}
          </Button>
        </div>
      </header>

      <div className="stage">
        <canvas
          ref={canvasRef}
          aria-label="Spielbereich der Kellerbar"
          onPointerDown={(event) => {
            if (paused || hud.phase === 'gameover' || !canvasRef.current) return
            const point = screenToWorld(event.clientX, event.clientY, canvasRef.current)
            stick.current.aimX = point.x
            stick.current.aimY = point.y
            stick.current.strike = true
            audioRef.current?.unlock()
          }}
        />
        {canvasError ? (
          <div className="overlay">
            <div className="panel">
              <h2 className="text-2xl font-black">Die Bar lässt sich hier nicht zeichnen.</h2>
              <Button type="button" className="mt-4 h-12 rounded-2xl" onClick={onMenu}>
                Zurück
              </Button>
            </div>
          </div>
        ) : null}
        {paused && hud.phase !== 'gameover' ? (
          <div className="overlay">
            <div className="panel">
              <h2 className="text-3xl font-black">Pause</h2>
              <p className="mt-2">Die Netanjahuuus warten an der Theke.</p>
              <div className="mt-5 flex flex-col gap-2">
                <Button
                  type="button"
                  className="h-12 rounded-2xl"
                  onClick={() => {
                    pausedRef.current = false
                    setPaused(false)
                  }}
                >
                  Weiter
                </Button>
                <Button type="button" variant="outline" className="h-12 rounded-2xl" onClick={onMenu}>
                  Zur Theke
                </Button>
              </div>
            </div>
          </div>
        ) : null}
        {hud.phase === 'gameover' ? (
          <div className="overlay">
            <div className="panel">
              <h2 className="text-3xl font-black">Die Zylinder haben die Bar.</h2>
              <p className="mt-2">
                Du hast {hud.total} Netanjahuuus in den Keller gesperrt.
              </p>
              <p className="mt-1 font-semibold">
                {hud.score.toLocaleString('de-DE')} Punkte
                {hud.score >= hud.best && hud.score > 0 ? ' · Neuer Rekord' : ` · Rekord ${hud.best.toLocaleString('de-DE')}`}
              </p>
              <div className="mt-5 flex flex-col gap-2">
                <Button type="button" className="h-12 rounded-2xl" onClick={onRetry}>
                  Nochmal
                </Button>
                <Button type="button" variant="outline" className="h-12 rounded-2xl" onClick={onMenu}>
                  Zur Theke
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="sr-only" aria-live="polite">
        {hud.phase === 'gameover'
          ? `Vorbei. ${hud.total} Netanjahuuus im Keller.`
          : `${hud.locked} von ${hud.goal} im Keller. ${hud.score} Punkte.`}
      </div>

      <footer className="controls">
        <div>
          <div
            className="joy"
            aria-label="Laufsteuerung"
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId)
              moveStick(event)
              audioRef.current?.unlock()
            }}
            onPointerMove={(event) => {
              if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
              moveStick(event)
            }}
            onPointerUp={releaseStick}
            onPointerCancel={releaseStick}
          >
            <div className="knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
          </div>
          <p className="mt-1 text-center text-xs text-blue-100">Laufen</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="mb-5 h-auto min-h-16 w-full flex-col gap-1 rounded-2xl px-3 py-2 whitespace-normal"
          onClick={() => onWeapon(weapon === 'bat' ? 'whip' : 'bat')}
        >
          <span className="text-[0.7rem] tracking-wide uppercase">Waffe wechseln</span>
          <span className="flex items-center gap-2 text-base font-bold">
            {weapon === 'bat' ? <BatIcon className="size-5" /> : <WhipIcon className="size-5" />}
            {weapon === 'bat' ? 'Baseballschläger' : 'Peitsche'}
          </span>
        </Button>
        <div>
          <button
            type="button"
            className="strike"
            data-down={down}
            aria-label={weapon === 'bat' ? 'Mit dem Baseballschläger schlagen' : 'Mit der Peitsche knallen'}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId)
              stick.current.holding = true
              stick.current.strike = true
              setDown(true)
              audioRef.current?.unlock()
            }}
            onPointerUp={() => {
              stick.current.holding = false
              setDown(false)
            }}
            onPointerCancel={() => {
              stick.current.holding = false
              setDown(false)
            }}
          >
            {weapon === 'bat' ? <BatIcon className="size-7" /> : <WhipIcon className="size-7" />}
            {weapon === 'bat' ? 'SCHLAG' : 'KNALL'}
          </button>
          <p className="mt-1 text-center text-xs text-blue-100">Waffe</p>
        </div>
      </footer>
    </div>
  )

  function moveStick(event: ReactPointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    const dx = event.clientX - (rect.left + rect.width / 2)
    const dy = event.clientY - (rect.top + rect.height / 2)
    const max = rect.width * 0.28
    const dist = Math.hypot(dx, dy) || 1
    const reach = Math.min(max, dist)
    const x = (dx / dist) * reach
    const y = (dy / dist) * reach
    stick.current.joyX = x / max
    stick.current.joyY = y / max
    setKnob({ x, y })
  }
}
