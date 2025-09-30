/* bg.js - simplified: ONLY medium blobs (no tiny particles)
   - Starts with 4 (configurable) medium blobs (min 4, max 6)
   - Strict caps: maxTotalParticles small (default 8..12)
   - Merging -> merged -> split (bounded); prevents exponential growth
   - Pointer interaction retained
*/

(() => {
  const container = document.getElementById('bg-container');
  const canvas = document.getElementById('bg-canvas');
  if (!container || !canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });

  // CONFIG: tweak to taste
  const CONFIG = {
    mediumCountInitial: 4,      // starting medium blobs (3..6 recommended)
    mediumMin: 4,               // minimum mediums to keep
    mediumMax: 6,               // absolute maximum medium blobs allowed at any time
    mediumRadiusMin: 36,
    mediumRadiusMax: 80,
    mediumSpeedMin: 0.02,
    mediumSpeedMax: 0.08,
    mergedTTL: 1600,            // merged blob lifetime before splitting (ms)
    splitPiecesMin: 3,          // when merged splits -> how many medium pieces
    splitPiecesMax: 5,
    mergeDistanceFactor: 0.9,   // relative to radii sum
    cursorFollowStrength: 0.06,
    cursorRepelRadius: 36,
    fpsLimit: 60,
    colors: ['rgba(34,211,127,0.18)', 'rgba(160,80,255,0.12)', 'rgba(24,160,255,0.10)'],
    maxTotalParticles: 10       // hard cap (merged + mediums)
  };

  // state
  let w = 0, h = 0, dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
  let particles = [];   // array of particle objects (only 'medium' and 'merged')
  let lastFrame = performance.now();
  let frameInterval = 1000 / CONFIG.fpsLimit;
  let pointer = { x: 0.5, y: 0.5, active: false };
  let idCounter = 1;

  // util
  const rand = (a,b) => a + Math.random()*(b-a);
  const randInt = (a,b) => Math.floor(rand(a,b+1));
  const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
  const nowMs = () => performance.now();

  // resize
  function resize(){
    w = Math.max(1, container.clientWidth);
    h = Math.max(1, container.clientHeight);
    dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }

  // create medium blob
  function createMedium(x,y,opts={}){
    const r = opts.r ?? rand(CONFIG.mediumRadiusMin, CONFIG.mediumRadiusMax);
    const speed = opts.speed ?? rand(CONFIG.mediumSpeedMin, CONFIG.mediumSpeedMax);
    return {
      id: idCounter++,
      type: 'medium',
      x: x ?? rand(r, w - r),
      y: y ?? rand(r, h - r),
      vx: rand(-0.2,0.2)*speed,
      vy: rand(-0.2,0.2)*speed,
      r,
      color: opts.color ?? CONFIG.colors[Math.floor(Math.random()*CONFIG.colors.length)],
      speed,
      createdAt: nowMs()
    };
  }

  // merged temporary blob (created by medium-medium merge)
  function createMerged(x,y,fromIds,combinedRadius){
    return {
      id: idCounter++,
      type:'merged',
      x, y,
      vx: 0, vy: 0,
      r: combinedRadius,
      color: CONFIG.colors[Math.floor(Math.random()*CONFIG.colors.length)],
      createdAt: nowMs(),
      fromIds: fromIds.slice(),
      splitAt: nowMs() + CONFIG.mergedTTL
    };
  }

  // initialize: create only medium blobs
  function init(){
    resize();
    particles = [];
    const initial = clamp(CONFIG.mediumCountInitial, CONFIG.mediumMin, CONFIG.mediumMax);
    for(let i=0;i<initial && particles.length < CONFIG.maxTotalParticles;i++){
      particles.push(createMedium());
    }
    lastFrame = nowMs();
    requestAnimationFrame(loop);
  }

  // draw helpers
  function drawParticle(p, tNow){
    // medium or merged: larger gradient
    const pulse = 1 + Math.sin(tNow*0.002 + (p.id%9))*0.04;
    const radius = p.r * pulse;
    const grad = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,radius*1.2);
    const col0 = p.color.replace(/,\s*[\d.]+\)$/, ',0.95)');
    grad.addColorStop(0, col0);
    grad.addColorStop(0.25, p.color);
    grad.addColorStop(0.7, p.color.replace(/,\s*[\d.]+\)$/, ',0.03)'));
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(p.x,p.y,radius,0,Math.PI*2);
    ctx.fill();
  }

  // update physics
  function update(tNow, dt){
    const delta = dt / 16.6667; // normalize to 60fps unit

    // move particles
    for(let p of particles){
      if(p.type === 'medium' || p.type === 'merged'){
        // pointer influence: medium/merged follow slower
        if(pointer.active){
          const px = pointer.x * w, py = pointer.y * h;
          const dx = px - p.x, dy = py - p.y;
          const dist = Math.hypot(dx,dy) + 1e-6;
          const basePull = CONFIG.cursorFollowStrength * (p.type === 'merged' ? 0.6 : 0.85);
          p.vx += (dx/dist) * basePull * (p.speed || 0.5) * delta;
          p.vy += (dy/dist) * basePull * (p.speed || 0.5) * delta;
          if(dist < CONFIG.cursorRepelRadius){
            const repel = 0.16 * (1 - dist/CONFIG.cursorRepelRadius);
            p.vx -= (dx/dist) * repel * delta;
            p.vy -= (dy/dist) * repel * delta;
          }
        }

        // slight jitter
        p.vx += (Math.random()-0.5)*0.002*delta;
        p.vy += (Math.random()-0.5)*0.002*delta;

        const typeScale = (p.type === 'merged' ? 0.9 : 1.0);
        p.x += p.vx * 40 * typeScale * delta;
        p.y += p.vy * 40 * typeScale * delta;

        // containment bounce
        const margin = Math.max(6, p.r*0.5);
        if(p.x < margin){ p.x = margin; p.vx *= -0.45; }
        if(p.x > w - margin){ p.x = w - margin; p.vx *= -0.45; }
        if(p.y < margin){ p.y = margin; p.vy *= -0.45; }
        if(p.y > h - margin){ p.y = h - margin; p.vy *= -0.45; }
      }
    }

    // MERGING LOGIC — medium + medium only (mediums limited to mediumMax)
    const mediums = particles.filter(p => p.type === 'medium');
    const used = new Set();
    for(let i=0;i<mediums.length;i++){
      const a = mediums[i];
      if(used.has(a.id)) continue;
      for(let j=i+1;j<mediums.length;j++){
        const b = mediums[j];
        if(used.has(b.id)) continue;
        const dx = a.x - b.x, dy = a.y - b.y;
        const d = Math.hypot(dx,dy);
        if(d < (a.r + b.r) * CONFIG.mergeDistanceFactor){
          // create merged blob at midpoint, radius proportional to combined area (safe)
          const combinedRadius = Math.min(Math.sqrt(a.r*a.r + b.r*b.r) * 1.05, CONFIG.mediumRadiusMax*1.25);
          const mx = (a.x + b.x)/2, my = (a.y + b.y)/2;
          // remove a and b
          particles = particles.filter(p => p.id !== a.id && p.id !== b.id);
          used.add(a.id); used.add(b.id);
          // add merged (net particle count reduces by 1)
          particles.push(createMerged(mx,my,[a.id,b.id], combinedRadius));
          break;
        }
      }
    }

    // merged TTL -> split into bounded mediums (respect mediumMax and overall cap)
    const mergedList = particles.filter(p => p.type === 'merged');
    for(let m of mergedList){
      if(tNow >= m.splitAt){
        const pieces = randInt(CONFIG.splitPiecesMin, CONFIG.splitPiecesMax);
        const curMediumCount = particles.filter(p => p.type === 'medium').length;
        const allowedNewByMedium = Math.max(0, CONFIG.mediumMax - curMediumCount);
        const totalAfterRemove = particles.length - 1; // if we remove merged
        const availableSlots = Math.max(0, CONFIG.maxTotalParticles - totalAfterRemove);
        const spawnCount = Math.min(pieces, allowedNewByMedium || CONFIG.mediumMin, availableSlots);
        const newMediums = [];
        for(let k=0;k<spawnCount;k++){
          const angle = Math.random()*Math.PI*2;
          const distance = rand(8, Math.min(80, m.r*0.6));
          const cx = clamp(m.x + Math.cos(angle)*distance, 20, w-20);
          const cy = clamp(m.y + Math.sin(angle)*distance, 20, h-20);
          const nm = createMedium(cx, cy, { r: rand(CONFIG.mediumRadiusMin, CONFIG.mediumRadiusMax) });
          nm.vx += Math.cos(angle)*rand(0.6, 2.2);
          nm.vy += Math.sin(angle)*rand(0.6, 2.2);
          newMediums.push(nm);
        }
        particles = particles.filter(p => p.id !== m.id);
        if(newMediums.length) particles.push(...newMediums);
        else {
          // fallback: convert to a single medium if no spawn allowed and capacity permits
          if(particles.length < CONFIG.maxTotalParticles){
            const fallback = createMedium(m.x, m.y, { r: clamp(m.r*0.7, CONFIG.mediumRadiusMin, CONFIG.mediumRadiusMax) });
            particles.push(fallback);
          }
        }
      }
    }

    // SAFETY: ensure particle count <= maxTotalParticles (drop oldest merged first, then oldest medium)
    if(particles.length > CONFIG.maxTotalParticles){
      // sort by createdAt ascending (oldest first)
      particles.sort((a,b)=> (a.createdAt||0) - (b.createdAt||0));
      while(particles.length > CONFIG.maxTotalParticles) particles.shift();
    }
  }

  // render
  function render(tNow){
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle = 'rgba(6,6,6,0.12)';
    ctx.fillRect(0,0,w,h);

    ctx.globalCompositeOperation = 'screen';
    for(const p of particles){
      drawParticle(p, tNow);
    }

    // cursor visual
    if(pointer.active){
      const cx = pointer.x * w, cy = pointer.y * h;
      const gg = ctx.createRadialGradient(cx,cy,0,cx,cy,80);
      gg.addColorStop(0, 'rgba(255,255,255,0.08)');
      gg.addColorStop(0.12, 'rgba(255,255,255,0.03)');
      gg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gg;
      ctx.beginPath(); ctx.arc(cx,cy,80,0,Math.PI*2); ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath(); ctx.arc(cx,cy,4,0,Math.PI*2); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  // main loop
  function loop(tNow){
    requestAnimationFrame(loop);
    const elapsed = tNow - lastFrame;
    if(elapsed < frameInterval) return;
    lastFrame = tNow;
    update(tNow, elapsed);
    render(tNow);
  }

  // pointer handlers
  function updatePointer(e){
    let px = 0, py = 0;
    if(e.touches && e.touches.length){
      px = e.touches[0].clientX; py = e.touches[0].clientY;
    } else {
      px = e.clientX; py = e.clientY;
    }
    pointer.x = clamp(px / w, 0, 1);
    pointer.y = clamp(py / h, 0, 1);
    pointer.active = true;
  }
  function clearPointer(){ pointer.active = false; }

  // safe resize debounce
  function onResize(){
    clearTimeout(window._bgResizeTO);
    window._bgResizeTO = setTimeout(()=>{
      resize();
      for(let p of particles){
        p.x = clamp(p.x, 0, w);
        p.y = clamp(p.y, 0, h);
      }
    }, 90);
  }

  // init listeners
  window.addEventListener('mousemove', updatePointer, { passive:true });
  window.addEventListener('touchstart', updatePointer, { passive:true });
  window.addEventListener('touchmove', updatePointer, { passive:true });
  window.addEventListener('mouseleave', clearPointer, { passive:true });
  window.addEventListener('mouseout', clearPointer, { passive:true });
  window.addEventListener('touchend', clearPointer, { passive:true });
  window.addEventListener('resize', onResize, { passive:true });

  // start
  if(document.readyState==='complete' || document.readyState==='interactive') init();
  else window.addEventListener('DOMContentLoaded', init, { once:true });

})();
