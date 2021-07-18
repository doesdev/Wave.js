export default (functionContext) => {
  let { data, options, ctx, h, w, Helper } = functionContext
  const { colors } = options

  const helper = new Helper(ctx)

  data = helper.mutateData(data, 'shrink', 300)
  data = helper.mutateData(data, 'scale', h / 2)
  data = helper.mutateData(data, 'split', 4).slice(0, 3)

  let colorIndex = 0
  data.forEach((points) => {
    const wavePoints = helper.getPoints('line', w, [0, h / 2], points.length, points)
    helper.drawPolygon(wavePoints.end, { lineColor: colors[colorIndex], radius: (h * 0.015) })

    const invertedPoints = helper.getPoints('line', w, [0, h / 2], points.length, points, { offset: 100 })
    helper.drawPolygon(invertedPoints.start, { lineColor: colors[colorIndex], radius: (h * 0.015) })
    colorIndex++
  })
}
