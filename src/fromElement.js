export default function fromElement (elementId, canvasId, options) {
  const { HTMLElement, AudioContext, requestAnimationFrame } = window
  const globalAccessKey = [options.globalAccessKey || '$wave']
  const initGlobalObject = (elementId) => {
    window[globalAccessKey] = window[globalAccessKey] || {}
    window[globalAccessKey][elementId] = window[globalAccessKey][elementId] || {}
  }

  const getGlobal = options.getGlobal || function (elementId, accessKey) {
    initGlobalObject(elementId)
    return window[globalAccessKey][elementId][accessKey]
  }

  const setGlobal = options.setGlobal || function (elementId, accessKey, value) {
    let returnValue = getGlobal(elementId)
    if (!returnValue) {
      window[globalAccessKey][elementId][accessKey] = window[globalAccessKey][elementId][accessKey] || value
      returnValue = window[globalAccessKey][elementId][accessKey]
    }
    return returnValue
  }

  const waveContext = this
  const isElement = elementId instanceof HTMLElement
  const element = isElement ? elementId : document.getElementById(elementId)
  if (!element) return
  element.crossOrigin = 'anonymous'

  function run () {
    // user gesture has happened
    this.activated = true

    // track current wave for canvas
    this.activeCanvas = this.activeCanvas || {}
    this.activeCanvas[canvasId] = JSON.stringify(options)

    // track elements used so multiple elements use the same data
    this.activeElements[elementId] = this.activeElements[elementId] || {}
    if (this.activeElements[elementId].count) this.activeElements[elementId].count += 1
    else this.activeElements[elementId].count = 1

    const currentCount = this.activeElements[elementId].count

    const audioCtx = setGlobal(element.id, 'audioCtx', new AudioContext())
    const analyser = setGlobal(element.id, 'analyser', audioCtx.createAnalyser())

    let source = getGlobal(element.id, 'source')
    if (source) {
      if (source.mediaElement !== element) {
        source = audioCtx.createMediaElementSource(element)
      }
    } else {
      source = audioCtx.createMediaElementSource(element)
    }
    setGlobal(element.id, 'source', source)

    // beep test for ios
    const oscillator = audioCtx.createOscillator()
    oscillator.frequency.value = 1
    oscillator.connect(audioCtx.destination)
    oscillator.start(0)
    oscillator.stop(0)

    source.connect(analyser)
    source.connect(audioCtx.destination)

    analyser.fftsize = 32768
    const bufferLength = analyser.frequencyBinCount
    const data = new Uint8Array(bufferLength)
    let frameCount = 1

    function renderFrame () {
      // only run one wave visual per canvas
      if (JSON.stringify(options) !== this.activeCanvas[canvasId]) {
        return
      }

      // if the element or canvas go out of scope, stop animation
      if (!document.getElementById(elementId) || !document.getElementById(canvasId)) { return }

      requestAnimationFrame(renderFrame)
      frameCount++

      // check if this element is the last to be called
      if (!(currentCount < this.activeElements[elementId].count)) {
        analyser.getByteFrequencyData(data)
        this.activeElements[elementId].data = data
      }

      this.visualize(this.activeElements[elementId].data, canvasId, options, frameCount)
    }

    renderFrame = renderFrame.bind(this)
    renderFrame()
  }

  const create = () => {
    // remove all events
    ['touchstart', 'touchmove', 'touchend', 'mouseup', 'click', 'play'].forEach(event => {
      element.removeEventListener(event, create, { once: true })
    })

    run.call(waveContext)
  }

  if (this.activated || options.skipUserEventsWatcher) {
    run.call(waveContext)
  } else {
    // wait for a valid user gesture
    document.body.addEventListener('touchstart', create, { once: true })
    document.body.addEventListener('touchmove', create, { once: true })
    document.body.addEventListener('touchend', create, { once: true })
    document.body.addEventListener('mouseup', create, { once: true })
    document.body.addEventListener('click', create, { once: true })
    element.addEventListener('play', create, { once: true })
  }
}
