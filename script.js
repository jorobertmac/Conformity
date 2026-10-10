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

  const DODE_COUNT = 16;
  const RADIUS = 5;                // starting radius (may change later based on factors)
  const ADJUST_STEP = 12;          // channel shift per strengthen/coerce (Influence later)
  const PAUSE_MIN = 0.25;           // movement pause after bump
  const PAUSE_MAX = 0.75;
  const COOLDOWN_MIN = 2;          // invulnerability (no bump) after bump
  const COOLDOWN_MAX = 4;

  // Win condition: share of Dodes of one Identity must reach this fraction
  const DIFFICULTIES = {
    Easy:     0.33,  // 33%
    Medium:   0.50,  // 50%
    Hard:     0.67,  // 67%
    Extreme:  1.00,  // 100%
  };

  // ─── Helpers ─────────────────────────────────────────────────
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

  // Urgency is speed level 1–5 (change of speed not yet implemented)
  const SPEED_PER_URGENCY = 40; // px/s per urgency point → 2≈80, 3≈120

  // ─── Dode ────────────────────────────────────────────────────
  class Dode {
    constructor(x, y, ideology, influence, urgency, isPlayer = false) {
      this.x = x;
      this.y = y;
      this.ideology = { r: ideology.r, g: ideology.g, b: ideology.b };
      this.influence = influence;   // reserved for later
      this.urgency = urgency;       // speed level 1–5 (change not yet implemented)
      this.speed = this.urgency * SPEED_PER_URGENCY;
      this.isPlayer = isPlayer;
      this.recalc();

      this.targetX = x;
      this.targetY = y;
      this.pauseUntil = 0;          // movement paused until (seconds)
      this.cooldownUntil = 0;       // invulnerable (no bump) until (seconds)
      this.bumpCounts = new Map();  // partnerId → mutual bump count
      this.dodettePartners = new Set(); // partner ids this Dode is a Dodette with
      this.dodetteFormingNumber = 2; // bumps needed with a new partner to form a Dodette
      this.id = Dode.nextId++;
      this.radius = RADIUS;
    }

    static nextId = 0;

    recalc() {
      this.identity = identityFromIdeology(this.ideology.r, this.ideology.g, this.ideology.b);
      this.conviction = conviction(this.ideology, this.identity);
      // Urgency / speed remain fixed for now (change of speed not yet implemented)
      this.speed = this.urgency * SPEED_PER_URGENCY;
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

      // keep inside bounds
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

      // glow for player
      if (this.isPlayer) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius + 7, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.identity.r},${this.identity.g},${this.identity.b},0.3)`;
        ctx.fill();
      }

      // main body – Identity color
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${this.identity.r},${this.identity.g},${this.identity.b},${alpha})`;
      ctx.fill();

      // subtle Ideology core
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${this.ideology.r},${this.ideology.g},${this.ideology.b},${alpha * 0.75})`;
      ctx.fill();

      // Dodette ring (has formed at least one Dodette)
      if (this.dodettePartners.size > 0) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius + 3.5, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.7})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // player outline
      if (this.isPlayer) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius + 1.5, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,255,255,0.95)";
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
    }
  }

  // ─── Game state ──────────────────────────────────────────────
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const overlay = document.getElementById("overlay");
  const endScreen = document.getElementById("end-screen");
  const restartBtn = document.getElementById("restart-btn");

  let dodes = [];
  let running = false;
  let lastNow = 0;
  let width = 0;
  let height = 0;
  let animId = 0;
  let selectedDifficulty = "Medium";
  let winThreshold = DIFFICULTIES.Medium;

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
  }
  window.addEventListener("resize", resize);
  resize();

  // ─── Setup ───────────────────────────────────────────────────
  function createEvenIdentities() {
    const list = [];
    for (const id of IDENTITY_COLORS) {
      for (let i = 0; i < 2; i++) { // two of each Identity
        const r = id.r === 255 ? randInt(128, 255) : randInt(0, 127);
        const g = id.g === 255 ? randInt(128, 255) : randInt(0, 127);
        const b = id.b === 255 ? randInt(128, 255) : randInt(0, 127);
        list.push({ r, g, b });
      }
    }
    // Fisher-Yates shuffle
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

    // place in a loose grid to reduce initial overlaps
    const cols = 4;
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
      const urgency = isPlayer ? 3 : 2; // player starts at 3, computers at 2
      const d = new Dode(x, y, ideologies[i], influence, urgency, isPlayer);
      if (!isPlayer) d.pickRandomTarget(width, height);
      dodes.push(d);
    }
  }

  // ─── Bump handling ───────────────────────────────────────────
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

    // mutual bump count & Dodette formation
    a.bumpCounts.set(b.id, (a.bumpCounts.get(b.id) || 0) + 1);
    b.bumpCounts.set(a.id, (b.bumpCounts.get(a.id) || 0) + 1);

    const count = a.bumpCounts.get(b.id);

    // Form Dodette when both have bumped each other their own forming number of times
    if (!a.dodettePartners.has(b.id) && !b.dodettePartners.has(a.id)) {
      if (count >= a.dodetteFormingNumber && count >= b.dodetteFormingNumber) {
        a.dodettePartners.add(b.id);
        b.dodettePartners.add(a.id);
        a.dodetteFormingNumber++;
        b.dodetteFormingNumber++;
      }
    }

    // Dodette offspring when this pair is already Dodettes
    if (a.dodettePartners.has(b.id) && b.dodettePartners.has(a.id)) {
      const newIdeo = {
        r: averageRoundUp(a.ideology.r, b.ideology.r),
        g: averageRoundUp(a.ideology.g, b.ideology.g),
        b: averageRoundUp(a.ideology.b, b.ideology.b),
      };
      const newInf = averageRoundUp(a.influence, b.influence);
      // Urgency change not yet implemented; offspring use average of parents (clamped 1–5)
      const newUrgency = Math.max(1, Math.min(5, averageRoundUp(a.urgency, b.urgency)));
      const child = new Dode(
        (a.x + b.x) / 2,
        (a.y + b.y) / 2,
        newIdeo,
        newInf,
        newUrgency,
        false
      );
      child.pickRandomTarget(width, height);
      // give the newborn invulnerability so it doesn't instantly re-bump
      child.startBumpEffects(now);
      dodes.push(child);
    }

    // color transfer
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

  // ─── UI helpers ──────────────────────────────────────────────
  function updateHUD(now) {
    const player = dodes.find(d => d.isPlayer);
    if (player) {
      document.getElementById("player-identity").textContent =
        "Identity: " + player.identity.name;
      document.getElementById("player-conviction").textContent =
        "Conviction: " + player.conviction;
    }
    document.getElementById("dode-count").textContent = "Dodes: " + dodes.length;

    const counts = countIdentities();
    const total = Math.max(1, dodes.length);
    let bestName = "—";
    let bestPct = 0;
    for (const name of Object.keys(counts)) {
      const pct = counts[name] / total;
      if (pct > bestPct) {
        bestPct = pct;
        bestName = name;
      }
    }
    const targetEl = document.getElementById("target-pct");
    if (targetEl) {
      targetEl.textContent =
        "Target: " + Math.round(winThreshold * 100) + "% · Lead: " +
        bestName + " " + Math.round(bestPct * 100) + "%";
    }
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

  /** Returns the Identity name that has reached the win threshold, or null. */
  function identityAtThreshold() {
    const counts = countIdentities();
    const total = dodes.length;
    if (total <= 0) return null;
    for (const name of Object.keys(counts)) {
      if (counts[name] / total >= winThreshold) return name;
    }
    return null;
  }

  function endGame(reason) {
    running = false;
    if (animId) cancelAnimationFrame(animId);

    const counts = countIdentities();
    const player = dodes.find(d => d.isPlayer);
    const playerName = player ? player.identity.name : "—";
    const total = Math.max(1, dodes.length);

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
    const pct = Math.round((max / total) * 100);
    const targetPct = Math.round(winThreshold * 100);

    if (playerName === dominant) {
      title.textContent = "You Conform";
      msg.textContent =
        playerName + " reached " + pct + "% (target " + targetPct + "%). You are the color of dominance.";
    } else {
      title.textContent = "You Resist";
      msg.textContent =
        dominant + " reached " + pct + "% (target " + targetPct + "%). Your Identity is " + playerName + ".";
    }

    const lines = Object.keys(counts)
      .sort((a, b) => counts[b] - counts[a])
      .map(n => n + ": " + counts[n] + " (" + Math.round((counts[n] / total) * 100) + "%)")
      .join(" · ");
    msg.innerHTML += "<br><br><span style=\"opacity:0.7;font-size:0.9em\">" + lines + "</span>";

    endScreen.classList.remove("hidden");
  }

  // ─── Main loop ───────────────────────────────────────────────
  function frame(ts) {
    if (!running) return;

    const now = ts / 1000;
    let dt = now - lastNow;
    if (dt > 0.1) dt = 0.1; // clamp large gaps (tab switch etc.)
    if (dt < 0) dt = 0;
    lastNow = now;

    for (let i = 0; i < dodes.length; i++) {
      dodes[i].update(dt, now, width, height);
    }
    checkCollisions(now);
    updateHUD(now);

    const winner = identityAtThreshold();
    if (winner) {
      endGame("threshold");
      return;
    }

    // clear
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < dodes.length; i++) {
      dodes[i].draw(ctx, now);
    }

    animId = requestAnimationFrame(frame);
  }

  // ─── Input ───────────────────────────────────────────────────
  canvas.addEventListener("click", function (e) {
    if (!running) return;
    const player = dodes.find(d => d.isPlayer);
    if (!player) return;
    // allow setting a new target even while cooling (movement just stays paused)
    const rect = canvas.getBoundingClientRect();
    player.setTarget(e.clientX - rect.left, e.clientY - rect.top);
  });

  // ─── Start / Restart ─────────────────────────────────────────
  function startGame(difficultyName) {
    try {
      if (difficultyName && DIFFICULTIES[difficultyName] != null) {
        selectedDifficulty = difficultyName;
        winThreshold = DIFFICULTIES[difficultyName];
      }
      if (animId) cancelAnimationFrame(animId);
      resize();
      overlay.classList.add("hidden");
      endScreen.classList.add("hidden");
      spawnDodes();
      buildLegend();
      running = true;
      lastNow = performance.now() / 1000;
      animId = requestAnimationFrame(frame);
    } catch (err) {
      console.error("Start failed:", err);
      alert("Failed to start game. Check console for details.");
    }
  }

  document.querySelectorAll("[data-difficulty]").forEach(btn => {
    btn.addEventListener("click", () => startGame(btn.getAttribute("data-difficulty")));
  });
  restartBtn.addEventListener("click", () => startGame(selectedDifficulty));

  // safety: if DOM is already ready, nothing more needed
})();
