export default (functionContext) => {
  const { data, options, ctx, h, w } = functionContext

  const r = h / 4
  const cx = w / 2
  const cy = h / 2
  const pointCount = 100
  const percent = r / 255
  const increase = (360 / pointCount) * Math.PI / 180
  const p = 0

  // let z = (data[0] + min + offset) * percent;
  const sx = cx + (r + p) * Math.cos(0)
  const sy = cy + (r + p) * Math.sin(0)
  ctx.moveTo(sx, sy)

  for (let point = 1; point <= pointCount; point++) {
    const p = (data[350 % point]) * percent
    const a = point * increase

    const dx = cx + (r + p) * Math.cos(a)
    const dy = cy + (r + p) * Math.sin(a)
    ctx.lineTo(dx, dy)
  }

  ctx.closePath()
  ctx.stroke()

  if (options.colors[1]) {
    ctx.fillStyle = options.colors[1]
    ctx.fill()
  }
}
