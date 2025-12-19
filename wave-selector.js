// wave-selector.js
// Custom component that provides a 0..3 slider representing four wave types
// and a small animated canvas visualization that morphs smoothly between shapes.
(function(){
  const waveNames = ['sine','triangle','sawtooth','square'];

  function makeSamples(type, len){
    const samples = new Float32Array(len);
    for(let i=0;i<len;i++){
      const t = i / (len - 1);
      let v = 0;
      if(type === 'sine') v = Math.sin(t * Math.PI * 2);
      else if(type === 'triangle') v = 1 - 4 * Math.abs(Math.round(t - 0.25) - (t - 0.25));
      else if(type === 'square') v = (t % 1) < 0.5 ? 1 : -1;
      else if(type === 'sawtooth') v = 2*(t - Math.floor(t+0.5));
      samples[i] = v;
    }
    return samples;
  }

  class WaveSelector extends HTMLElement {
    constructor(){
      super();
      this.attachShadow({mode:'open'});
      const wrapper = document.createElement('div');
      wrapper.className = 'wave-selector';
      wrapper.innerHTML = `
        <div class="vis"><canvas></canvas></div>
        <div class="slider-row">
          <input type="range" min="0" max="3" step="1" value="0">
        </div>
        <div class="labels">
          <div>Sine</div><div>Tri</div><div>Saw</div><div>Sq</div>
        </div>
      `;
      const link = document.createElement('link');
      link.setAttribute('rel','stylesheet');
      link.setAttribute('href','wave-selector.css');
      this.shadowRoot.appendChild(link);
      this.shadowRoot.appendChild(wrapper);

      this._canvas = this.shadowRoot.querySelector('canvas');
      this._ctx = this._canvas.getContext('2d');
      this._range = this.shadowRoot.querySelector('input[type=range]');

      this._samplesLen = 128;
      this._current = makeSamples('sine', this._samplesLen);
      this._target = this._current.slice();
      this._animating = false;

      this._range.addEventListener('input', (e)=>{ this._onInput(e); });
      this._range.addEventListener('change', ()=>{ this._dispatchChange(); });

      // initial size and draw
      this._resize();
      window.addEventListener('resize', ()=> this._resize());
      this._draw();
    }

    connectedCallback(){
      if(this.hasAttribute('value')) this.value = this.getAttribute('value');
    }

    _resize(){
      const rect = this.shadowRoot.querySelector('.vis').getBoundingClientRect();
      this._canvas.width = Math.round(rect.width * devicePixelRatio);
      this._canvas.height = Math.round(rect.height * devicePixelRatio);
      this._draw();
    }

    _onInput(e){
      const idx = parseInt(this._range.value,10);
      const name = waveNames[idx];
      const newTarget = makeSamples(name, this._samplesLen);
      // animate interpolation between _current and newTarget over 300ms
      const start = performance.now();
      const duration = 350;
      const from = this._current.slice();
      const to = newTarget;
      const prevIdx = this._valueIdx ?? 0;
      const newIdx = idx;
      if(this._animFrame) cancelAnimationFrame(this._animFrame);

      // determine warp behavior for special transitions
      // We'll map sample indices toward a target horizontal position instead of always shifting right.
      let useCenterWarp = false;
      let centerWarpFactor = 0; // proportion toward center (0..1)
      let smallWarpFactor = 0; // small warp factor for other transitions
      // triangle <-> saw: use center warp, direction depends on prev->new
      if ((waveNames[prevIdx] === 'triangle' && waveNames[newIdx] === 'sawtooth') ||
          (waveNames[prevIdx] === 'sawtooth' && waveNames[newIdx] === 'triangle')) {
        useCenterWarp = true;
        centerWarpFactor = 0.85; // strength
        // direction: 'in' means triangle->saw (points move toward center), 'out' means saw->triangle
        var centerWarpDirection = (waveNames[prevIdx] === 'triangle' && waveNames[newIdx] === 'sawtooth') ? 'in' : 'out';
      } else if ((waveNames[prevIdx] === 'sine' && waveNames[newIdx] === 'square') ||
                 (waveNames[prevIdx] === 'square' && waveNames[newIdx] === 'sine')) {
        // small subtle warp toward/away from center for sine<->square
        smallWarpFactor = 0.12;
        var smallWarpDirection = (waveNames[prevIdx] === 'sine' && waveNames[newIdx] === 'square') ? 'in' : 'out';
      }

      const step = (now)=>{
        const t = Math.min(1,(now-start)/duration);
        const ease = t<.5?2*t*t: -1 + (4-2*t)*t; // ease
        // special piecewise morph for triangle -> saw: move only the horizontal
        // positions of the top (b) and bottom (c) points toward center while
        // keeping their y positions fixed. This creates a smooth visual where
        // the zig-zag converges to a saw without vertical blending artifacts.
        if (useCenterWarp && ( (waveNames[prevIdx] === 'triangle' && waveNames[newIdx] === 'sawtooth') || (waveNames[prevIdx] === 'sawtooth' && waveNames[newIdx] === 'triangle') ) ) {
          const N = this._samplesLen;
          const xA = 0.0, xD = 1.0;
          const xB0 = 1/3, xC0 = 2/3; // initial triangle point x positions
          let xB, xC;
          if (typeof centerWarpDirection !== 'undefined' && centerWarpDirection === 'in') {
            // triangle -> saw: move toward center
            xB = xB0 + (0.5 - xB0) * ease * centerWarpFactor;
            xC = xC0 + (0.5 - xC0) * ease * centerWarpFactor;
          } else {
            // saw -> triangle: move outward from center toward xB0/xC0
            xB = 0.5 + (xB0 - 0.5) * ease * centerWarpFactor;
            xC = 0.5 + (xC0 - 0.5) * ease * centerWarpFactor;
          }
          const yA = 0, yB = 1, yC = -1, yD = 0;
          for (let i=0;i<N;i++){
            const s = i / (N - 1);
            let y;
            if (s <= xB) {
              const denom = (xB - xA) || 1e-6;
              const tt = (s - xA) / denom;
              y = yA + (yB - yA) * tt;
            } else if (s <= xC) {
              const denom = (xC - xB) || 1e-6;
              const tt = (s - xB) / denom;
              y = yB + (yC - yB) * tt;
            } else {
              const denom = (xD - xC) || 1e-6;
              const tt = (s - xC) / denom;
              y = yC + (yD - yC) * tt;
            }
            // blend from current 'from' toward this piecewise y
            this._current[i] = from[i] + (y - from[i]) * ease;
          }
        } else {
          // fallback: warp indices toward center slightly for smallWarps, or direct sample mix
          const mid = (this._samplesLen - 1) / 2;
          for(let i=0;i<this._samplesLen;i++){
            let toSample;
            if (smallWarpFactor > 0) {
              const mapped = i + (mid - i) * (smallWarpFactor * ease);
              const k = Math.max(0, Math.min(this._samplesLen - 1, Math.round(mapped)));
              toSample = to[k] ?? to[i];
            } else {
              toSample = to[i];
            }
            this._current[i] = from[i] + (toSample - from[i]) * ease;
          }
        }
        this._draw();
        if(t<1) this._animFrame = requestAnimationFrame(step);
        else { this._animFrame = null; }
      };
      this._animFrame = requestAnimationFrame(step);
      // update target value and dataset + exposed property
      this._target = to;
      this._valueIdx = idx;
      this._value = waveNames[idx];
      this.setAttribute('value', this._value);
    }

    _dispatchChange(){
      const ev = new Event('change', { bubbles: true });
      // ensure target.value is available to listeners
      ev.target = this;
      this.dispatchEvent(ev);
    }

    _draw(){
      const ctx = this._ctx; const w = this._canvas.width; const h = this._canvas.height;
      ctx.clearRect(0,0,w,h);
      ctx.save();
      ctx.scale(devicePixelRatio, devicePixelRatio);
      const cw = w / devicePixelRatio; const ch = h / devicePixelRatio;
      ctx.translate(0,ch/2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#4a90e2';
      ctx.beginPath();
      for(let i=0;i<this._samplesLen;i++){
        const x = (i/(this._samplesLen-1)) * cw;
        const y = - (this._current[i]) * (ch/2 - 6);
        if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      }
      ctx.stroke();
      ctx.restore();
    }

    get value(){ return this._value ?? 'sine'; }
    set value(v){
      const idx = waveNames.indexOf(v);
      if(idx < 0) return;
      this._range.value = String(idx);
      // make immediate jump to target without anim
      this._target = makeSamples(v,this._samplesLen);
      this._current = this._target.slice();
      this._value = v;
      this.setAttribute('value', v);
      this._draw();
    }
  }

  customElements.define('wave-selector', WaveSelector);
  // expose for manual init if needed
  window.WaveSelector = WaveSelector;
})();
