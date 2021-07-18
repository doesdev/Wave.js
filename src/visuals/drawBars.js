export default (functionContext) => {
  const { data, options, ctx, h, w } = functionContext

  const pointCount = 64
  const percent = h / 255
  const increase = w / 64
  const breakpoint = Math.floor(pointCount / options.colors.length)

  for (let point = 1; point <= pointCount; point++) {
    let p = data[point] // get value
    p *= percent

    const x = increase * point

    ctx.moveTo(x, h)
    ctx.lineTo(x, h - p)

    if (point % breakpoint === 0) {
      const i = (point / breakpoint) - 1
      ctx.strokeStyle = options.colors[i]
      ctx.stroke()
      ctx.beginPath()
    }
  }
}
