import type { GameEvent, Weapon } from './engine.ts'

export function createAudio() {
  let ctx: AudioContext | null = null
  let muted = false

  function ac() {
    if (!ctx) ctx = new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  }

  function tone(
    freq: number,
    dur: number,
    type: OscillatorType,
    gain: number,
    endFreq?: number,
    delay = 0,
  ) {
    const context = ac()
    const t = context.currentTime + delay
    const osc = context.createOscillator()
    const amp = context.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t)
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), t + dur)
    amp.gain.setValueAtTime(gain, t)
    amp.gain.exponentialRampToValueAtTime(0.001, t + dur)
    osc.connect(amp)
    amp.connect(context.destination)
    osc.start(t)
    osc.stop(t + dur + 0.02)
  }

  function noise(dur: number, gain: number, freq: number, type: BiquadFilterType) {
    const context = ac()
    const samples = Math.max(1, Math.floor(context.sampleRate * dur))
    const buffer = context.createBuffer(1, samples, context.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < samples; i++) data[i] = Math.random() * 2 - 1
    const src = context.createBufferSource()
    src.buffer = buffer
    const filter = context.createBiquadFilter()
    filter.type = type
    filter.frequency.value = freq
    const amp = context.createGain()
    amp.gain.setValueAtTime(gain, context.currentTime)
    amp.gain.exponentialRampToValueAtTime(0.001, context.currentTime + dur)
    src.connect(filter)
    filter.connect(amp)
    amp.connect(context.destination)
    src.start()
  }

  function swing(weapon: Weapon) {
    if (weapon === 'bat') {
      noise(0.08, 0.18, 900, 'lowpass')
      tone(180, 0.09, 'sine', 0.08, 70)
    } else {
      noise(0.12, 0.16, 1800, 'highpass')
      tone(760, 0.12, 'sawtooth', 0.03, 180)
    }
  }

  return {
    unlock() {
      try {
        ac()
      } catch {
        muted = true
      }
    },
    setMuted(next: boolean) {
      muted = next
    },
    play(event: GameEvent) {
      if (muted) return
      try {
        if (event.type === 'swing') swing(event.weapon)
        else if (event.type === 'hit') tone(event.weapon === 'bat' ? 210 : 520, 0.08, 'square', 0.05, 140)
        else if (event.type === 'bottle') {
          tone(660, 0.08, 'sine', 0.06, 880)
          tone(990, 0.1, 'triangle', 0.04, undefined, 0.06)
        } else if (event.type === 'poison') tone(240, 0.16, 'triangle', 0.05, 90)
        else if (event.type === 'lock') {
          tone(523, 0.12, 'triangle', 0.07)
          tone(659, 0.14, 'triangle', 0.07, undefined, 0.08)
          tone(784, 0.18, 'triangle', 0.07, undefined, 0.16)
        } else if (event.type === 'hurt') tone(110, 0.2, 'sawtooth', 0.06, 50)
        else if (event.type === 'clear') {
          tone(392, 0.1, 'triangle', 0.06)
          tone(523, 0.12, 'triangle', 0.06, undefined, 0.1)
          tone(659, 0.16, 'triangle', 0.06, undefined, 0.2)
        } else if (event.type === 'over') {
          tone(330, 0.18, 'triangle', 0.06, 160)
          tone(220, 0.24, 'triangle', 0.05, 90, 0.16)
        }
      } catch {
        muted = true
      }
    },
  }
}

export type AudioBus = ReturnType<typeof createAudio>
