import React, { useEffect } from 'react'
import Wave from '@foobar404/wave'

export default () => {
  useEffect(() => {
    const audio = document.querySelector('audio')
    const canvas = document.querySelector('canvas')

    const wave = new Wave()
    wave.fromElement(audio, canvas, { type: 'star' })
  }, [])
  return (
    <div>
      <canvas id='canvas' height='400' width='400' />
      <audio src={process.env.PUBLIC_URL + '/song.mp3'} controls />
    </div>
  )
}
