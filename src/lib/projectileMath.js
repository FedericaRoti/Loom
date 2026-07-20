export const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

export function buildTrajectory(angle, velocity) {
  const gravity = 9.8
  const radians = (angle * Math.PI) / 180
  const range = (velocity ** 2 * Math.sin(2 * radians)) / gravity
  const height = (velocity ** 2 * Math.sin(radians) ** 2) / (2 * gravity)
  const flightTime = (2 * velocity * Math.sin(radians)) / gravity

  const points = Array.from({ length: 56 }, (_, index) => {
    const progress = index / 55
    const xMeters = range * progress
    const yMeters = Math.tan(radians) * xMeters - (gravity * xMeters ** 2) / (2 * velocity ** 2 * Math.cos(radians) ** 2)

    const x = 34 + progress * 672
    const y = 302 - clamp(yMeters / Math.max(height, 1), 0, 1) * 210

    return { x, y }
  })

  return {
    path: points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' '),
    range,
    height,
    flightTime,
    landingX: points.at(-1).x,
    peak: points.reduce((best, point) => (point.y < best.y ? point : best), points[0]),
  }
}

export function getTrajectoryInsight(angle, velocity, trajectory) {
  if (angle < 32) {
    return 'Low angle: the shot stays flatter, so range depends heavily on speed.'
  }

  if (angle > 58) {
    return 'High angle: the shot climbs clearly, but some horizontal reach is traded for height.'
  }

  if (velocity > 32) {
    return 'Higher velocity: the same idea stretches out, making both range and time easier to notice.'
  }

  return `Balanced launch: about ${trajectory.flightTime.toFixed(1)} seconds in the air, with angle and speed sharing the work.`
}
