export default (functionContext) => {
  const { data, options, ctx, h, w } = functionContext

  const cx = w / 2
  const cy = h / 2
  const r = (h - 10) / 2
  const offset = r / 5
  const percent = (r - offset) / 255
  const pointCount = 150
  const increase = (360 / pointCount) * Math.PI / 180

  ctx.arc(cx, cy, r, 0, 2 * Math.PI, true)

  const fa = 0
  const fx = cx + (r - (data[0] * percent)) * Math.cos(fa)
  const fy = cy + (r - (data[0] * percent)) * Math.sin(fa)
  ctx.moveTo(fx, fy)

  let q = 0
  for (let point = 0; point < pointCount; point++) {
    q += 1
    if (point >= pointCount / 2) {
      q -= 2
    }

    let p = data[q] // get value
    p *= percent

    const a = point * increase
    const x = cx + (r - p) * Math.cos(a)
    const y = cy + (r - p) * Math.sin(a)

    ctx.lineTo(x, y)
    ctx.arc(x, y, 2, 0, 2 * Math.PI)
  }
  ctx.lineTo(fx, fy)

  ctx.stroke()
  ctx.fillStyle = options.colors[1] || '#fff0'
  ctx.fill()
}
