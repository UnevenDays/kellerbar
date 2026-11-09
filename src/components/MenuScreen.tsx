import type { Weapon } from '../game/engine.ts'
import { Button } from '@/components/ui/button'
import { BatIcon, StarIcon, WhipIcon } from './icons.tsx'

const WEAPONS: Array<{
  id: Weapon
  title: string
  text: string
  icon: typeof BatIcon
}> = [
  {
    id: 'bat',
    title: 'Baseballschläger',
    text: 'Kurzer Schwung. Wirft Netanjahuuus in Blickrichtung. Luke oder Dusche dahinter stellen.',
    icon: BatIcon,
  },
  {
    id: 'whip',
    title: 'Peitsche',
    text: 'Lange Reichweite. Der erste Knall zieht sie ran, der zweite schleudert Benommene in den Keller.',
    icon: WhipIcon,
  },
]

export function MenuScreen({
  weapon,
  best,
  onWeapon,
  onStart,
}: {
  weapon: Weapon
  best: number
  onWeapon: (weapon: Weapon) => void
  onStart: () => void
}) {
  return (
    <main className="menu-wrap">
      <section className="menu-card">
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold tracking-[0.16em] text-[#1d4ed8] uppercase">
          <StarIcon className="size-4" />
          Nachtschicht
        </p>
        <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Kellerbar</h1>
        <p className="mt-3 text-base leading-relaxed text-[#243868]">
          Die Bar ist weiß und blau. In der Dusche stehen Männer mit Schnurrbart und Uniform, Namensschild Insel.
          Ein Treffer gibt eine Giftflasche. Vergiftete Netanjahuuus taumeln in die Dusche. In den Boxen stehen
          glatzköpfige Putinnn, die du ebenfalls schlagen kannst.
        </p>
        <ol className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
          <li className="rounded-2xl bg-white/80 px-3 py-2">1. Insel schlagen, Flasche nehmen</li>
          <li className="rounded-2xl bg-white/80 px-3 py-2">2. Netanjahuuu vergiften</li>
          <li className="rounded-2xl bg-white/80 px-3 py-2">3. In Dusche oder Keller sperren</li>
        </ol>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {WEAPONS.map((item) => {
            const Icon = item.icon
            const selected = weapon === item.id
            return (
              <Button
                key={item.id}
                type="button"
                variant={selected ? 'default' : 'outline'}
                aria-pressed={selected}
                className="h-auto min-h-28 flex-col items-start gap-2 rounded-2xl px-4 py-4 text-left whitespace-normal"
                onClick={() => onWeapon(item.id)}
              >
                <span className="flex items-center gap-2 text-base font-bold">
                  <Icon className="size-5" />
                  {item.title}
                </span>
                <span className="text-sm leading-snug font-medium opacity-90">{item.text}</span>
              </Button>
            )
          })}
        </div>
        <Button type="button" className="mt-5 h-14 w-full rounded-2xl text-lg font-bold" onClick={onStart}>
          Schicht beginnen
        </Button>
        <p className="mt-3 text-center text-sm text-[#3d527f]">
          {best > 0 ? `Rekord ${best.toLocaleString('de-DE')} Punkte. ` : ''}
          Auf dem Tablet: links laufen, rechts schlagen. Tippen auf die Bar zielt.
          Tastatur: WASD, Leertaste, Q wechselt die Waffe.
        </p>
        {window.location.pathname.includes('/kellerbar') ? (
          <p className="mt-3 text-center">
            <a className="text-sm font-semibold text-[#1d4ed8] underline" href="../index.html">
              Zurück zu Bastion Breach
            </a>
          </p>
        ) : null}
      </section>
    </main>
  )
}
