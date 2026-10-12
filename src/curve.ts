/**
 * SVG path through points sorted by x: a monotone cubic (d3's `curveMonotoneX`), smooth without
 * ever bulging past a point, so a chart never shows a value that was not reached.
 */
export function monotone(p: readonly (readonly [number, number])[]): string {
  const f = (n: number) => n.toFixed(1)
  if (p.length < 3) return p.map(([x, y], i) => `${i ? 'L' : 'M'}${f(x)} ${f(y)}`).join('')
  const slope = (i: number) => (p[i + 1][1] - p[i][1]) / (p[i + 1][0] - p[i][0] || 1)
  const m = p.map((_, i) => {
    if (i === 0 || i === p.length - 1) return NaN
    const h0 = p[i][0] - p[i - 1][0]
    const h1 = p[i + 1][0] - p[i][0]
    const s0 = slope(i - 1)
    const s1 = slope(i)
    const mid = (s0 * h1 + s1 * h0) / (h0 + h1)
    return (Math.sign(s0) + Math.sign(s1)) * Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(mid)) || 0
  })
  // Ends: the tangent that keeps the first and last segments a parabola.
  m[0] = (3 * slope(0) - m[1]) / 2
  m[p.length - 1] = (3 * slope(p.length - 2) - m[p.length - 2]) / 2
  let d = `M${f(p[0][0])} ${f(p[0][1])}`
  for (let i = 0; i < p.length - 1; i++) {
    const dx = (p[i + 1][0] - p[i][0]) / 3
    d += `C${f(p[i][0] + dx)} ${f(p[i][1] + m[i] * dx)} ${f(p[i + 1][0] - dx)} ${f(p[i + 1][1] - m[i + 1] * dx)} ${f(p[i + 1][0])} ${f(p[i + 1][1])}`
  }
  return d
}
