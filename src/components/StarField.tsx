const STARS = (() => {
  let n = 77
  const next = () => {
    n = (Math.imul(n, 1664525) + 1013904223) >>> 0
    return n / 4294967296
  }
  return Array.from({ length: 46 }, (_, id) => ({
    id,
    left: `${next() * 100}%`,
    top: `${next() * 100}%`,
    size: 7 + next() * 14,
    delay: `${next() * -4}s`,
    opacity: 0.35 + next() * 0.6,
  }))
})()

export function StarField() {
  return (
    <div className="starfield" aria-hidden="true">
      {STARS.map((star) => (
        <span
          key={star.id}
          className="star"
          style={{
            left: star.left,
            top: star.top,
            width: star.size,
            height: star.size,
            animationDelay: star.delay,
            opacity: star.opacity,
          }}
        />
      ))}
    </div>
  )
}
