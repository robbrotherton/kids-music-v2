// knob.js - lightweight knob control
(function(){
    const ANGLE_MIN = -135; // degrees
    const ANGLE_MAX = 135;

    function clamp(v, a, b){ return Math.min(b, Math.max(a, v)); }
    function lerp(a,b,t){ return a + (b-a)*t; }

    function valueToAngle(v, min, max){
        const t = (v - min) / (max - min);
        return lerp(ANGLE_MIN, ANGLE_MAX, t);
    }
    function angleToValue(angle, min, max){
        const t = (angle - ANGLE_MIN) / (ANGLE_MAX - ANGLE_MIN);
        return lerp(min, max, t);
    }

    function makeKnob(el){
        const min = parseFloat(el.dataset.min ?? 0);
        const max = parseFloat(el.dataset.max ?? 1);
        const step = parseFloat(el.dataset.step ?? 0.01);
        let value = parseFloat(el.dataset.value ?? min);

        el.classList.add('knob-root');
        el.tabIndex = 0;
        el.setAttribute('role','slider');
        el.setAttribute('aria-valuemin', String(min));
        el.setAttribute('aria-valuemax', String(max));

        // build inner structure
        el.innerHTML = '';
        const face = document.createElement('div'); face.className = 'knob-face';
        const ind = document.createElement('div'); ind.className = 'knob-indicator';
        face.appendChild(ind);
        el.appendChild(face);

        el._min = min; el._max = max; el._step = step; el._value = value;

        function render(){
            const ang = valueToAngle(el._value, el._min, el._max);
            // compute radius from the face size and indicator size so marker lands at rim
            const fw = face.clientWidth || face.getBoundingClientRect().width || 40;
            const fh = face.clientHeight || face.getBoundingClientRect().height || 40;
            const ih = ind.offsetHeight || 12;
            const radius = Math.max(0, Math.min(fw, fh) / 2 - ih / 2 - 4);
            // center the indicator (translate -50%,-50%), then rotate and translate outward to rim
            ind.style.transform = `translate(-50%,-50%) rotate(${ang}deg) translateY(-${radius}px)`;
            ind.style.transformOrigin = '50% 50%';
            el.setAttribute('aria-valuenow', String(el._value));
        }

        function setValue(v, emit){
            const stepped = Math.round((v - el._min) / el._step) * el._step + el._min;
            const clamped = clamp(stepped, el._min, el._max);
            el._value = Number(Number(clamped).toFixed(6));
            // Keep dataset.value in sync
            el.dataset.value = String(el._value);
            render();
            if (emit) {
                const ev = new Event('input', { bubbles: true });
                // emulate input target.value
                ev.target = el; // some handlers expect e.target.value
                // set .value property for direct reads
                ev.value = el._value;
                el.dispatchEvent(ev);
            }
        }

        // define property
        Object.defineProperty(el, 'value', {
            get(){ return el._value; },
            set(v){ setValue(Number(v), true); }
        });

        // render initial
        render();

        // pointer handling
        let dragging = false;
        function pointerDown(e){
            dragging = true;
            el.setPointerCapture?.(e.pointerId);
            pointerMove(e);
        }
        function pointerMove(e){
            if (!dragging && e.type === 'pointermove') return;
            const rect = el.getBoundingClientRect();
            const cx = rect.left + rect.width/2;
            const cy = rect.top + rect.height/2;
            const dx = e.clientX - cx;
            const dy = e.clientY - cy;
            let ang = Math.atan2(dy, dx) * 180 / Math.PI; // -180..180
            // convert to -180..180; knob angle zero at right; clamp to ANGLE_MIN/ANGLE_MAX
            // use ang as-is
            // Normalize so 0 is to the right; already is
            // Clamp
            ang = clamp(ang, ANGLE_MIN, ANGLE_MAX);
            const v = angleToValue(ang, el._min, el._max);
            setValue(v, true);
        }
        function pointerUp(e){
            dragging = false;
            try{ el.releasePointerCapture?.(e.pointerId); }catch(e){}
        }

        el.addEventListener('pointerdown', pointerDown);
        window.addEventListener('pointermove', pointerMove);
        window.addEventListener('pointerup', pointerUp);

        // keyboard support
        el.addEventListener('keydown', (ev) => {
            if (ev.key === 'ArrowUp' || ev.key === 'ArrowRight'){
                setValue(el._value + el._step, true); ev.preventDefault();
            } else if (ev.key === 'ArrowDown' || ev.key === 'ArrowLeft'){
                setValue(el._value - el._step, true); ev.preventDefault();
            } else if (ev.key === 'Home'){
                setValue(el._min, true); ev.preventDefault();
            } else if (ev.key === 'End'){
                setValue(el._max, true); ev.preventDefault();
            }
        });

        // wheel support
        el.addEventListener('wheel', (ev) => {
            const delta = Math.sign(ev.deltaY) * -1; // wheel up -> increase
            setValue(el._value + delta * el._step, true);
            ev.preventDefault();
        }, { passive: false });

        // Expose setValue for programmatic updates without emitting
        el.setValue = (v, emit=true) => setValue(v, emit);

        // react to direct dataset changes if someone sets dataset.value
        const observer = new MutationObserver(() => {
            const ds = parseFloat(el.dataset.value ?? el._value);
            if (!isNaN(ds) && ds !== el._value) setValue(ds, true);
        });
        observer.observe(el, { attributes: true, attributeFilter: ['data-value'] });
    }

    function initAll(){
        document.querySelectorAll('.knob').forEach(el => {
            try{ makeKnob(el); }catch(e){ }
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAll);
    else initAll();

    // expose small API
    window.knob = { initAll };
})();
