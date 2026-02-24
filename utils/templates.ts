import { LayoutConfigStep } from '../types';

export interface AnimationTemplate {
    id: string;
    name: string;
    description: string;
    category: 'Tech' | 'Business' | 'Creative' | 'Education' | 'Lifestyle' | 'Growth';
    accent: string;        // CSS accent color
    icon: string;          // emoji for simplicity
    html: string;
    layoutConfig: LayoutConfigStep[];
}

// ─── Shared GSAP sync snippet used by all templates ───
const SYNC_SCRIPT = `
    window.addEventListener('message', (e) => {
        const { type, time } = e.data;
        if (type === 'timeupdate') tl.seek(time);
        if (type === 'play') tl.play();
        if (type === 'pause') tl.pause();
    });`;

export const ANIMATION_TEMPLATES: AnimationTemplate[] = [

    // ─────────────────────────────────────────────────
    // 1. DATA PULSE — Tech / SaaS
    // ─────────────────────────────────────────────────
    {
        id: 'data-pulse',
        name: 'Data Pulse',
        description: 'Animated grid, code snippets & particle effects',
        category: 'Tech',
        accent: '#00f3ff',
        icon: '⚡',
        layoutConfig: [
            { startTime: 0, endTime: 3, layoutMode: 'full-html', captionPosition: 'center' },
            { startTime: 3, endTime: 100, layoutMode: 'split', splitRatio: 0.5, captionPosition: 'top' }
        ],
        html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/TextPlugin.min.js"></script>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Oswald:wght@500;700&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; }
  body, html { margin:0; width:100%; height:100%; background:transparent; font-family:'Oswald',sans-serif; overflow:hidden; color:white; }
  #stage { position:relative; width:100%; height:100%; background: radial-gradient(ellipse at 30% 50%, #0a1628 0%, #000 80%); display:flex; align-items:center; justify-content:center; }
  .scene { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; opacity:0; }
  .title { font-size:14vmin; font-weight:700; text-align:center; line-height:1; text-transform:uppercase; background: linear-gradient(135deg, #00f3ff, #0066ff); -webkit-background-clip:text; -webkit-text-fill-color:transparent; filter: drop-shadow(0 0 30px rgba(0,243,255,0.4)); }
  .grid-container { display:flex; flex-wrap:wrap; width:70vmin; justify-content:center; gap:1vmin; }
  .cell { width:6vmin; height:6vmin; border:1px solid #1a2a4a; border-radius:4px; display:inline-flex; align-items:center; justify-content:center; font-family:'JetBrains Mono'; font-size:2.5vmin; color:#334; transition: all 0.2s; }
  .cell.active { background:#00f3ff; border-color:#00f3ff; color:#000; font-weight:700; box-shadow: 0 0 20px rgba(0,243,255,0.6); }
  .code-line { font-family:'JetBrains Mono'; font-size:2.8vmin; color:#00f3ff; opacity:0; white-space:nowrap; }
  .stat-bar { height:3vmin; background: linear-gradient(90deg, #00f3ff, #0066ff); border-radius:100px; transform-origin:left; }
  .stat-label { font-family:'JetBrains Mono'; font-size:2vmin; color:#556; margin-bottom:1vmin; }
  .stats-container { width:60vmin; }
  .stat-row { margin-bottom:2vmin; }
  canvas#particles { position:absolute; inset:0; pointer-events:none; z-index:0; }
</style>
</head>
<body>
<div id="stage">
  <canvas id="particles"></canvas>
  <div class="scene" id="s1"><div class="title">DATA<br>PULSE</div></div>
  <div class="scene" id="s2"><div class="grid-container" id="grid"></div></div>
  <div class="scene" id="s3">
    <div style="text-align:center;">
      <div class="code-line" id="c1">&gt; processing_data()</div>
      <div class="code-line" id="c2">&gt; result = analyze(stream)</div>
      <div class="code-line" id="c3">&gt; status: <span style="color:#0f0">SUCCESS</span></div>
    </div>
  </div>
  <div class="scene" id="s4">
    <div class="stats-container">
      <div class="stat-row"><div class="stat-label">THROUGHPUT</div><div class="stat-bar" id="bar1" style="width:0%"></div></div>
      <div class="stat-row"><div class="stat-label">ACCURACY</div><div class="stat-bar" id="bar2" style="width:0%"></div></div>
      <div class="stat-row"><div class="stat-label">EFFICIENCY</div><div class="stat-bar" id="bar3" style="width:0%"></div></div>
    </div>
  </div>
</div>
<script>
  gsap.registerPlugin(TextPlugin);
  const tl = gsap.timeline({ paused: true });

  // Particle background
  const cvs = document.getElementById('particles');
  const ctx = cvs.getContext('2d');
  cvs.width = window.innerWidth; cvs.height = window.innerHeight;
  const pts = Array.from({length:60}, () => ({x:Math.random()*cvs.width, y:Math.random()*cvs.height, vx:(Math.random()-0.5)*0.5, vy:(Math.random()-0.5)*0.5, r:Math.random()*2+1}));
  function drawParticles() {
    ctx.clearRect(0,0,cvs.width,cvs.height);
    pts.forEach(p => { p.x+=p.vx; p.y+=p.vy; if(p.x<0||p.x>cvs.width)p.vx*=-1; if(p.y<0||p.y>cvs.height)p.vy*=-1;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fillStyle='rgba(0,243,255,0.3)'; ctx.fill();
    });
    requestAnimationFrame(drawParticles);
  }
  drawParticles();

  // Build grid
  const grid = document.getElementById('grid');
  for(let i=0;i<80;i++){ const d=document.createElement('div'); d.className='cell'; d.textContent=Math.random()>0.5?'1':'0'; grid.appendChild(d); }

  // S1: Title
  tl.to("#s1", { opacity:1, duration:0.8, ease:"power2.out" });
  tl.to("#s1 .title", { scale:1.1, duration:0.5, yoyo:true, repeat:1 }, 0.5);
  tl.to("#s1", { opacity:0, duration:0.4 }, 2.5);

  // S2: Grid
  tl.to("#s2", { opacity:1, duration:0.5 }, 3);
  const cells = document.querySelectorAll('.cell');
  [5,12,23,34,45,56,67,72].forEach((idx, i) => {
    if(cells[idx]) tl.to(cells[idx], { className:'cell active', duration:0.15 }, 3.5 + i*0.2);
  });
  tl.to("#s2", { opacity:0, duration:0.4 }, 6);

  // S3: Code
  tl.to("#s3", { opacity:1, duration:0.3 }, 6.5);
  tl.to("#c1", { opacity:1, x:0, duration:0.3 }, 6.8);
  tl.to("#c2", { opacity:1, x:0, duration:0.3 }, 7.5);
  tl.to("#c3", { opacity:1, x:0, duration:0.3 }, 8.2);
  tl.to("#s3", { opacity:0, duration:0.4 }, 9.5);

  // S4: Stats
  tl.to("#s4", { opacity:1, duration:0.3 }, 10);
  tl.to("#bar1", { width:"85%", duration:0.8, ease:"power2.out" }, 10.3);
  tl.to("#bar2", { width:"92%", duration:0.8, ease:"power2.out" }, 10.6);
  tl.to("#bar3", { width:"78%", duration:0.8, ease:"power2.out" }, 10.9);

  ${SYNC_SCRIPT}
</script>
</body>
</html>`
    },

    // ─────────────────────────────────────────────────
    // 2. CLEAN AUTHORITY — Business / Coaching
    // ─────────────────────────────────────────────────
    {
        id: 'clean-authority',
        name: 'Clean Authority',
        description: 'Minimal typography with elegant transitions',
        category: 'Business',
        accent: '#e2c97e',
        icon: '🏛️',
        layoutConfig: [
            { startTime: 0, endTime: 4, layoutMode: 'full-html', captionPosition: 'bottom' },
            { startTime: 4, endTime: 100, layoutMode: 'split', splitRatio: 0.45, captionPosition: 'top' }
        ],
        html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Inter:wght@300;400;600&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; }
  body, html { margin:0; width:100%; height:100%; background:transparent; overflow:hidden; color:white; }
  #stage { position:relative; width:100%; height:100%; background: linear-gradient(170deg, #0f0f0f 0%, #1a1510 50%, #0f0f0f 100%); display:flex; align-items:center; justify-content:center; }
  .scene { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; opacity:0; padding:8vmin; }
  .elegant-title { font-family:'Playfair Display',serif; font-size:11vmin; font-weight:900; text-align:center; line-height:1.1; color:#fff; }
  .gold-line { width:0; height:2px; background: linear-gradient(90deg, transparent, #e2c97e, transparent); margin:3vmin auto; }
  .subtitle { font-family:'Inter',sans-serif; font-size:3.5vmin; color:#888; text-align:center; letter-spacing:0.3em; text-transform:uppercase; opacity:0; }
  .quote-mark { font-family:'Playfair Display',serif; font-size:20vmin; color:#e2c97e; opacity:0.15; line-height:1; }
  .quote-text { font-family:'Playfair Display',serif; font-size:5vmin; color:#ddd; text-align:center; font-style:italic; max-width:80%; line-height:1.6; }
  .bullet { font-family:'Inter',sans-serif; font-size:3.5vmin; color:#999; padding:2vmin 0; border-bottom:1px solid #222; display:flex; align-items:center; gap:3vmin; opacity:0; transform:translateX(-5vmin); }
  .bullet-num { font-family:'Playfair Display',serif; font-size:6vmin; font-weight:700; color:#e2c97e; }
  .bullets-container { width:75vmin; }
</style>
</head>
<body>
<div id="stage">
  <div class="scene" id="s1">
    <div class="elegant-title">Authority<br>Builds<br>Trust</div>
    <div class="gold-line" id="gold1"></div>
    <div class="subtitle" id="sub1">A Framework for Leaders</div>
  </div>
  <div class="scene" id="s2">
    <div class="quote-mark">"</div>
    <div class="quote-text" id="quote">Leadership is not about being in charge. It is about taking care of those in your charge.</div>
  </div>
  <div class="scene" id="s3">
    <div class="bullets-container">
      <div class="bullet" id="b1"><span class="bullet-num">01</span><span>Define your core message</span></div>
      <div class="bullet" id="b2"><span class="bullet-num">02</span><span>Build consistent visibility</span></div>
      <div class="bullet" id="b3"><span class="bullet-num">03</span><span>Deliver undeniable value</span></div>
    </div>
  </div>
</div>
<script>
  const tl = gsap.timeline({ paused: true });

  // S1: Title reveal
  tl.to("#s1", { opacity:1, duration:0.6 });
  tl.from(".elegant-title", { y:30, opacity:0, duration:1, ease:"power3.out" }, 0.2);
  tl.to("#gold1", { width:"50vmin", duration:1.2, ease:"power2.inOut" }, 0.8);
  tl.to("#sub1", { opacity:1, duration:0.8 }, 1.5);
  tl.to("#s1", { opacity:0, duration:0.5 }, 3.5);

  // S2: Quote
  tl.to("#s2", { opacity:1, duration:0.5 }, 4);
  tl.from("#quote", { opacity:0, y:20, duration:1, ease:"power2.out" }, 4.5);
  tl.to("#s2", { opacity:0, duration:0.5 }, 7);

  // S3: Bullets
  tl.to("#s3", { opacity:1, duration:0.3 }, 7.5);
  tl.to("#b1", { opacity:1, x:0, duration:0.5, ease:"power2.out" }, 8);
  tl.to("#b2", { opacity:1, x:0, duration:0.5, ease:"power2.out" }, 8.8);
  tl.to("#b3", { opacity:1, x:0, duration:0.5, ease:"power2.out" }, 9.6);

  ${SYNC_SCRIPT}
</script>
</body>
</html>`
    },

    // ─────────────────────────────────────────────────
    // 3. HYPE MACHINE — Fitness / Motivation
    // ─────────────────────────────────────────────────
    {
        id: 'hype-machine',
        name: 'Hype Machine',
        description: 'Bold kinetic text, high-energy bursts',
        category: 'Lifestyle',
        accent: '#ff3366',
        icon: '🔥',
        layoutConfig: [
            { startTime: 0, endTime: 2, layoutMode: 'full-html', captionPosition: 'hidden' },
            { startTime: 2, endTime: 100, layoutMode: 'split', splitRatio: 0.55, captionPosition: 'bottom' }
        ],
        html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@800;900&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; }
  body, html { margin:0; width:100%; height:100%; background:transparent; overflow:hidden; color:white; }
  #stage { position:relative; width:100%; height:100%; background:#000; display:flex; align-items:center; justify-content:center; }
  .scene { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; opacity:0; }
  .mega-text { font-family:'Inter',sans-serif; font-weight:900; font-size:18vmin; text-transform:uppercase; line-height:0.9; text-align:center; }
  .red { color:#ff3366; }
  .white { color:#fff; }
  .flash { position:absolute; inset:0; background:#ff3366; opacity:0; }
  .counter { font-family:'Bebas Neue',sans-serif; font-size:40vmin; color:#ff3366; text-shadow: 0 0 60px rgba(255,51,102,0.5); }
  .streak-line { position:absolute; width:120%; height:3px; background: linear-gradient(90deg, transparent, #ff3366, transparent); left:-10%; }
  .energy-ring { width:50vmin; height:50vmin; border:3px solid #ff3366; border-radius:50%; position:absolute; opacity:0; }
  .bottom-tag { position:absolute; bottom:6vmin; font-family:'Inter',sans-serif; font-weight:800; font-size:3vmin; letter-spacing:0.5em; color:#ff3366; text-transform:uppercase; opacity:0; }
</style>
</head>
<body>
<div id="stage">
  <div class="flash" id="flash1"></div>
  <div class="flash" id="flash2"></div>
  <div class="energy-ring" id="ring1"></div>
  <div class="streak-line" id="streak1" style="top:30%"></div>
  <div class="streak-line" id="streak2" style="top:70%"></div>
  <div class="scene" id="s1"><div class="counter" id="countdown">3</div></div>
  <div class="scene" id="s2"><div class="mega-text"><span class="white">NO</span><br><span class="red">EXCUSES</span></div></div>
  <div class="scene" id="s3"><div class="mega-text"><span class="red">PUSH</span><br><span class="white">HARDER</span></div></div>
  <div class="scene" id="s4"><div class="mega-text" style="font-size:14vmin"><span class="white">LEVEL</span><br><span class="red">UP</span></div></div>
  <div class="bottom-tag" id="tag">Every. Single. Day.</div>
</div>
<script>
  const tl = gsap.timeline({ paused: true });

  // Countdown
  tl.to("#s1", { opacity:1, duration:0.1 });
  tl.to("#flash1", { opacity:0.8, duration:0.05 }, 0);
  tl.to("#flash1", { opacity:0, duration:0.15 }, 0.05);
  tl.to("#countdown", { text:"2", duration:0.01 }, 0.8);
  tl.to("#flash1", { opacity:0.6, duration:0.05 }, 0.8);
  tl.to("#flash1", { opacity:0, duration:0.15 }, 0.85);
  tl.to("#countdown", { text:"1", duration:0.01 }, 1.6);
  tl.to("#flash1", { opacity:0.6, duration:0.05 }, 1.6);
  tl.to("#flash1", { opacity:0, duration:0.15 }, 1.65);
  tl.to("#s1", { opacity:0, duration:0.1 }, 2.3);

  // NO EXCUSES
  tl.to("#s2", { opacity:1, duration:0.1 }, 2.4);
  tl.from("#s2 .mega-text", { scale:3, opacity:0, rotation:5, duration:0.3, ease:"back.out(2)" }, 2.4);
  tl.to("#flash2", { opacity:0.5, duration:0.05 }, 2.4);
  tl.to("#flash2", { opacity:0, duration:0.2 }, 2.45);
  tl.to("#streak1", { x:"120%", duration:0.4 }, 2.6);
  tl.to("#s2", { opacity:0, duration:0.15 }, 4.5);

  // PUSH HARDER
  tl.to("#s3", { opacity:1, duration:0.1 }, 4.7);
  tl.from("#s3 .mega-text", { x:-200, opacity:0, duration:0.3, ease:"power4.out" }, 4.7);
  tl.to("#ring1", { opacity:0.5, scale:2, duration:0.8, ease:"power2.out" }, 4.7);
  tl.to("#ring1", { opacity:0, duration:0.3 }, 5.5);
  tl.to("#streak2", { x:"-120%", duration:0.4 }, 5);
  tl.to("#s3", { opacity:0, duration:0.15 }, 7);

  // LEVEL UP
  tl.to("#s4", { opacity:1, duration:0.1 }, 7.2);
  tl.from("#s4 .mega-text", { y:100, opacity:0, duration:0.3, ease:"power4.out" }, 7.2);
  tl.to("#flash1", { opacity:0.3, duration:0.05 }, 7.2);
  tl.to("#flash1", { opacity:0, duration:0.3 }, 7.25);
  tl.to("#tag", { opacity:1, duration:0.5 }, 8);

  ${SYNC_SCRIPT}
</script>
</body>
</html>`
    },

    // ─────────────────────────────────────────────────
    // 4. EDU MOTION — Education / Explainers
    // ─────────────────────────────────────────────────
    {
        id: 'edu-motion',
        name: 'Edu Motion',
        description: 'Whiteboard-style diagrams that build step by step',
        category: 'Education',
        accent: '#4ade80',
        icon: '📚',
        layoutConfig: [
            { startTime: 0, endTime: 3, layoutMode: 'full-html', captionPosition: 'bottom' },
            { startTime: 3, endTime: 100, layoutMode: 'split', splitRatio: 0.55, captionPosition: 'top' }
        ],
        html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
<link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; }
  body, html { margin:0; width:100%; height:100%; background:transparent; overflow:hidden; color:white; }
  #stage { position:relative; width:100%; height:100%; background: #0a0f1a; display:flex; align-items:center; justify-content:center; }
  .scene { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; opacity:0; padding:6vmin; }
  .board-title { font-family:'Caveat',cursive; font-size:10vmin; color:#4ade80; text-align:center; }
  .board-subtitle { font-family:'Inter',sans-serif; font-size:3vmin; color:#666; margin-top:1vmin; }
  .diagram { position:relative; width:70vmin; height:50vmin; }
  .node { position:absolute; background:#111827; border:2px solid #4ade80; border-radius:12px; padding:2vmin 3vmin; font-family:'Inter',sans-serif; font-size:2.8vmin; font-weight:600; color:#fff; opacity:0; text-align:center; box-shadow: 0 0 20px rgba(74,222,128,0.15); }
  .arrow { position:absolute; background:#4ade80; opacity:0; }
  .arrow-h { height:2px; transform-origin:left; }
  .arrow-v { width:2px; transform-origin:top; }
  .step-label { position:absolute; font-family:'Caveat',cursive; font-size:4vmin; color:#4ade80; opacity:0; }
  .check-container { display:flex; flex-direction:column; gap:2.5vmin; width:65vmin; }
  .check-item { display:flex; align-items:center; gap:2vmin; font-family:'Inter',sans-serif; font-size:3.2vmin; color:#ccc; opacity:0; transform:translateX(-3vmin); }
  .check-box { width:4vmin; height:4vmin; border:2px solid #333; border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:2.5vmin; }
  .check-box.done { border-color:#4ade80; color:#4ade80; background:rgba(74,222,128,0.1); }
</style>
</head>
<body>
<div id="stage">
  <div class="scene" id="s1">
    <div class="board-title">Let's Break<br>This Down</div>
    <div class="board-subtitle">Step by step explanation</div>
  </div>
  <div class="scene" id="s2">
    <div class="diagram">
      <div class="node" id="n1" style="top:0; left:50%; transform:translateX(-50%)">Input Data</div>
      <div class="arrow arrow-v" id="a1" style="top:9vmin; left:50%; height:0"></div>
      <div class="node" id="n2" style="top:14vmin; left:20%">Process A</div>
      <div class="node" id="n3" style="top:14vmin; right:20%">Process B</div>
      <div class="arrow arrow-v" id="a2" style="top:23vmin; left:32%; height:0"></div>
      <div class="arrow arrow-v" id="a3" style="top:23vmin; right:32%; height:0"></div>
      <div class="node" id="n4" style="bottom:5vmin; left:50%; transform:translateX(-50%)">Output ✨</div>
      <div class="step-label" id="sl1" style="top:2vmin; right:5vmin">Step 1</div>
      <div class="step-label" id="sl2" style="top:16vmin; left:2vmin">Step 2</div>
      <div class="step-label" id="sl3" style="bottom:8vmin; right:5vmin">Step 3</div>
    </div>
  </div>
  <div class="scene" id="s3">
    <div class="check-container">
      <div class="check-item" id="ch1"><div class="check-box done">✓</div><span>Understand the input</span></div>
      <div class="check-item" id="ch2"><div class="check-box done">✓</div><span>Apply transformation</span></div>
      <div class="check-item" id="ch3"><div class="check-box done">✓</div><span>Validate the output</span></div>
      <div class="check-item" id="ch4"><div class="check-box done">✓</div><span>Ship it! 🚀</span></div>
    </div>
  </div>
</div>
<script>
  const tl = gsap.timeline({ paused: true });

  // S1: Title
  tl.to("#s1", { opacity:1, duration:0.5 });
  tl.from(".board-title", { y:20, opacity:0, duration:0.6, ease:"power2.out" }, 0.3);
  tl.from(".board-subtitle", { opacity:0, duration:0.5 }, 0.8);
  tl.to("#s1", { opacity:0, duration:0.4 }, 2.8);

  // S2: Diagram
  tl.to("#s2", { opacity:1, duration:0.3 }, 3.2);
  tl.to("#n1", { opacity:1, duration:0.3 }, 3.5);
  tl.to("#sl1", { opacity:1, duration:0.3 }, 3.5);
  tl.to("#a1", { height:"5vmin", duration:0.4 }, 4);
  tl.to("#n2", { opacity:1, duration:0.3 }, 4.5);
  tl.to("#n3", { opacity:1, duration:0.3 }, 4.5);
  tl.to("#sl2", { opacity:1, duration:0.3 }, 4.8);
  tl.to("#a2", { height:"8vmin", duration:0.4 }, 5.3);
  tl.to("#a3", { height:"8vmin", duration:0.4 }, 5.3);
  tl.to("#n4", { opacity:1, duration:0.3 }, 5.8);
  tl.to("#sl3", { opacity:1, duration:0.3 }, 6);
  tl.to("#s2", { opacity:0, duration:0.4 }, 7.5);

  // S3: Checklist
  tl.to("#s3", { opacity:1, duration:0.3 }, 8);
  tl.to("#ch1", { opacity:1, x:0, duration:0.4, ease:"power2.out" }, 8.3);
  tl.to("#ch2", { opacity:1, x:0, duration:0.4, ease:"power2.out" }, 8.8);
  tl.to("#ch3", { opacity:1, x:0, duration:0.4, ease:"power2.out" }, 9.3);
  tl.to("#ch4", { opacity:1, x:0, duration:0.4, ease:"power2.out" }, 9.8);

  ${SYNC_SCRIPT}
</script>
</body>
</html>`
    },

    // ─────────────────────────────────────────────────
    // 5. NEWS DESK — Current Events / Commentary
    // ─────────────────────────────────────────────────
    {
        id: 'news-desk',
        name: 'News Desk',
        description: 'Lower thirds, breaking tickers & split screens',
        category: 'Business',
        accent: '#ef4444',
        icon: '📰',
        layoutConfig: [
            { startTime: 0, endTime: 2, layoutMode: 'full-html', captionPosition: 'hidden' },
            { startTime: 2, endTime: 100, layoutMode: 'split', splitRatio: 0.4, captionPosition: 'top' }
        ],
        html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; }
  body, html { margin:0; width:100%; height:100%; background:transparent; overflow:hidden; font-family:'Inter',sans-serif; color:white; }
  #stage { position:relative; width:100%; height:100%; background:linear-gradient(180deg, #0a0a0a 0%, #111 100%); }
  .breaking-bar { position:absolute; top:0; left:0; right:0; height:8vmin; background:#ef4444; display:flex; align-items:center; padding:0 4vmin; z-index:10; transform:translateY(-100%); }
  .breaking-text { font-weight:900; font-size:3vmin; text-transform:uppercase; letter-spacing:0.2em; white-space:nowrap; }
  .breaking-label { background:#000; color:#ef4444; padding:1vmin 2vmin; font-weight:900; font-size:2.5vmin; margin-right:3vmin; letter-spacing:0.15em; }
  .headline { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); font-size:8vmin; font-weight:900; text-align:center; text-transform:uppercase; line-height:1.1; opacity:0; }
  .lower-third { position:absolute; bottom:12vmin; left:4vmin; right:4vmin; opacity:0; }
  .lt-name { background:#ef4444; padding:1.5vmin 3vmin; font-weight:700; font-size:3.5vmin; display:inline-block; }
  .lt-title { background:#1a1a1a; padding:1.5vmin 3vmin; font-size:2.5vmin; color:#999; display:inline-block; border-left:2px solid #ef4444; }
  .ticker { position:absolute; bottom:0; left:0; right:0; height:6vmin; background:#111; border-top:2px solid #ef4444; display:flex; align-items:center; overflow:hidden; }
  .ticker-content { white-space:nowrap; font-size:2.5vmin; color:#888; letter-spacing:0.05em; }
  .timestamp { position:absolute; top:10vmin; right:4vmin; font-size:2vmin; color:#555; font-variant-numeric:tabular-nums; opacity:0; }
  .data-panel { position:absolute; top:12vmin; left:4vmin; background:rgba(20,20,20,0.9); border:1px solid #222; border-radius:8px; padding:3vmin; opacity:0; }
  .data-row { display:flex; justify-content:space-between; gap:6vmin; font-size:2.5vmin; padding:1vmin 0; border-bottom:1px solid #1a1a1a; }
  .data-label { color:#666; }
  .data-value { color:#ef4444; font-weight:700; }
</style>
</head>
<body>
<div id="stage">
  <div class="breaking-bar" id="breaking">
    <span class="breaking-label">BREAKING</span>
    <span class="breaking-text">This changes everything — Here's what you need to know</span>
  </div>
  <div class="headline" id="headline">The<br>Big<br>Story</div>
  <div class="timestamp" id="time">LIVE • NOW</div>
  <div class="data-panel" id="panel">
    <div class="data-row"><span class="data-label">Impact</span><span class="data-value">HIGH</span></div>
    <div class="data-row"><span class="data-label">Relevance</span><span class="data-value">CRITICAL</span></div>
    <div class="data-row"><span class="data-label">Timeline</span><span class="data-value">IMMEDIATE</span></div>
  </div>
  <div class="lower-third" id="lt">
    <span class="lt-name">Your Name</span><span class="lt-title">Topic Expert & Analyst</span>
  </div>
  <div class="ticker" id="ticker">
    <div class="ticker-content" id="ticker-text">⚡ TRENDING NOW — Key insights and analysis you need to hear — Stay informed — Subscribe for daily updates ⚡</div>
  </div>
</div>
<script>
  const tl = gsap.timeline({ paused: true });

  // Breaking bar slides down
  tl.to("#breaking", { y:0, duration:0.3, ease:"power2.out" }, 0);
  tl.to("#headline", { opacity:1, duration:0.5, ease:"power2.out" }, 0.5);
  tl.from("#headline", { scale:0.8, duration:0.5, ease:"back.out(1.5)" }, 0.5);

  // Headline out, lower third in
  tl.to("#headline", { opacity:0, y:-30, duration:0.3 }, 2.5);
  tl.to("#time", { opacity:1, duration:0.3 }, 3);
  tl.to("#panel", { opacity:1, duration:0.5 }, 3.5);
  tl.to("#lt", { opacity:1, duration:0.3 }, 4);
  tl.from("#lt", { x:-50, duration:0.3, ease:"power2.out" }, 4);

  // Ticker scroll
  tl.to("#ticker-text", { x:"-50%", duration:15, ease:"none", repeat:-1 }, 0);

  ${SYNC_SCRIPT}
</script>
</body>
</html>`
    },

    // ─────────────────────────────────────────────────
    // 6. NEON STUDIO — Creative / Artistic
    // ─────────────────────────────────────────────────
    {
        id: 'neon-studio',
        name: 'Neon Studio',
        description: 'Cyber glow, neon grids & retro-futurism',
        category: 'Creative',
        accent: '#a855f7',
        icon: '🌈',
        layoutConfig: [
            { startTime: 0, endTime: 3, layoutMode: 'full-html', captionPosition: 'hidden' },
            { startTime: 3, endTime: 100, layoutMode: 'split', splitRatio: 0.5, captionPosition: 'center' }
        ],
        html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; }
  body, html { margin:0; width:100%; height:100%; background:transparent; overflow:hidden; color:white; }
  #stage { position:relative; width:100%; height:100%; background:#050510; display:flex; align-items:center; justify-content:center; perspective:800px; }
  .scene { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; opacity:0; }
  .neon-title { font-family:'Orbitron',sans-serif; font-size:12vmin; font-weight:900; text-align:center; color:#fff; text-shadow: 0 0 10px #a855f7, 0 0 40px #a855f7, 0 0 80px #a855f7; }
  .grid-floor { position:absolute; bottom:0; left:-10%; width:120%; height:40%; background: repeating-linear-gradient(90deg, transparent, transparent 9%, rgba(168,85,247,0.1) 9%, rgba(168,85,247,0.1) 9.5%), repeating-linear-gradient(0deg, transparent, transparent 18%, rgba(168,85,247,0.08) 18%, rgba(168,85,247,0.08) 19%); transform: perspective(300px) rotateX(45deg); transform-origin: bottom; }
  .hex { width:12vmin; height:12vmin; border:2px solid rgba(168,85,247,0.3); display:flex; align-items:center; justify-content:center; font-family:'Orbitron',sans-serif; font-size:3vmin; opacity:0; clip-path:polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%); background:rgba(168,85,247,0.05); }
  .hex.glow { border-color:#a855f7; background:rgba(168,85,247,0.2); box-shadow:0 0 30px rgba(168,85,247,0.3); color:#a855f7; }
  .hex-grid { display:flex; flex-wrap:wrap; gap:2vmin; justify-content:center; width:50vmin; }
  .scan-line { position:absolute; left:0; right:0; height:2px; background: linear-gradient(90deg, transparent, #a855f7, transparent); opacity:0; }
  .orb { position:absolute; width:30vmin; height:30vmin; border-radius:50%; background: radial-gradient(circle, rgba(168,85,247,0.3) 0%, transparent 70%); filter:blur(20px); opacity:0; }
</style>
</head>
<body>
<div id="stage">
  <div class="grid-floor"></div>
  <div class="orb" id="orb1" style="top:10%; left:20%"></div>
  <div class="orb" id="orb2" style="bottom:20%; right:10%"></div>
  <div class="scan-line" id="scan" style="top:0"></div>
  <div class="scene" id="s1"><div class="neon-title">NEON<br>STUDIO</div></div>
  <div class="scene" id="s2">
    <div class="hex-grid">
      <div class="hex" id="h1">01</div><div class="hex" id="h2">02</div><div class="hex" id="h3">03</div>
      <div class="hex" id="h4">04</div><div class="hex" id="h5">05</div><div class="hex" id="h6">06</div>
    </div>
  </div>
  <div class="scene" id="s3">
    <div class="neon-title" style="font-size:8vmin">CREATE<br>WITHOUT<br>LIMITS</div>
  </div>
</div>
<script>
  const tl = gsap.timeline({ paused: true });

  // Ambient
  tl.to("#orb1", { opacity:1, duration:1 }, 0);
  tl.to("#orb2", { opacity:1, duration:1 }, 0.5);
  tl.to("#orb1", { x:30, y:20, duration:8, yoyo:true, repeat:-1, ease:"sine.inOut" }, 0);
  tl.to("#scan", { opacity:0.5, top:"100%", duration:3, ease:"none", repeat:-1 }, 0);

  // S1: Title
  tl.to("#s1", { opacity:1, duration:0.5 }, 0);
  tl.from(".neon-title", { scale:0.5, opacity:0, duration:0.8, ease:"elastic.out(1,0.5)" }, 0.2);
  tl.to("#s1", { opacity:0, duration:0.4 }, 2.5);

  // S2: Hexagons
  tl.to("#s2", { opacity:1, duration:0.3 }, 3);
  ["#h1","#h2","#h3","#h4","#h5","#h6"].forEach((h, i) => {
    tl.to(h, { opacity:1, duration:0.2, ease:"power2.out" }, 3.3 + i*0.3);
    if(i % 2 === 0) tl.to(h, { className:"hex glow", duration:0.1 }, 3.5 + i*0.3);
  });
  tl.to("#s2", { opacity:0, duration:0.4 }, 6);

  // S3: Final
  tl.to("#s3", { opacity:1, duration:0.5 }, 6.5);
  tl.from("#s3 .neon-title", { y:50, opacity:0, duration:0.6, ease:"power3.out" }, 6.8);

  ${SYNC_SCRIPT}
</script>
</body>
</html>`
    },

    // ─────────────────────────────────────────────────
    // 7. MINIMAL FOCUS — Personal Brand / Thought Leadership
    // ─────────────────────────────────────────────────
    {
        id: 'minimal-focus',
        name: 'Minimal Focus',
        description: 'Ultra-clean single-word emphasis',
        category: 'Business',
        accent: '#f5f5f5',
        icon: '✦',
        layoutConfig: [
            { startTime: 0, endTime: 2, layoutMode: 'full-html', captionPosition: 'hidden' },
            { startTime: 2, endTime: 100, layoutMode: 'split', splitRatio: 0.4, captionPosition: 'top' }
        ],
        html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;800&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; }
  body, html { margin:0; width:100%; height:100%; background:transparent; overflow:hidden; color:white; font-family:'Sora',sans-serif; }
  #stage { position:relative; width:100%; height:100%; background:#0a0a0a; display:flex; align-items:center; justify-content:center; }
  .scene { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; opacity:0; padding:8vmin; }
  .big-word { font-size:18vmin; font-weight:800; letter-spacing:-0.5vmin; line-height:1; }
  .thin-line { width:0; height:1px; background:white; margin:3vmin 0; }
  .small-text { font-size:3vmin; font-weight:300; color:#666; letter-spacing:0.3em; text-transform:uppercase; opacity:0; }
  .word-stack { text-align:center; }
  .word-stack span { display:block; font-size:10vmin; font-weight:800; line-height:1.15; opacity:0; transform:translateY(3vmin); }
  .accent { color:#999; font-weight:300; }
  .dot { width:1.5vmin; height:1.5vmin; background:white; border-radius:50%; margin:4vmin auto; opacity:0; }
  .number { font-size:30vmin; font-weight:800; color:rgba(255,255,255,0.03); position:absolute; }
</style>
</head>
<body>
<div id="stage">
  <div class="scene" id="s1">
    <div class="number" style="top:5%; left:5%">01</div>
    <div class="big-word">Focus.</div>
    <div class="thin-line" id="line1"></div>
    <div class="small-text" id="st1">The only strategy that matters</div>
  </div>
  <div class="scene" id="s2">
    <div class="number" style="bottom:10%; right:5%">02</div>
    <div class="word-stack">
      <span id="w1">Think</span>
      <span id="w2" class="accent">less.</span>
      <span id="w3">Do</span>
      <span id="w4" class="accent">more.</span>
    </div>
  </div>
  <div class="scene" id="s3">
    <div class="big-word" style="font-size:12vmin">Simple<br>wins.</div>
    <div class="dot" id="dot1"></div>
  </div>
</div>
<script>
  const tl = gsap.timeline({ paused: true });

  // S1
  tl.to("#s1", { opacity:1, duration:0.3 });
  tl.from(".big-word", { y:30, opacity:0, duration:0.6, ease:"power3.out" }, 0.2);
  tl.to("#line1", { width:"30vmin", duration:0.8, ease:"power2.inOut" }, 0.6);
  tl.to("#st1", { opacity:1, duration:0.5 }, 1);
  tl.to("#s1", { opacity:0, duration:0.3 }, 3);

  // S2
  tl.to("#s2", { opacity:1, duration:0.2 }, 3.3);
  tl.to("#w1", { opacity:1, y:0, duration:0.4, ease:"power2.out" }, 3.5);
  tl.to("#w2", { opacity:1, y:0, duration:0.4, ease:"power2.out" }, 4);
  tl.to("#w3", { opacity:1, y:0, duration:0.4, ease:"power2.out" }, 4.5);
  tl.to("#w4", { opacity:1, y:0, duration:0.4, ease:"power2.out" }, 5);
  tl.to("#s2", { opacity:0, duration:0.3 }, 6.5);

  // S3
  tl.to("#s3", { opacity:1, duration:0.3 }, 7);
  tl.from("#s3 .big-word", { opacity:0, scale:0.9, duration:0.5, ease:"power2.out" }, 7.2);
  tl.to("#dot1", { opacity:1, duration:0.3 }, 7.8);

  ${SYNC_SCRIPT}
</script>
</body>
</html>`
    },

    // ─────────────────────────────────────────────────
    // 8. VIRAL HOOK — Growth / Marketing
    // ─────────────────────────────────────────────────
    {
        id: 'viral-hook',
        name: 'Viral Hook',
        description: 'Pattern interrupts, countdowns & fast cuts',
        category: 'Growth',
        accent: '#f59e0b',
        icon: '🚀',
        layoutConfig: [
            { startTime: 0, endTime: 3, layoutMode: 'full-html', captionPosition: 'hidden' },
            { startTime: 3, endTime: 100, layoutMode: 'split', splitRatio: 0.5, captionPosition: 'bottom' }
        ],
        html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/TextPlugin.min.js"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; }
  body, html { margin:0; width:100%; height:100%; background:transparent; overflow:hidden; color:white; font-family:'Inter',sans-serif; }
  #stage { position:relative; width:100%; height:100%; background:#000; display:flex; align-items:center; justify-content:center; }
  .scene { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; opacity:0; padding:6vmin; }
  .hook-text { font-size:9vmin; font-weight:900; text-align:center; line-height:1.15; text-transform:uppercase; }
  .yellow { color:#f59e0b; }
  .flash-bg { position:absolute; inset:0; background:#f59e0b; opacity:0; z-index:0; }
  .progress-bar { position:absolute; bottom:8vmin; left:10%; right:10%; height:1vmin; background:#222; border-radius:100px; overflow:hidden; }
  .progress-fill { height:100%; width:0%; background: linear-gradient(90deg, #f59e0b, #ef4444); border-radius:100px; }
  .emoji-float { position:absolute; font-size:8vmin; opacity:0; }
  .cta-box { background:#f59e0b; color:#000; font-weight:900; font-size:4vmin; padding:2.5vmin 6vmin; border-radius:100px; text-transform:uppercase; opacity:0; transform:scale(0.5); letter-spacing:0.1em; }
  .stat-number { font-size:20vmin; font-weight:900; color:#f59e0b; text-shadow: 0 0 40px rgba(245,158,11,0.3); }
  .stat-label { font-size:3.5vmin; color:#777; text-transform:uppercase; letter-spacing:0.3em; margin-top:1vmin; }
</style>
</head>
<body>
<div id="stage">
  <div class="flash-bg" id="flash"></div>
  <div class="emoji-float" id="e1" style="top:20%; left:15%">🔥</div>
  <div class="emoji-float" id="e2" style="top:30%; right:15%">💡</div>
  <div class="emoji-float" id="e3" style="bottom:25%; left:20%">🚀</div>
  <div class="scene" id="s1" style="z-index:2">
    <div class="hook-text"><span class="yellow">STOP</span><br>SCROLLING</div>
  </div>
  <div class="scene" id="s2" style="z-index:2">
    <div class="stat-number" id="stat-num">97%</div>
    <div class="stat-label">of people don't know this</div>
  </div>
  <div class="scene" id="s3" style="z-index:2">
    <div class="hook-text" style="font-size:7vmin"><span class="yellow">Here's the<br>secret</span> nobody<br>talks about</div>
  </div>
  <div class="scene" id="s4" style="z-index:2">
    <div class="cta-box" id="cta">Follow for more →</div>
  </div>
  <div class="progress-bar" style="z-index:5"><div class="progress-fill" id="prog"></div></div>
</div>
<script>
  gsap.registerPlugin(TextPlugin);
  const tl = gsap.timeline({ paused: true });

  // S1: Hook
  tl.to("#s1", { opacity:1, duration:0.1 });
  tl.to("#flash", { opacity:0.8, duration:0.05 }, 0);
  tl.to("#flash", { opacity:0, duration:0.15 }, 0.05);
  tl.from("#s1 .hook-text", { scale:3, rotation:5, duration:0.25, ease:"back.out(2)" }, 0);
  tl.to("#e1", { opacity:1, y:-20, duration:0.8, ease:"power2.out" }, 0.3);
  tl.to("#s1", { opacity:0, duration:0.15 }, 2.5);

  // S2: Stat
  tl.to("#s2", { opacity:1, duration:0.15 }, 2.7);
  tl.from("#stat-num", { scale:0, rotation:-10, duration:0.3, ease:"back.out(3)" }, 2.7);
  tl.to("#e2", { opacity:1, y:-15, duration:0.6 }, 3);
  tl.to("#s2", { opacity:0, duration:0.15 }, 5);

  // S3: Reveal
  tl.to("#s3", { opacity:1, duration:0.15 }, 5.2);
  tl.from("#s3 .hook-text", { y:50, opacity:0, duration:0.4, ease:"power3.out" }, 5.2);
  tl.to("#e3", { opacity:1, y:-20, duration:0.6 }, 5.5);
  tl.to("#s3", { opacity:0, duration:0.15 }, 7.5);

  // S4: CTA
  tl.to("#s4", { opacity:1, duration:0.1 }, 7.7);
  tl.to("#cta", { opacity:1, scale:1, duration:0.4, ease:"elastic.out(1,0.4)" }, 7.7);
  tl.to("#cta", { scale:1.05, duration:0.3, yoyo:true, repeat:-1, ease:"sine.inOut" }, 8.2);

  // Progress bar
  tl.to("#prog", { width:"100%", duration:10, ease:"none" }, 0);

  ${SYNC_SCRIPT}
</script>
</body>
</html>`
    }
];
