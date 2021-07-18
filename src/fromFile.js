export default function fromFile (file, options = {}) {
  const { Audio, AudioContext } = window

  if (!options.stroke) options.stroke = 10

  const audio = new Audio()
  audio.src = file

  const audioCtx = new AudioContext()
  const analyser = audioCtx.createAnalyser()

  const source = audioCtx.createMediaElementSource(audio)
  source.connect(analyser)

  analyser.fftSize = 64
  const bufferLength = analyser.frequencyBinCount

  let fileData
  const tempData = new Uint8Array(bufferLength)
  let getWave
  let fdi = 0
  const self = this

  audio.addEventListener('loadedmetadata', async function () {
    while (audio.duration === Infinity) {
      await new Promise((resolve, reject) => setTimeout(resolve, 1000))
      audio.currentTime = 10000000 * Math.random()
    }

    audio.currentTime = 0
    audio.play()
  })

  audio.onplay = function () {
    const findSize = (size) => {
      for (let range = 1; range <= 40; range++) {
        const power = 2 ** range

        if (size <= power) return power
      }
    }
    let d = audio.duration
    audio.playbackRate = 16

    d = d / audio.playbackRate

    const drawRate = 20 // ms

    let size = ((d / (drawRate / 1000)) * (analyser.fftSize / 2))
    size = findSize(size)
    fileData = new Uint8Array(size)

    getWave = setInterval(function () {
      analyser.getByteFrequencyData(tempData)

      for (let data in tempData) {
        data = tempData[data]
        fileData[fdi] = data
        fdi++
      }
    }, drawRate)
  }

  audio.onended = function () {
    if (audio.currentTime === audio.duration && fileData !== undefined) {
      clearInterval(getWave)

      const canvas = document.createElement('canvas')
      canvas.height = window.innerHeight
      canvas.width = window.innerWidth

      self.visualize(fileData, canvas, options)
      const image = canvas.toDataURL('image/jpg')
      self.onFileLoad(image)

      canvas.remove()
    }
  }
}
