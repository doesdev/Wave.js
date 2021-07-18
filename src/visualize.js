import drawWave from './visuals/drawWave.js'
import drawShine from './visuals/drawShine.js'
import drawRing from './visuals/drawRing.js'
import drawBars from './visuals/drawBars.js'
import drawDualbars from './visuals/drawDualbars.js'
import drawOrbs from './visuals/drawOrbs.js'
import drawFlower from './visuals/drawFlower.js'
import drawFlowerBlocks from './visuals/drawFlowerBlocks.js'
import drawBarsBlocks from './visuals/drawBarsBlocks.js'
import drawDualbarsBlocks from './visuals/drawDualbarsBlocks.js'
import drawStar from './visuals/drawStar.js'
import drawRoundWave from './visuals/drawRoundWave.js'
import drawRings from './visuals/drawRings.js'
import drawShineRings from './visuals/drawShineRings.js'
import drawCubes from './visuals/drawCubes.js'
import drawBigBars from './visuals/drawBigBars.js'
import drawShockwave from './visuals/drawShockwave.js'
import drawFireworks from './visuals/drawFireworks.js'
import drawStatic from './visuals/drawStatic.js'
import drawWeb from './visuals/drawWeb.js'
import drawStitches from './visuals/drawStitches.js'

// options:type,colors,stroke
export default function visualize (data, canvasId, options = {}, frame, canvasEl) {
  // make a clone of options
  options = { ...options }
  // options
  if (!options.stroke) options.stroke = 1
  if (!options.colors) options.colors = ['#d92027', '#ff9234', '#ffcd3c', '#35d0ba']

  const { HTMLElement } = window
  const hasElement = canvasEl instanceof HTMLElement
  const canvas = hasElement ? canvasEl : document.getElementById(canvasId)

  if (!canvas) return

  const ctx = canvas.getContext('2d')
  const h = canvas.height
  const w = canvas.width

  ctx.strokeStyle = options.colors[0]
  ctx.lineWidth = options.stroke

  const typeMap = {
    bars: drawBars,
    'bars blocks': drawBarsBlocks,
    'big bars': drawBigBars,
    cubes: drawCubes,
    dualbars: drawDualbars,
    'dualbars blocks': drawDualbarsBlocks,
    fireworks: drawFireworks,
    flower: drawFlower,
    'flower blocks': drawFlowerBlocks,
    orbs: drawOrbs,
    ring: drawRing,
    rings: drawRings,
    'round wave': drawRoundWave,
    shine: drawShine,
    'shine rings': drawShineRings,
    shockwave: drawShockwave,
    star: drawStar,
    static: drawStatic,
    stitches: drawStitches,
    wave: drawWave,
    web: drawWeb
  }

  const frameRateMap = {
    bars: 1,
    'bars blocks': 1,
    'big bars': 1,
    cubes: 1,
    dualbars: 1,
    'dualbars blocks': 1,
    fireworks: 1,
    flower: 1,
    'flower blocks': 1,
    ring: 1,
    rings: 1,
    'round wave': 1,
    orbs: 1,
    shine: 1,
    'shine rings': 1,
    shockwave: 1,
    star: 1,
    static: 1,
    stitches: 1,
    wave: 1,
    web: 1
  }

  const functionContext = {
    data, options, ctx, h, w, Helper: this.Helper, canvasId
  }

  if (typeof options.type === 'string') options.type = [options.type]

  options.type.forEach(type => {
    // abide by the frame rate
    if (frame % frameRateMap[type] === 0) {
      // clear canvas
      ctx.clearRect(0, 0, w, h)
      ctx.beginPath()

      typeMap[type](functionContext)
    }
  })
}
