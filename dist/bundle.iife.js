var Wave = (function () {
  'use strict';

  function fromElement (elementId, canvasId, options) {
    const { HTMLElement, AudioContext, requestAnimationFrame } = window;
    const globalAccessKey = [options.globalAccessKey || '$wave'];
    const initGlobalObject = (elementId) => {
      window[globalAccessKey] = window[globalAccessKey] || {};
      window[globalAccessKey][elementId] = window[globalAccessKey][elementId] || {};
    };

    const getGlobal = options.getGlobal || function (elementId, accessKey) {
      initGlobalObject(elementId);
      return window[globalAccessKey][elementId][accessKey]
    };

    const setGlobal = options.setGlobal || function (elementId, accessKey, value) {
      let returnValue = getGlobal(elementId);
      if (!returnValue) {
        window[globalAccessKey][elementId][accessKey] = window[globalAccessKey][elementId][accessKey] || value;
        returnValue = window[globalAccessKey][elementId][accessKey];
      }
      return returnValue
    };

    const waveContext = this;
    const isElement = elementId instanceof HTMLElement;
    const element = isElement ? elementId : document.getElementById(elementId);
    if (!element) return
    element.crossOrigin = 'anonymous';

    function run () {
      // user gesture has happened
      this.activated = true;

      // track current wave for canvas
      this.activeCanvas = this.activeCanvas || {};
      this.activeCanvas[canvasId] = JSON.stringify(options);

      // track elements used so multiple elements use the same data
      this.activeElements[elementId] = this.activeElements[elementId] || {};
      if (this.activeElements[elementId].count) this.activeElements[elementId].count += 1;
      else this.activeElements[elementId].count = 1;

      const currentCount = this.activeElements[elementId].count;

      const audioCtx = setGlobal(element.id, 'audioCtx', new AudioContext());
      const analyser = setGlobal(element.id, 'analyser', audioCtx.createAnalyser());

      let source = getGlobal(element.id, 'source');
      if (source) {
        if (source.mediaElement !== element) {
          source = audioCtx.createMediaElementSource(element);
        }
      } else {
        source = audioCtx.createMediaElementSource(element);
      }
      setGlobal(element.id, 'source', source);

      // beep test for ios
      const oscillator = audioCtx.createOscillator();
      oscillator.frequency.value = 1;
      oscillator.connect(audioCtx.destination);
      oscillator.start(0);
      oscillator.stop(0);

      source.connect(analyser);
      source.connect(audioCtx.destination);

      analyser.fftsize = 32768;
      const bufferLength = analyser.frequencyBinCount;
      const data = new Uint8Array(bufferLength);
      let frameCount = 1;

      function renderFrame () {
        // only run one wave visual per canvas
        if (JSON.stringify(options) !== this.activeCanvas[canvasId]) {
          return
        }

        // if the element or canvas go out of scope, stop animation
        if (!document.getElementById(elementId) || !document.getElementById(canvasId)) { return }

        requestAnimationFrame(renderFrame);
        frameCount++;

        // check if this element is the last to be called
        if (!(currentCount < this.activeElements[elementId].count)) {
          analyser.getByteFrequencyData(data);
          this.activeElements[elementId].data = data;
        }

        this.visualize(this.activeElements[elementId].data, canvasId, options, frameCount);
      }

      renderFrame = renderFrame.bind(this);
      renderFrame();
    }

    const create = () => {
      // remove all events
      ['touchstart', 'touchmove', 'touchend', 'mouseup', 'click', 'play'].forEach(event => {
        element.removeEventListener(event, create, { once: true });
      });

      run.call(waveContext);
    };

    if (this.activated || options.skipUserEventsWatcher) {
      run.call(waveContext);
    } else {
      // wait for a valid user gesture
      document.body.addEventListener('touchstart', create, { once: true });
      document.body.addEventListener('touchmove', create, { once: true });
      document.body.addEventListener('touchend', create, { once: true });
      document.body.addEventListener('mouseup', create, { once: true });
      document.body.addEventListener('click', create, { once: true });
      element.addEventListener('play', create, { once: true });
    }
  }

  function fromFile (file, options = {}) {
    const { Audio, AudioContext } = window;

    if (!options.stroke) options.stroke = 10;

    const audio = new Audio();
    audio.src = file;

    const audioCtx = new AudioContext();
    const analyser = audioCtx.createAnalyser();

    const source = audioCtx.createMediaElementSource(audio);
    source.connect(analyser);

    analyser.fftSize = 64;
    const bufferLength = analyser.frequencyBinCount;

    let fileData;
    const tempData = new Uint8Array(bufferLength);
    let getWave;
    let fdi = 0;
    const self = this;

    audio.addEventListener('loadedmetadata', async function () {
      while (audio.duration === Infinity) {
        await new Promise((resolve, reject) => setTimeout(resolve, 1000));
        audio.currentTime = 10000000 * Math.random();
      }

      audio.currentTime = 0;
      audio.play();
    });

    audio.onplay = function () {
      const findSize = (size) => {
        for (let range = 1; range <= 40; range++) {
          const power = 2 ** range;

          if (size <= power) return power
        }
      };
      let d = audio.duration;
      audio.playbackRate = 16;

      d = d / audio.playbackRate;

      const drawRate = 20; // ms

      let size = ((d / (drawRate / 1000)) * (analyser.fftSize / 2));
      size = findSize(size);
      fileData = new Uint8Array(size);

      getWave = setInterval(function () {
        analyser.getByteFrequencyData(tempData);

        for (let data in tempData) {
          data = tempData[data];
          fileData[fdi] = data;
          fdi++;
        }
      }, drawRate);
    };

    audio.onended = function () {
      if (audio.currentTime === audio.duration && fileData !== undefined) {
        clearInterval(getWave);

        const canvas = document.createElement('canvas');
        canvas.height = window.innerHeight;
        canvas.width = window.innerWidth;

        self.visualize(fileData, canvas, options);
        const image = canvas.toDataURL('image/jpg');
        self.onFileLoad(image);

        canvas.remove();
      }
    };
  }

  function fromStream (stream, canvasId, options = {}, connectDestination = true) {
    const { AudioContext, cancelAnimationFrame, requestAnimationFrame } = window;

    this.current_stream.id = canvasId;
    this.current_stream.options = options;

    let audioCtx, analyser, source;
    if (!this.sources[stream.toString()]) {
      audioCtx = new AudioContext();
      analyser = audioCtx.createAnalyser();

      source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      if (connectDestination) {
        source.connect(audioCtx.destination); // playback audio
      }

      this.sources[stream.toString()] = {
        audioCtx: audioCtx,
        analyser: analyser,
        source: source
      };
    } else {
      cancelAnimationFrame(this.sources[stream.toString()].animation);
      audioCtx = this.sources[stream.toString()].audioCtx;
      analyser = this.sources[stream.toString()].analyser;
      source = this.sources[stream.toString()].source;
    }

    analyser.fftsize = 32768;
    const bufferLength = analyser.frequencyBinCount;
    this.current_stream.data = new Uint8Array(bufferLength);

    const self = this;
    let frameCount = 1;

    function renderFrame () {
      self.current_stream.animation = requestAnimationFrame(self.current_stream.loop);
      frameCount++;
      self.sources[stream.toString()].animation = self.current_stream.animation;
      analyser.getByteFrequencyData(self.current_stream.data);

      self.visualize(self.current_stream.data, self.current_stream.id, self.current_stream.options, frameCount);
    }

    this.current_stream.loop = renderFrame;
    renderFrame();
  }

  function stopStream () {
    window.cancelAnimationFrame(this.current_stream.animation);
  }

  function playStream () {
    this.current_stream.loop();
  }

  var fromStream$1 = {
    fromStream,
    stopStream,
    playStream
  };

  var drawWave = (functionContext) => {
    let { data, options, ctx, h, w, Helper } = functionContext;
    const { colors } = options;
    const helper = new Helper(ctx);

    // data = helper.mutateData(data, "shrink", 200)
    data = helper.mutateData(data, 'split', 4)[0];
    data = helper.mutateData(data, 'scale', h);

    const points = helper.getPoints('line', w, [0, h], data.length, data, { offset: 100 });
    points.start = points.start.slice(0, points.end.length - 1);
    points.start.push([w, h]);
    points.start.push([0, h]);

    helper.drawPolygon(points.start, { lineColor: colors[0], color: colors[1], radius: (h * 0.008) });
  };

  var drawShine = (functionContext) => {
    const { data, options, ctx, h, w } = functionContext;

    const cx = w / 2;
    const cy = h / 2;
    const r = h / 4;
    const percent = (h / 2 - r) / 255;
    const pointCount = 512;
    const increase = (360 / pointCount) * Math.PI / 180;

    for (let point = 1; point <= pointCount; point++) {
      let p = data[600 % point]; // get value
      p *= percent;
      point++; // start at 1
      const a = point * increase;

      const sx = cx + r * Math.cos(a);
      const sy = cy + r * Math.sin(a);
      ctx.moveTo(sx, sy);

      const dx = cx + (r + p) * Math.cos(a);
      const dy = cy + (r + p) * Math.sin(a);
      ctx.lineTo(dx, dy);
    }
    ctx.stroke();

    if (options.colors[1]) {
      ctx.arc(cx, cy, r * 0.90, 0, 2 * Math.PI);
      ctx.fillStyle = options.colors[1];
      ctx.fill();
    }
  };

  var drawRing = (functionContext) => {
    const { data, options, ctx, h, w } = functionContext;

    const cx = w / 2;
    const cy = h / 2;
    const r = (h - 10) / 2;
    const offset = r / 5;
    const percent = (r - offset) / 255;
    const pointCount = 150;
    const increase = (360 / pointCount) * Math.PI / 180;

    ctx.arc(cx, cy, r, 0, 2 * Math.PI, true);

    const fa = 0;
    const fx = cx + (r - (data[0] * percent)) * Math.cos(fa);
    const fy = cy + (r - (data[0] * percent)) * Math.sin(fa);
    ctx.moveTo(fx, fy);

    let q = 0;
    for (let point = 0; point < pointCount; point++) {
      q += 1;
      if (point >= pointCount / 2) {
        q -= 2;
      }

      let p = data[q]; // get value
      p *= percent;

      const a = point * increase;
      const x = cx + (r - p) * Math.cos(a);
      const y = cy + (r - p) * Math.sin(a);

      ctx.lineTo(x, y);
      ctx.arc(x, y, 2, 0, 2 * Math.PI);
    }
    ctx.lineTo(fx, fy);

    ctx.stroke();
    ctx.fillStyle = options.colors[1] || '#fff0';
    ctx.fill();
  };

  var drawBars = (functionContext) => {
    const { data, options, ctx, h, w } = functionContext;

    const pointCount = 64;
    const percent = h / 255;
    const increase = w / 64;
    const breakpoint = Math.floor(pointCount / options.colors.length);

    for (let point = 1; point <= pointCount; point++) {
      let p = data[point]; // get value
      p *= percent;

      const x = increase * point;

      ctx.moveTo(x, h);
      ctx.lineTo(x, h - p);

      if (point % breakpoint === 0) {
        const i = (point / breakpoint) - 1;
        ctx.strokeStyle = options.colors[i];
        ctx.stroke();
        ctx.beginPath();
      }
    }
  };

  var drawDualbars = (functionContext) => {
    const { data, options, ctx, h, w } = functionContext;

    const percent = h / 255;
    const increase = w / 128;
    const pointCount = 128;
    const min = 5;
    const breakpoint = Math.floor(pointCount / options.colors.length);

    for (let point = 1; point <= pointCount; point++) {
      let p = data[point]; // get value
      p += min;
      p *= percent;

      const x = increase * point;

      const mid = (h / 2) + (p / 2);

      ctx.moveTo(x, mid);
      ctx.lineTo(x, mid - p);

      if (point % breakpoint === 0) {
        const i = (point / breakpoint) - 1;
        ctx.strokeStyle = options.colors[i];
        ctx.stroke();
        ctx.beginPath();
      }
    }
  };

  var drawOrbs = (functionContext) => {
    let { data, options, ctx, h, w, Helper } = functionContext;
    const { colors } = options;
    const helper = new Helper(ctx);

    data = helper.mutateData(data, 'organize').mids;
    data = helper.mutateData(data, 'split', 2)[0];
    data = helper.mutateData(data, 'shrink', 100);
    data = helper.mutateData(data, 'mirror');
    data = helper.mutateData(data, 'scale', h);
    data = helper.mutateData(data, 'amp', 0.75);

    const points = helper.getPoints('line', w, [0, h / 2], data.length, data, { offset: 50 });
    points.start.forEach((start, i) => {
      helper.drawLine(start, points.end[i], { lineColor: colors[0] });

      helper.drawCircle(start, h * 0.01, { color: colors[1] || colors[0] });
      helper.drawCircle(points.end[i], h * 0.01, { color: colors[1] || colors[0] });
    });
  };

  var drawFlower = (functionContext) => {
    const { data, options, ctx, h, w } = functionContext;

    const min = 5;
    const r = h / 4;
    const offset = r / 2;
    const cx = w / 2;
    const cy = h / 2;
    const pointCount = 128;
    const percent = (r - offset) / 255;
    const increase = (360 / pointCount) * Math.PI / 180;
    const breakpoint = Math.floor(pointCount / options.colors.length);

    for (let point = 1; point <= pointCount; point++) {
      const p = (data[point] + min) * percent;
      const a = point * increase;

      const sx = cx + (r - (p - offset)) * Math.cos(a);
      const sy = cy + (r - (p - offset)) * Math.sin(a);
      ctx.moveTo(sx, sy);

      const dx = cx + (r + p) * Math.cos(a);
      const dy = cy + (r + p) * Math.sin(a);
      ctx.lineTo(dx, dy);

      if (point % breakpoint === 0) {
        const i = (point / breakpoint) - 1;
        ctx.strokeStyle = options.colors[i];
        ctx.stroke();
        ctx.beginPath();
      }
    }

    ctx.stroke();
  };

  var drawFlowerBlocks = (functionContext) => {
    const { data, options, ctx, h, w } = functionContext;

    const r = h / 4;
    const cx = w / 2;
    const cy = h / 2;
    const pointCount = 56;
    const percent = r / 255;
    const increase = (360 / pointCount) * Math.PI / 180;

    for (let point = 1; point <= pointCount; point++) {
      const p = (data[point]) * percent;
      const a = point * increase;

      const ax = cx + (r - (p / 2)) * Math.cos(a);
      const ay = cy + (r - (p / 2)) * Math.sin(a);
      ctx.moveTo(ax, ay);

      const bx = cx + (r + p) * Math.cos(a);
      const by = cy + (r + p) * Math.sin(a);
      ctx.lineTo(bx, by);

      const dx = cx + (r + p) * Math.cos(a + increase);
      const dy = cy + (r + p) * Math.sin(a + increase);
      ctx.lineTo(dx, dy);

      const ex = cx + (r - (p / 2)) * Math.cos(a + increase);
      const ey = cy + (r - (p / 2)) * Math.sin(a + increase);

      ctx.lineTo(ex, ey);
      ctx.lineTo(ax, ay);
    }

    if (options.colors[1]) {
      ctx.fillStyle = options.colors[1];
      ctx.fill();
    }

    ctx.stroke();
  };

  var drawBarsBlocks = (functionContext) => {
    const { data, options, ctx, h, w } = functionContext;

    const percent = h / 255;
    const width = w / 64;

    for (let point = 0; point < 64; point++) {
      let p = data[point]; // get value
      p *= percent;
      const x = width * point;

      ctx.rect(x, h, width, -(p));
    }

    ctx.fillStyle = options.colors[1] || options.colors[0];
    ctx.stroke();
    ctx.fill();
  };

  var drawDualbarsBlocks = (functionContext) => {
    const { data, options, ctx, h, w } = functionContext;

    const percent = h / 255;
    const width = w / 50;

    for (let point = 0; point <= 50; point++) {
      let p = data[point]; // get value
      p *= percent;
      const x = width * point;

      ctx.rect(x, (h / 2) + (p / 2), width, -(p));
    }

    if (options.colors[1]) {
      ctx.fillStyle = options.colors[1];
      ctx.fill();
    }

    ctx.stroke();
  };

  var drawStar = (functionContext) => {
    const { data, options, ctx, h, w } = functionContext;

    const r = h / 4;
    const offset = r / 4;
    const cx = w / 2;
    const cy = h / 2;
    const pointCount = 120;
    const percent = (r - offset - 35) / (255);
    const increase = (360 / pointCount) * Math.PI / 180;

    const top = [];
    const bottom = [];

    for (let point = 1; point <= pointCount; point++) {
      const p = ((data[200 % point])) * percent;
      const a = point * increase;

      const sx = cx + ((r) - p + offset) * Math.cos(a);
      const sy = cy + ((r) - p + offset) * Math.sin(a);
      ctx.moveTo(sx, sy);
      bottom.push({
        x: sx,
        y: sy
      });

      const dx = cx + (r + p + offset) * Math.cos(a);
      const dy = cy + (r + p + offset) * Math.sin(a);
      ctx.lineTo(dx, dy);
      top.push({
        x: dx,
        y: dy
      });
    }

    ctx.moveTo(top[0].x, top[0].y);
    for (let t in top) {
      t = top[t];

      ctx.lineTo(t.x, t.y);
    }
    ctx.closePath();

    ctx.moveTo(bottom[0].x, bottom[0].y);
    for (let b = bottom.length - 1; b >= 0; b++) {
      b = bottom[b];

      ctx.lineTo(b.x, b.y);
    }
    ctx.closePath();

    if (options.colors[1]) {
      ctx.fillStyle = options.colors[1];
      ctx.fill();
    }
    ctx.stroke();

    // inner color
    ctx.beginPath();
    ctx.moveTo(bottom[0].x, bottom[0].y);
    for (let b in bottom) {
      b = bottom[b];

      ctx.lineTo(b.x, b.y);
    }
    ctx.closePath();

    if (options.colors[2]) {
      ctx.fillStyle = options.colors[2];
      ctx.fill();
    }
    ctx.stroke();
  };

  var drawRoundWave = (functionContext) => {
    const { data, options, ctx, h, w } = functionContext;

    const r = h / 4;
    const cx = w / 2;
    const cy = h / 2;
    const pointCount = 100;
    const percent = r / 255;
    const increase = (360 / pointCount) * Math.PI / 180;
    const p = 0;

    // let z = (data[0] + min + offset) * percent;
    const sx = cx + (r + p) * Math.cos(0);
    const sy = cy + (r + p) * Math.sin(0);
    ctx.moveTo(sx, sy);

    for (let point = 1; point <= pointCount; point++) {
      const p = (data[350 % point]) * percent;
      const a = point * increase;

      const dx = cx + (r + p) * Math.cos(a);
      const dy = cy + (r + p) * Math.sin(a);
      ctx.lineTo(dx, dy);
    }

    ctx.closePath();
    ctx.stroke();

    if (options.colors[1]) {
      ctx.fillStyle = options.colors[1];
      ctx.fill();
    }
  };

  var drawRings = (functionContext) => {
    let { data, options, ctx, h, w, Helper } = functionContext;
    const { colors } = options;
    const helper = new Helper(ctx);
    const minDimension = (h < w) ? h : w;

    data = helper.mutateData(data, 'organize');
    data = [data.mids, data.vocals];

    data[0] = helper.mutateData(data[0], 'scale', minDimension / 4);
    data[1] = helper.mutateData(data[1], 'scale', minDimension / 8);

    data[0] = helper.mutateData(data[0], 'shrink', 1 / 5);
    data[0] = helper.mutateData(data[0], 'split', 2)[0];

    data[0] = helper.mutateData(data[0], 'reverb');
    data[1] = helper.mutateData(data[1], 'reverb');

    const outerCircle = helper.getPoints('circle', minDimension / 2, [w / 2, h / 2], data[0].length, data[0]);
    const innerCircle = helper.getPoints('circle', minDimension / 4, [w / 2, h / 2], data[1].length, data[1]);

    helper.drawPolygon(outerCircle.end, { close: true, radius: 4, lineColor: colors[0], color: colors[1] });
    helper.drawPolygon(innerCircle.end, { close: true, radius: 4, lineColor: colors[2], color: colors[3] });

    const middle = ((minDimension / 4) + (minDimension / 2)) / 2;
    const largerInner = data[1] = helper.mutateData(data[1], 'scale', ((minDimension / 4) - (minDimension / 2)));
    const innerBars = helper.getPoints('circle', middle, [w / 2, h / 2], data[1].length, largerInner);
    innerBars.start.forEach((start, i) => {
      helper.drawLine(start, innerBars.end[i], { lineColor: colors[4] || colors[2] });
    });
  };

  var drawShineRings = (functionContext) => {
    let { data, options, ctx, h, w, Helper } = functionContext;
    const { colors } = options;

    const helper = new Helper(ctx);
    const minDimension = (h < w) ? h : w;

    data = helper.mutateData(data, 'organize');
    data.vocals = helper.mutateData(data.vocals, 'scale', (minDimension / 2) / 2);
    data.base = helper.mutateData(data.base, 'scale', (minDimension / 2) / 2);

    const outerBars = helper.getPoints('circle', minDimension / 2, [w / 2, h / 2], data.vocals.length, data.vocals);
    const innerWave = helper.getPoints('circle', minDimension / 2, [w / 2, h / 2], data.vocals.length, data.vocals, { offset: 100 });
    const thinLine = helper.getPoints('circle', minDimension / 2, [w / 2, h / 2], data.base.length, data.base, { offset: 100 });

    outerBars.start.forEach((start, i) => {
      helper.drawLine(start, outerBars.end[i], { lineColor: colors[0] });
    });

    helper.drawPolygon(innerWave.start, { close: true, lineColor: colors[1], color: colors[3], radius: 5 });
    helper.drawPolygon(thinLine.start, { close: true, lineColor: colors[2], color: colors[4], radius: 5 });
  };

  var drawCubes = (functionContext) => {
    let { data, options, ctx, h, w, Helper } = functionContext;
    const { colors } = options;
    const helper = new Helper(ctx);

    data = helper.mutateData(data, 'organize').base;

    data = helper.mutateData(data, 'shrink', 20).slice(0, 19);
    data = helper.mutateData(data, 'scale', h);

    const points = helper.getPoints('line', w, [0, h], data.length, data);

    const spacing = 5;
    const squareSize = (w / 20) - spacing;
    let colorIndex = 0;

    points.start.forEach((start, i) => {
      const squareCount = Math.ceil(data[i] / squareSize);

      // find color stops from total possible squares in bar
      const totalSquares = (h - (spacing * (h / squareSize))) / squareSize;
      const colorStop = Math.ceil(totalSquares / colors.length);

      for (let j = 1; j <= squareCount; j++) {
        const origin = [start[0], (start[1] - (squareSize * j) - (spacing * j))];
        helper.drawSquare(origin, squareSize, { color: colors[colorIndex], lineColor: 'black' });
        if (j % colorStop === 0) {
          colorIndex++;
          if (colorIndex >= colors.length) colorIndex = colors.length - 1;
        }
      }
      colorIndex = 0;
    });
  };

  var drawBigBars = (functionContext) => {
    let { data, options, ctx, h, w, Helper } = functionContext;
    const { colors } = options;
    const helper = new Helper(ctx);

    data = helper.mutateData(data, 'organize').vocals;
    data = helper.mutateData(data, 'shrink', 10);
    data = helper.mutateData(data, 'scale', h);
    data = helper.mutateData(data, 'amp', 1);
    const points = helper.getPoints('line', w, [0, h / 2], data.length, data, { offset: 50 });

    let colorIndex = 0;
    const colorStop = Math.ceil(data.length / colors.length);
    points.start.forEach((start, i) => {
      if ((i + 1) % colorStop === 0) colorIndex++;
      helper.drawRectangle(start, data[i], w / data.length, { color: colors[colorIndex] });
    });
  };

  var drawShockwave = (functionContext) => {
    let { data, options, ctx, h, w, Helper } = functionContext;
    const { colors } = options;

    const helper = new Helper(ctx);

    data = helper.mutateData(data, 'shrink', 300);
    data = helper.mutateData(data, 'scale', h / 2);
    data = helper.mutateData(data, 'split', 4).slice(0, 3);

    let colorIndex = 0;
    data.forEach((points) => {
      const wavePoints = helper.getPoints('line', w, [0, h / 2], points.length, points);
      helper.drawPolygon(wavePoints.end, { lineColor: colors[colorIndex], radius: (h * 0.015) });

      const invertedPoints = helper.getPoints('line', w, [0, h / 2], points.length, points, { offset: 100 });
      helper.drawPolygon(invertedPoints.start, { lineColor: colors[colorIndex], radius: (h * 0.015) });
      colorIndex++;
    });
  };

  var drawFireworks = (functionContext) => {
    let { data, options, ctx, h, w, Helper } = functionContext;
    const { colors } = options;
    const helper = new Helper(ctx);

    data = helper.mutateData(data, 'shrink', 200).slice(0, 120);
    data = helper.mutateData(data, 'mirror');
    data = helper.mutateData(data, 'scale', (h / 4) + ((h / 4) * 0.35));

    const points = helper.getPoints('circle', h / 2, [w / 2, h / 2], data.length, data, { offset: 35, rotate: 270 });

    points.start.forEach((start, i) => {
      helper.drawLine(start, points.end[i]);
    });

    helper.drawPolygon(points.start, { close: true });

    points.end.forEach((end, i) => {
      helper.drawCircle(end, h * 0.01, { color: colors[0] });
    });
  };

  var drawStatic = (functionContext) => {
    let { data, ctx, h, w, Helper } = functionContext;
    const helper = new Helper(ctx);

    data = helper.mutateData(data, 'shrink', 1 / 8);
    data = helper.mutateData(data, 'split', 2)[0];
    data = helper.mutateData(data, 'scale', h);

    const points = helper.getPoints('line', w, [0, h / 2], data.length, data, { offset: 50 });

    let prevPoint = null;
    points.start.forEach((start, i) => {
      if (prevPoint) {
        helper.drawLine(prevPoint, start);
      }
      helper.drawLine(start, points.end[i]);
      prevPoint = points.end[i];
    });
  };

  var drawWeb = (functionContext) => {
    let { data, options, ctx, h, w, Helper } = functionContext;
    const { colors } = options;
    const helper = new Helper(ctx);
    const minDimension = (h < w) ? h : w;

    data = helper.mutateData(data, 'shrink', 100);
    data = helper.mutateData(data, 'split', 2)[0];
    data = helper.mutateData(data, 'scale', h / 4);

    let dataCopy = data;

    let points = helper.getPoints('circle', minDimension / 2, [w / 2, h / 2], data.length, data);
    helper.drawPolygon(points.end, { close: true });

    points.start.forEach((start, i) => {
      helper.drawLine(start, points.end[i]);
    });

    data = helper.mutateData(data, 'scale', 0.7);
    points = helper.getPoints('circle', minDimension / 2, [w / 2, h / 2], data.length, data);
    helper.drawPolygon(points.end, { close: true });

    data = helper.mutateData(data, 'scale', 0.3);
    points = helper.getPoints('circle', minDimension / 2, [w / 2, h / 2], data.length, data);
    helper.drawPolygon(points.end, { close: true });

    helper.drawCircle([w / 2, h / 2], minDimension / 2, { color: colors[2] });

    dataCopy = helper.mutateData(dataCopy, 'scale', 1.4);
    points = helper.getPoints('circle', minDimension / 2, [w / 2, h / 2], dataCopy.length, dataCopy);
    points.end.forEach((end, i) => {
      helper.drawCircle(end, minDimension * 0.01, { color: colors[1], lineColor: colors[1] || colors[0] });
    });
  };

  var drawStitches = (functionContext) => {
    let { data, ctx, h, w, Helper } = functionContext;
    const helper = new Helper(ctx);
    const minDimension = (h < w) ? h : w;

    data = helper.mutateData(data, 'shrink', 200);
    data = helper.mutateData(data, 'split', 2)[0];
    data = helper.mutateData(data, 'scale', h / 2);

    const points = helper.getPoints('circle', minDimension / 2, [w / 2, h / 2], data.length, data, { offset: 50 });

    helper.drawPolygon(points.end, { close: true });
    helper.drawPolygon(points.start, { close: true });

    for (let i = 0; i < points.start.length; i += 1) {
      const start = points.start[i];
      i++;
      const end = points.end[i] || points.end[0];

      helper.drawLine(start, end);
      helper.drawLine(end, points.start[i + 1] || points.start[0]);
    }
  };

  // options:type,colors,stroke
  function visualize (data, canvasId, options = {}, frame) {
    // make a clone of options
    options = { ...options };
    // options
    if (!options.stroke) options.stroke = 1;
    if (!options.colors) options.colors = ['#d92027', '#ff9234', '#ffcd3c', '#35d0ba'];

    const canvas = document.getElementById(canvasId);

    if (!canvas) return

    const ctx = canvas.getContext('2d');
    const h = canvas.height;
    const w = canvas.width;

    ctx.strokeStyle = options.colors[0];
    ctx.lineWidth = options.stroke;

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
    };

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
    };

    const functionContext = {
      data, options, ctx, h, w, Helper: this.Helper, canvasId
    };

    if (typeof options.type === 'string') options.type = [options.type];

    options.type.forEach(type => {
      // abide by the frame rate
      if (frame % frameRateMap[type] === 0) {
        // clear canvas
        ctx.clearRect(0, 0, w, h);
        ctx.beginPath();

        typeMap[type](functionContext);
      }
    });
  }

  function Helper (ctx) {
    this.ctx = ctx;
    this.mainColor = 'black';
  }

  Helper.prototype = {
    __toRadians__ (degree) {
      return (degree * Math.PI) / 180
    },
    __rotatePoint__ ([pointX, pointY], [originX, originY], degree) {
      // clockwise
      const angle = this.__toRadians__(degree);
      const rotatedX = Math.cos(angle) * (pointX - originX) - Math.sin(angle) * (pointY - originY) + originX;
      const rotatedY = Math.sin(angle) * (pointX - originX) + Math.cos(angle) * (pointY - originY) + originY;

      return [rotatedX, rotatedY]
    },
    mutateData (data, type, extra = null) {
      if (type === 'mirror') {
        let rtn = [];

        for (let i = 0; i < data.length; i += 2) {
          rtn.push(data[i]);
        }

        rtn = [...rtn, ...rtn.reverse()];
        return rtn
      }

      if (type === 'shrink') {
        // resize array by % of current array
        if (extra < 1) {
          extra = data.length * extra;
        }

        const rtn = [];
        const splitAt = Math.floor(data.length / extra);

        for (let i = 1; i <= extra; i++) {
          const arraySection = data.slice(i * splitAt, (i * splitAt) + splitAt);
          const middle = arraySection[Math.floor(arraySection.length / 2)];
          rtn.push(middle);
        }

        return rtn
      }

      if (type === 'split') {
        const size = Math.floor(data.length / extra);
        const rtn = [];
        let temp = [];

        let track = 0;
        for (let i = 0; i <= size * extra; i++) {
          if (track === size) {
            rtn.push(temp);
            temp = [];
            track = 0;
          }

          temp.push(data[i]);
          track++;
        }

        return rtn
      }

      if (type === 'scale') {
        let scalePercent = extra / 255;
        if (extra <= 3 && extra >= 0) scalePercent = extra;
        const rtn = data.map(value => value * scalePercent);
        return rtn
      }

      if (type === 'organize') {
        const rtn = {};
        rtn.base = data.slice(60, 120);
        rtn.vocals = data.slice(120, 255);
        rtn.mids = data.slice(255, 2000);
        return rtn
      }

      if (type === 'reverb') {
        const rtn = [];
        data.forEach((val, i) => {
          rtn.push(val - (data[i + 1] || 0));
        });
        return rtn
      }

      if (type === 'amp') {
        const rtn = [];
        data.forEach(val => {
          rtn.push(val * (extra + 1));
        });
        return rtn
      }

      if (type === 'min') {
        const rtn = [];
        data.forEach(value => {
          if (value < extra) value = extra;
          rtn.push(value);
        });
        return rtn
      }
    },
    getPoints (shape, size, [originX, originY], pointCount, endPoints, options = {}) {
      const { offset = 0, rotate = 0, customOrigin = [] } = options;
      const rtn = {
        start: [],
        end: []
      };

      if (shape === 'circle') {
        const degreePerPoint = 360 / pointCount;
        const radianPerPoint = this.__toRadians__(degreePerPoint);
        const radius = size / 2;

        for (let i = 1; i <= pointCount; i++) {
          const currentRadian = radianPerPoint * i;
          const currentEndPoint = endPoints[i - 1];
          const pointOffset = endPoints[i - 1] * (offset / 100);

          let x = originX + (radius - pointOffset) * Math.cos(currentRadian);
          let y = originY + (radius - pointOffset) * Math.sin(currentRadian);
          const point1 = this.__rotatePoint__([x, y], [originX, originY], rotate);

          rtn.start.push(point1);

          x = originX + ((radius - pointOffset) + currentEndPoint) * Math.cos(currentRadian);
          y = originY + ((radius - pointOffset) + currentEndPoint) * Math.sin(currentRadian);
          const point2 = this.__rotatePoint__([x, y], [originX, originY], rotate);

          rtn.end.push(point2);
        }

        return rtn
      }

      if (shape === 'line') {
        const increment = size / pointCount;

        originX = customOrigin[0] || originX;
        originY = customOrigin[1] || originY;

        for (let i = 0; i <= pointCount; i++) {
          const degree = rotate;
          const pointOffset = endPoints[i] * (offset / 100);

          const startingPoint = this.__rotatePoint__([originX + (i * increment), originY - pointOffset],
            [originX, originY], degree);
          rtn.start.push(startingPoint);

          const endingPoint = this.__rotatePoint__([originX + (i * increment), (originY + endPoints[i]) - pointOffset],
            [originX, originY], degree);
          rtn.end.push(endingPoint);
        }

        return rtn
      }
    },
    drawCircle ([x, y], diameter, options = {}) {
      const { color, lineColor = this.ctx.strokeStyle } = options;

      this.ctx.beginPath();
      this.ctx.arc(x, y, diameter / 2, 0, 2 * Math.PI);
      this.ctx.strokeStyle = lineColor;
      this.ctx.stroke();
      this.ctx.fillStyle = color;
      if (color) this.ctx.fill();
    },
    drawOval ([x, y], height, width, options = {}) {
      let { rotation = 0, color, lineColor = this.ctx.strokeStyle } = options;
      if (rotation) rotation = this.__toRadians__(rotation);

      this.ctx.beginPath();
      this.ctx.ellipse(x, y, width, height, rotation, 0, 2 * Math.PI);
      this.ctx.strokeStyle = lineColor;
      this.ctx.stroke();
      this.ctx.fillStyle = color;
      if (color) this.ctx.fill();
    },
    drawSquare ([x, y], diameter, options = {}) {
      this.drawRectangle([x, y], diameter, diameter, options);
    },
    drawRectangle ([x, y], height, width, options = {}) {
      const { color, lineColor = this.ctx.strokeStyle, radius = 0, rotate = 0 } = options;

      // if (width < 2 * radius) radius = width / 2;
      // if (height < 2 * radius) radius = height / 2;

      this.ctx.beginPath();
      this.ctx.moveTo(x + radius, y);
      const p1 = this.__rotatePoint__([x + width, y], [x, y], rotate);
      const p2 = this.__rotatePoint__([x + width, y + height], [x, y], rotate);
      this.ctx.arcTo(p1[0], p1[1], p2[0], p2[1], radius);

      const p3 = this.__rotatePoint__([x + width, y + height], [x, y], rotate);
      const p4 = this.__rotatePoint__([x, y + height], [x, y], rotate);
      this.ctx.arcTo(p3[0], p3[1], p4[0], p4[1], radius);

      const p5 = this.__rotatePoint__([x, y + height], [x, y], rotate);
      const p6 = this.__rotatePoint__([x, y], [x, y], rotate);
      this.ctx.arcTo(p5[0], p5[1], p6[0], p6[1], radius);

      const p7 = this.__rotatePoint__([x, y], [x, y], rotate);
      const p8 = this.__rotatePoint__([x + width, y], [x, y], rotate);
      this.ctx.arcTo(p7[0], p7[1], p8[0], p8[1], radius);
      this.ctx.closePath();

      this.ctx.strokeStyle = lineColor;
      this.ctx.stroke();
      this.ctx.fillStyle = color;
      if (color) this.ctx.fill();
    },
    drawLine ([fromX, fromY], [toX, toY], options = {}) {
      const { lineColor = this.ctx.strokeStyle } = options;

      this.ctx.beginPath();
      this.ctx.moveTo(fromX, fromY);
      this.ctx.lineTo(toX, toY);
      this.ctx.strokeStyle = lineColor;
      this.ctx.stroke();
    },
    drawPolygon (points, options = {}) {
      const { color, lineColor = this.ctx.strokeStyle, radius = 0, close = false } = options;

      function getRoundedPoint (x1, y1, x2, y2, radius, first) {
        const total = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
        const idx = first ? radius / total : (total - radius) / total;

        return [x1 + (idx * (x2 - x1)), y1 + (idx * (y2 - y1))]
      }

      function getRoundedPoints (pts, radius) {
        const len = pts.length;
        const res = new Array(len);

        for (let i2 = 0; i2 < len; i2++) {
          let i1 = i2 - 1;
          let i3 = i2 + 1;

          if (i1 < 0) i1 = len - 1;
          if (i3 === len) i3 = 0;

          const p1 = pts[i1];
          const p2 = pts[i2];
          const p3 = pts[i3];

          const prevPt = getRoundedPoint(p1[0], p1[1], p2[0], p2[1], radius, false);
          const nextPt = getRoundedPoint(p2[0], p2[1], p3[0], p3[1], radius, true);
          res[i2] = [prevPt[0], prevPt[1], p2[0], p2[1], nextPt[0], nextPt[1]];
        }
        return res
      }
      if (radius > 0) {
        points = getRoundedPoints(points, radius);
      }

      let i; let pt; const len = points.length;
      for (i = 0; i < len; i++) {
        pt = points[i];
        if (i === 0) {
          this.ctx.beginPath();
          this.ctx.moveTo(pt[0], pt[1]);
        } else {
          this.ctx.lineTo(pt[0], pt[1]);
        }
        if (radius > 0) {
          this.ctx.quadraticCurveTo(pt[2], pt[3], pt[4], pt[5]);
        }
      }

      if (close) this.ctx.closePath();
      this.ctx.strokeStyle = lineColor;
      this.ctx.stroke();

      this.ctx.fillStyle = color;
      if (color) this.ctx.fill();
    }

  };

  function Wave () {
    this.current_stream = {};
    this.sources = {};
    this.onFileLoad = null;
    this.activeElements = {};
    this.activated = false;

    window.AudioContext = window.AudioContext || window.webkitAudioContext;
  }

  Wave.prototype = {
    fromElement,
    fromFile,
    ...fromStream$1,
    visualize,
    Helper
  };

  return Wave;

}());
