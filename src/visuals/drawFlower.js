export default (functionContext) => {
  const { data, options, ctx, h, w } = functionContext

  const min = 5
  const r = h / 4
  const offset = r / 2
  const cx = w / 2
  const cy = h / 2
  const pointCount = 128
  const percent = (r - offset) / 255
  const increase = (360 / pointCount) * Math.PI / 180
  const breakpoint = Math.floor(pointCount / options.colors.length)

  for (let point = 1; point <= pointCount; point++) {
    const p = (data[point] + min) * percent
    const a = point * increase

    const sx = cx + (r - (p - offset)) * Math.cos(a)
    const sy = cy + (r - (p - offset)) * Math.sin(a)
    ctx.moveTo(sx, sy)

    const dx = cx + (r + p) * Math.cos(a)
    const dy = cy + (r + p) * Math.sin(a)
    ctx.lineTo(dx, dy)

    if (point % breakpoint === 0) {
      const i = (point / breakpoint) - 1
      ctx.strokeStyle = options.colors[i]
      ctx.stroke()
      ctx.beginPath()
    }
  }

  ctx.stroke()
}
