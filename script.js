(() => {
  "use strict";

  // ─── Constants ───────────────────────────────────────────────
  const IDENTITY_COLORS = [
    { name: "Red",     r: 255, g: 0,   b: 0   },
    { name: "Lime",    r: 0,   g: 255, b: 0   },
    { name: "Blue",    r: 0,   g: 0,   b: 255 },
    { name: "Yellow",  r: 255, g: 255, b: 0   },
    { name: "Magenta", r: 255, g: 0,   b: 255 },
    { name: "Cyan",    r: 0,   g: 255, b: 255 },
    { name: "White",   r: 255, g: 255, b: 255 },
    { name: "Black",   r: 0,   g: 0,   b: 0   },
  ];

  // Direction of channel adjustment for each Identity
  const ADJUST = {
    Red:     [+1, -1, -1],
    Lime:    [-1, +1, -1],
    Blue:    [-1, -1, +1],
    Yellow:  [+1, +1, -1],
    Magenta: [+1, -1, +1],
    Cyan:    [-1, +1, +1],
    White:   [+1, +1, +1],
    Black:   [-1, -1, -1],
  };

  const DODE_COUNT = 32;
  const RADIUS = 14;
  const ADJUST_STEP = 12;
  const GAME_DURATION = 120;
  const PAUSE_MIN = 0.25;
  const PAUSE_MAX = 0.75;
  const COOLDOWN_MIN = 2;
  const COOLDOWN_MAX = 4;

  function clamp(v, lo = 0, hi = 255) {
    return Math.max(lo, Math.min(hi, v));
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function randInt(min, max) {
    return Math.floor(rand(min, max + 1));
  }

  function dist(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function identityFromIdeology(r, g, b) {
    const ir = r < 128 ? 0 : 255;
    const ig = g < 128 ? 0 : 255;
    const ib = b < 128 ? 0 : 255;
    return IDENTITY_COLORS.find(c => c.r === ir && c.g === ig && c.b === ib)
        || IDENTITY_COLORS[0];
  }

  function conviction(ideology, identity) {
    return Math.abs(ideology.r - identity.r)
         + Math.abs(ideology.g - identity.g)
         + Math.abs(ideology.b - identity.b);
  }

  function averageRoundUp(a, b) {
    return Math.ceil((a + b) / 2);
  }

  const DEFAULT_URGENCY = 128;
  const BASE_SPEED = 50 + DEFAULT_URGENCY * (150 / 255);

  class Dode {
    constructor(x, y, ideology, influence, isPlayer = false) {
      this.x = x;
      this.y = y;
      this.ideology = { r: ideology.r, g: ideology.g, b: ideology.b };
      this.influence = influence;
      this.isPlayer = isPlayer;
      this.recalc();
      this.targetX = x;
      this.targetY = y;
      this.pauseUntil = 0;
      this.cooldownUntil = 0;
      this.bumpCounts = new Map();
      this.dodettePartner = null;
      this.id = Dode.nextId++;
      this.radius = RADIUS;
    }

    static nextId = 0;

    recalc() {
      this.identity = identityFromIdeology(this.ideology.r, this.ideology.g, this.ideology.b);
      this.conviction = conviction(this.ideology, this.identity);
      this.urgency = DEFAULT_URGENCY;
      this.speed = BASE_SPEED;
    }

    setTarget(tx, ty) {
      this.targetX = tx;
      this.targetY = ty;
    }

    pickRandomTarget(w, h) {
      const margin = this.radius + 8;
      this.targetX = rand(margin, Math.max(margin + 1, w - margin));
      this.targetY = rand(margin, Math.max(margin + 1, h - margin));
    }

    isPaused(now) {
      return now < this.pauseUntil;
    }

    isInvulnerable(now) {
      return now < this.cooldownUntil;
    }

    startBumpEffects(now) {
      this.pauseUntil = now + rand(PAUSE_MIN, PAUSE_MAX);
      this.cooldownUntil = now + rand(COOLDOWN_MIN, COOLDOWN_MAX);
    }

    update(dt, now, w, h) {
      if (this.isPaused(now)) return;
      const dx = this.targetX - this.x;
      const dy = this.targetY - this.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < 3) {
        if (!this.isPlayer) this.pickRandomTarget(w, h);
        return;
      }
      const step = this.speed * dt;
      if (step >= d) {
        this.x = this.targetX;
        this.y = this.targetY;
        if (!this.isPlayer) this.pickRandomTarget(w, h);
      } else {
        this.x += (dx / d) * step;
        this.y += (dy / d) * step;
      }
      const m = this.radius;
      this.x = Math.max(m, Math.min(w - m, this.x));
      this.y = Math.max(m, Math.min(h - m, this.y));
    }

    adjustToward(identityName) {
      const dirs = ADJUST[identityName];
      if (!dirs) return;
      this.ideology.r = clamp(this.ideology.r + dirs[0] * ADJUST_STEP);
      this.ideology.g = clamp(this.ideology.g + dirs[1] * ADJUST_STEP);
      this.ideology.b = clamp(this.ideology.b + dirs[2] * ADJUST_STEP);
      this.recalc();
    }

    draw(ctx, now) {
      const paused = this.isPaused(now);
      const invuln = this.isInvulnerable(now);
      const alpha = paused ? 0.4 : (invuln ? 0.7 : 1);
      if (this.isPlayer) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius + 7, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.identity.r},${this.identity.g},${this.identity.b},0.3)`;
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${this.identity.r},${this.identity.g},${this.identity.b},${alpha})`;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${this.ideology.r},${this.ideology.g},${this.ideology.b},${alpha * 0.75})`;
      ctx.fill();
      if (this.dodettePartner !== null) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius + 3.5, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.7})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      if (this.isPlayer) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius + 1.5, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,255,255,0.95)";
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
    }
  }

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const overlay = document.getElementById("overlay");
  const endScreen = document.getElementById("end-screen");
  const startBtn = document.getElementById("start-btn");
  const restartBtn = document.getElementById("restart-btn");

  let dodes = [];
  let running = false;
  let startTime = 0;
  let lastNow = 0;
  let width = 0;
  let height = 0;
  let animId = 0;

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
  }
  window.addEventListener("resize", resize);
  resize();

  function createEvenIdentities() {
    const list = [];
    for (const id of IDENTITY_COLORS) {
      for (let i = 0; i < 4; i++) {
        const r = id.r === 255 ? randInt(128, 255) : randInt(0, 127);
        const g = id.g === 255 ? randInt(128, 255) : randInt(0, 127);
        const b = id.b === 255 ? randInt(128, 255) : randInt(0, 127);
        list.push({ r, g, b });
      }
    }
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }

  function spawnDodes() {
    dodes = [];
    Dode.nextId = 0;
    const ideologies = createEvenIdentities();
    const margin = RADIUS + 30;
    const usableW = Math.max(1, width - 2 * margin);
    const usableH = Math.max(1, height - 2 * margin);
    const cols = 8;
    const rows = 4;
    const cellW = usableW / cols;
    const cellH = usableH / rows;
    for (let i = 0; i < DODE_COUNT; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = margin + col * cellW + rand(cellW * 0.2, cellW * 0.8);
      const y = margin + row * cellH + rand(cellH * 0.2, cellH * 0.8);
      const influence = randInt(45, 55);
      const isPlayer = i === 0;
      const d = new Dode(x, y, ideologies[i], influence, isPlayer);
      if (!isPlayer) d.pickRandomTarget(width, height);
      dodes.push(d);
    }
  }

  function separate(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    let d = Math.sqrt(dx * dx + dy * dy) || 0.001;
    const minDist = a.radius + b.radius + 2;
    if (d < minDist) {
      const push = (minDist - d) / 2;
      const nx = dx / d;
      const ny = dy / d;
      a.x -= nx * push;
      a.y -= ny * push;
      b.x += nx * push;
      b.y += ny * push;
    }
  }

  function handleBump(a, b, now) {
    if (a.isInvulnerable(now) || b.isInvulnerable(now)) return;
    a.startBumpEffects(now);
    b.startBumpEffects(now);
    separate(a, b);
    a.bumpCounts.set(b.id, (a.bumpCounts.get(b.id) || 0) + 1);
    b.bumpCounts.set(a.id, (b.bumpCounts.get(a.id) || 0) + 1);
    const count = a.bumpCounts.get(b.id);
    if (count >= 3) {
      if (a.dodettePartner === null && b.dodettePartner === null) {
        a.dodettePartner = b.id;
        b.dodettePartner = a.id;
      }
    }
    if (a.dodettePartner === b.id && b.dodettePartner === a.id) {
      const newIdeo = {
        r: averageRoundUp(a.ideology.r, b.ideology.r),
        g: averageRoundUp(a.ideology.g, b.ideology.g),
        b: averageRoundUp(a.ideology.b, b.ideology.b),
      };
      const newInf = averageRoundUp(a.influence, b.influence);
      const child = new Dode((a.x + b.x) / 2, (a.y + b.y) / 2, newIdeo, newInf, false);
      child.pickRandomTarget(width, height);
      child.startBumpEffects(now);
      dodes.push(child);
    }
    if (a.identity.name === b.identity.name) {
      a.adjustToward(a.identity.name);
      b.adjustToward(b.identity.name);
    } else {
      if (a.conviction < b.conviction) {
        b.adjustToward(a.identity.name);
      } else if (b.conviction < a.conviction) {
        a.adjustToward(b.identity.name);
      }
    }
  }

  function checkCollisions(now) {
    for (let i = 0; i < dodes.length; i++) {
      for (let j = i + 1; j < dodes.length; j++) {
        const a = dodes[i];
        const b = dodes[j];
        if (dist(a, b) < a.radius + b.radius) {
          handleBump(a, b, now);
        }
      }
    }
  }

  function updateHUD(now) {
    const player = dodes.find(d => d.isPlayer);
    if (player) {
      document.getElementById("player-identity").textContent = "Identity: " + player.identity.name;
      document.getElementById("player-conviction").textContent = "Conviction: " + player.conviction;
    }
    document.getElementById("dode-count").textContent = "Dodes: " + dodes.length;
    const elapsed = Math.max(0, Math.floor(now - startTime));
    document.getElementById("time").textContent = "Time: " + elapsed + "s";
  }

  function buildLegend() {
    const legend = document.getElementById("legend");
    legend.innerHTML = "";
    for (const c of IDENTITY_COLORS) {
      const item = document.createElement("div");
      item.className = "legend-item";
      const swatch = document.createElement("div");
      swatch.className = "legend-swatch";
      swatch.style.background = "rgb(" + c.r + "," + c.g + "," + c.b + ")";
      item.appendChild(swatch);
      item.appendChild(document.createTextNode(c.name));
      legend.appendChild(item);
    }
  }

  function countIdentities() {
    const counts = {};
    for (const c of IDENTITY_COLORS) counts[c.name] = 0;
    for (const d of dodes) counts[d.identity.name]++;
    return counts;
  }

  function endGame() {
    running = false;
    if (animId) cancelAnimationFrame(animId);
    const counts = countIdentities();
    const player = dodes.find(d => d.isPlayer);
    const playerName = player ? player.identity.name : "—";
    let dominant = null;
    let max = -1;
    for (const name of Object.keys(counts)) {
      if (counts[name] > max) {
        max = counts[name];
        dominant = name;
      }
    }
    const title = document.getElementById("end-title");
    const msg = document.getElementById("end-message");
    if (playerName === dominant) {
      title.textContent = "You Conform";
      msg.textContent = playerName + " dominates with " + max + " Dodes. You are the color of dominance.";
    } else {
      title.textContent = "You Resist";
      msg.textContent = dominant + " dominates with " + max + " Dodes. Your Identity is " + playerName + ".";
    }
    const lines = Object.keys(counts)
      .sort((a, b) => counts[b] - counts[a])
      .map(n => n + ": " + counts[n])
      .join(" · ");
    msg.innerHTML += "<br><br><span style=\"opacity:0.7;font-size:0.9em\">" + lines + "</span>";
    endScreen.classList.remove("hidden");
  }

  function frame(ts) {
    if (!running) return;
    const now = ts / 1000;
    let dt = now - lastNow;
    if (dt > 0.1) dt = 0.1;
    if (dt < 0) dt = 0;
    lastNow = now;
    for (let i = 0; i < dodes.length; i++) {
      dodes[i].update(dt, now, width, height);
    }
    checkCollisions(now);
    updateHUD(now);
    if (now - startTime >= GAME_DURATION) {
      endGame();
      return;
    }
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, width, height);
    for (let i = 0; i < dodes.length; i++) {
      dodes[i].draw(ctx, now);
    }
    animId = requestAnimationFrame(frame);
  }

  canvas.addEventListener("click", function (e) {
    if (!running) return;
    const player = dodes.find(d => d.isPlayer);
    if (!player) return;
    const rect = canvas.getBoundingClientRect();
    player.setTarget(e.clientX - rect.left, e.clientY - rect.top);
  });

  function startGame() {
    try {
      if (animId) cancelAnimationFrame(animId);
      resize();
      overlay.classList.add("hidden");
      endScreen.classList.add("hidden");
      spawnDodes();
      buildLegend();
      running = true;
      const t = performance.now() / 1000;
      startTime = t;
      lastNow = t;
      animId = requestAnimationFrame(frame);
    } catch (err) {
      console.error("Start failed:", err);
      alert("Failed to start game. Check console for details.");
    }
  }

  startBtn.addEventListener("click", startGame);
  restartBtn.addEventListener("click", startGame);
})();
