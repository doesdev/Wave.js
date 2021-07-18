export default (functionContext) => {
  const { data, options, ctx, h, w } = functionContext

  const cx = w / 2
  const cy = h / 2
  const r = h / 4
  const percent = (h / 2 - r) / 255
  const pointCount = 512
  const increase = (360 / pointCount) * Math.PI / 180

  for (let point = 1; point <= pointCount; point++) {
    let p = data[600 % point] // get value
    p *= percent
    point++ // start at 1
    const a = point * increase

    const sx = cx + r * Math.cos(a)
    const sy = cy + r * Math.sin(a)
    ctx.moveTo(sx, sy)

    const dx = cx + (r + p) * Math.cos(a)
    const dy = cy + (r + p) * Math.sin(a)
    ctx.lineTo(dx, dy)
  }
  ctx.stroke()

  if (options.colors[1]) {
    ctx.arc(cx, cy, r * 0.90, 0, 2 * Math.PI)
    ctx.fillStyle = options.colors[1]
    ctx.fill()
  }
}
