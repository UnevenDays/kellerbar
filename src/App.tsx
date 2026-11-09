import { useState } from 'react'
import { GameScreen } from './components/GameScreen.tsx'
import { MenuScreen } from './components/MenuScreen.tsx'
import { StarField } from './components/StarField.tsx'
import type { Weapon } from './game/engine.ts'

function readBest() {
  try {
    return Number(localStorage.getItem('kellerbar-best') || 0) || 0
  } catch {
    return 0
  }
}

export default function App() {
  const [screen, setScreen] = useState<'menu' | 'play'>('menu')
  const [weapon, setWeapon] = useState<Weapon>('bat')
  const [run, setRun] = useState(0)
  const [best, setBest] = useState(readBest)

  function remember(score: number) {
    setBest(score)
    try {
      localStorage.setItem('kellerbar-best', String(score))
    } catch {
      /* Der Rekord bleibt dann nur in dieser Schicht. */
    }
  }

  return (
    <div className="app-sky">
      <StarField />
      {screen === 'menu' ? (
        <MenuScreen weapon={weapon} best={best} onWeapon={setWeapon} onStart={() => {
          setRun((value) => value + 1)
          setScreen('play')
        }} />
      ) : (
        <GameScreen
          key={run}
          weapon={weapon}
          best={best}
          onWeapon={setWeapon}
          onBest={remember}
          onMenu={() => setScreen('menu')}
          onRetry={() => setRun((value) => value + 1)}
        />
      )}
    </div>
  )
}
