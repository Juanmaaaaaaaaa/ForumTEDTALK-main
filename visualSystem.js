/* =============================================================
   Fórum UPB · Sistema visual de partículas — PULPO
   Reemplazo directo de visualSystem.js.
   API pública idéntica: new VisualSystem(canvas), setMoment(moment), render()
   No toca textos, imágenes, logos ni tipografía.
   ============================================================= */

const TAU = Math.PI * 2;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (edge0, edge1, value) => {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};
const easeOut = (t) => 1 - Math.pow(1 - t, 2.2);

function hexToRgb(hex) {
  const clean = String(hex).replace("#", "");
  const n = parseInt(clean, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function mixRgb(a, b, t) {
  return { r: lerp(a.r, b.r, t), g: lerp(a.g, b.g, t), b: lerp(a.b, b.b, t) };
}

function rgbaFrom(color, alpha) {
  return `rgba(${color.r | 0}, ${color.g | 0}, ${color.b | 0}, ${alpha})`;
}

function seededUnit(seed) {
  const x = Math.sin(seed * 999.91) * 10000;
  return x - Math.floor(x);
}

/* ---------- Constantes del pulpo ---------- */

const ARMS = 8;
const ARM_POINTS = 24;
const MANTLE_DOTS = 118;
const EYE_DOTS = 13;

const PALETTE = () => (window.CONFIG && CONFIG.palette) || {};
const PURPLE = "#8f6ce8";

/* Pose base. Todos los campos son numéricos y se interpolan entre momentos,
   de modo que el pulpo "viaja" de una diapositiva a la siguiente. */
const BASE_POSE = {
  cx: 0.71, // centro horizontal (0..1 del escenario)
  cy: 0.43, // centro vertical
  head: 0.088, // semialtura de la cabeza, en fracción de min(ancho, alto)
  rotation: 0, // PI = de cabeza
  square: 0, // 0 = cuerpo orgánico, 1 = cuerpo cuadrado (frasco)
  flatten: 0, // 0 = libre, 1 = aplastado contra el piso
  ring: 0, // tentáculos formando anillo
  arch: 0, // tentáculos en arcos alrededor de la cabeza
  trail: 0, // tentáculos estirados detrás (ascenso)
  armLength: 0.26, // largo de tentáculo, fracción de min(ancho, alto)
  spread: 1, // apertura del abanico de tentáculos
  waveAmp: 0.18, // amplitud de la onda de nado
  waveSpeed: 1, // velocidad de la onda
  armAlpha: 1, // visibilidad de los tentáculos
  eyeY: -0.12, // posición vertical de los ojos dentro de la cabeza
  eyeSpread: 0.46,
  bodyAlpha: 1,
};

/* Un "escena" por diapositiva, en el mismo orden de moments.js */
const SCENES = {
  // 01 · Pulpo en su forma natural
  "relevo-generacional": {
    pose: { cx: 0.72, cy: 0.42 },
  },
  // 02 · De cabeza, en la parte superior
  "auditorio-grados": {
    pose: { cx: 0.66, cy: 0.22, rotation: Math.PI, head: 0.078, armLength: 0.23, waveAmp: 0.2 },
  },
  // 03 · Baja y se vuelve cuadrado, como dentro de un frasco
  "universidad-mundo": {
    pose: {
      cx: 0.72,
      cy: 0.54,
      square: 1,
      head: 0.1,
      armLength: 0.12,
      spread: 0.55,
      waveAmp: 0.05,
      waveSpeed: 0.5,
    },
    jar: true,
  },
  // 04 · Sale del frasco hacia arriba con tres esferas en los tentáculos
  "academia-industria-ciudad": {
    pose: {
      cx: 0.72,
      cy: 0.25,
      trail: 1,
      head: 0.082,
      armLength: 0.34,
      spread: 0.5,
      waveAmp: 0.12,
      waveSpeed: 1.2,
    },
    armBalls: true,
  },
  // 05 · Se deja caer y se pega al piso
  impacto: {
    pose: {
      cx: 0.72,
      cy: 0.83,
      flatten: 1,
      head: 0.085,
      armLength: 0.3,
      waveAmp: 0.1,
      waveSpeed: 0.8,
    },
    drop: true,
  },
  // 06 · Forma base al medio-derecha, cambiando de color cada 5 s
  comunidad: {
    pose: { cx: 0.79, cy: 0.46 },
    colorCycle: true,
  },
  // 07 · Estado natural, gira formando un anillo
  confianza: {
    pose: { cx: 0.73, cy: 0.44, ring: 1, armLength: 0.3, waveAmp: 0.06 },
  },
  // 08 · Arriba, va de izquierda a derecha, con tres partículas conectadas por flechas
  "nuevas-rutas": {
    pose: { cx: 0.5, cy: 0.19, head: 0.07, armLength: 0.2, waveAmp: 0.22, waveSpeed: 1.4 },
    sweep: { amplitude: 0.27, speed: 0.34 },
    arrows: true,
  },
  // 09 · Un ojo rojo y un ojo azul
  "vision-generaciones": {
    pose: { cx: 0.72, cy: 0.44 },
    eyes: ["eventRed", "eventCyan"],
  },
  // 10 · Ambos ojos morados, el pulpo crece gradualmente
  "trabajan-juntas": {
    pose: { cx: 0.72, cy: 0.45 },
    eyes: [PURPLE, PURPLE],
    grow: { to: 1.3, duration: 7 },
  },
  // 11 · Tentáculos en arcos alrededor de la cabeza
  "presente-joven": {
    pose: { cx: 0.72, cy: 0.44, arch: 1, armLength: 0.24, waveAmp: 0.1 },
  },
  // 12 · Arriba, de izquierda a derecha, recogiendo esferas de colores
  "futuro-construido": {
    pose: { cx: 0.5, cy: 0.21, head: 0.075, armLength: 0.22, waveAmp: 0.2, waveSpeed: 1.3 },
    sweep: { amplitude: 0.31, speed: 0.2, mode: "loop" },
    collect: true,
  },
  // 13 · Forma original, más pequeño, a la izquierda
  "qr-cierre": {
    pose: {
      cx: 0.22,
      cy: 0.42,
      head: 0.06,
      armLength: 0.18,
    },
  },
};

const SCENE_ORDER = Object.keys(SCENES);

class VisualSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.width = 1;
    this.height = 1;
    this.dpr = 1;
    this.time = 0;
    this.momentTime = 0;
    this.current = null;
    this.scene = SCENES[SCENE_ORDER[0]];
    this.colors = ["#08a9dd", "#f7353f", "#e96daa"];
    this.intensity = 0.6;
    this.ringSpin = 0;
    this.pose = { ...BASE_POSE };
    this.targetPose = { ...BASE_POSE };
    this.growth = 1;
    this.initialised = false;

    this.buildParticles();
    this.buildDust();
    this.arrows = [];
    this.balls = [];
    this.absorbed = [];
    this.nextBallAt = 0;

    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  /* ---------- construcción ---------- */

  buildParticles() {
    const particles = [];
    let id = 0;

    for (let arm = 0; arm < ARMS; arm += 1) {
      for (let k = 0; k < ARM_POINTS; k += 1) {
        const t = k / (ARM_POINTS - 1);
        particles.push({
          id: id++,
          role: "arm",
          arm,
          step: k,
          t,
          lane: arm % 3,
          x: 0,
          y: 0,
          tx: 0,
          ty: 0,
          size: lerp(2.6, 1.05, t),
          drift: seededUnit(arm * 7 + k) * TAU,
        });
      }
    }

    for (let i = 0; i < MANTLE_DOTS; i += 1) {
      const angle = seededUnit(i + 3) * TAU;
      const radius = Math.sqrt(seededUnit(i + 61));
      particles.push({
        id: id++,
        role: "mantle",
        angle,
        radius,
        lane: i % 3,
        x: 0,
        y: 0,
        tx: 0,
        ty: 0,
        size: 1.2 + seededUnit(i + 19) * 1.5,
        drift: seededUnit(i + 88) * TAU,
      });
    }

    for (let eye = 0; eye < 2; eye += 1) {
      for (let i = 0; i < EYE_DOTS; i += 1) {
        const angle = seededUnit(eye * 40 + i + 2) * TAU;
        const radius = Math.sqrt(seededUnit(eye * 40 + i + 11));
        particles.push({
          id: id++,
          role: "eye",
          eye,
          angle,
          radius,
          lane: i % 3,
          x: 0,
          y: 0,
          tx: 0,
          ty: 0,
          size: 1.4 + seededUnit(i + 5) * 1.1,
          drift: seededUnit(i + 33) * TAU,
        });
      }
    }

    this.particles = particles;
    this.armParticles = particles.filter((p) => p.role === "arm");
    this.armGroups = Array.from({ length: ARMS }, (_, i) =>
      this.armParticles.filter((p) => p.arm === i),
    );
  }

  buildDust() {
    const count = Math.max(34, Math.round((CONFIG.particleCount || 138) * 0.28));
    this.dust = Array.from({ length: count }, (_, i) => ({
      x: seededUnit(i + 101),
      y: seededUnit(i + 211),
      size: 0.5 + seededUnit(i + 311) * 1.3,
      drift: seededUnit(i + 411) * TAU,
      speed: 0.02 + seededUnit(i + 511) * 0.05,
      lane: i % 3,
    }));
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = Math.max(1, rect.width);
    this.height = Math.max(1, rect.height);
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  /* ---------- cambio de momento ---------- */

  setMoment(moment) {
    this.current = moment;
    this.momentTime = 0;
    this.colors = moment.colors || this.colors;
    this.intensity = typeof moment.intensity === "number" ? moment.intensity : 0.6;

    const scene = SCENES[moment.id] || SCENES[SCENE_ORDER[0]];
    this.scene = scene;
    this.targetPose = { ...BASE_POSE, ...scene.pose };
    this.growth = 1;
    this.balls = [];
    this.absorbed = [];
    this.nextBallAt = 0.6;
    this.dropFrom = this.pose.cy;
    this.arrows = scene.arrows ? this.makeArrows() : [];

    if (!this.initialised) {
      this.pose = { ...this.targetPose };
      this.initialised = true;
      this.updateTargets();
      for (const p of this.particles) {
        p.x = p.tx;
        p.y = p.ty;
      }
    }
  }

  makeArrows() {
    const palette = PALETTE();
    const tones = [palette.eventCyan || "#08a9dd", palette.eventRed || "#f7353f", palette.forumGold || "#d6a94f"];
    return [
      { x: 0.24, y: 0.66, color: tones[0] },
      { x: 0.55, y: 0.78, color: tones[1] },
      { x: 0.85, y: 0.6, color: tones[2] },
    ];
  }

  /* ---------- estado ---------- */

  get base() {
    return Math.min(this.width, this.height);
  }

  hasBackgroundAsset() {
    const configured = CONFIG.assets?.byMoment?.[this.current?.id];
    const asset = configured === false ? null : configured || this.current?.asset;
    return asset?.placement === "background";
  }

  update() {
    const dt = 1 / 60;
    this.time += dt;
    this.momentTime += dt;

    const speed = (CONFIG.transitionSpeed || 0.055) * 1.7;
    for (const key of Object.keys(BASE_POSE)) {
      this.pose[key] = lerp(this.pose[key], this.targetPose[key], speed);
    }

    this.ringSpin += dt * (0.34 + this.pose.ring * 0.42 + this.pose.arch * 0.12);

    // Crecimiento gradual (diapositiva 10)
    if (this.scene.grow) {
      const g = smoothstep(0, this.scene.grow.duration, this.momentTime);
      this.growth = lerp(1, this.scene.grow.to, g);
    } else {
      this.growth = lerp(this.growth, 1, 0.05);
    }

    if (this.scene.collect) this.updateCollectibles(dt);
  }

  /* Pose efectiva del frame: pose interpolada + movimientos propios de la escena */
  livePose() {
    const pose = { ...this.pose };
    const scene = this.scene;

    if (scene.sweep) {
      const { amplitude, speed, mode } = scene.sweep;
      if (mode === "loop") {
        // barrido continuo de izquierda a derecha
        const cycle = (this.momentTime * speed) % 2;
        const tri = cycle < 1 ? cycle : 2 - cycle;
        pose.cx = 0.5 + lerp(-amplitude, amplitude, tri);
      } else {
        pose.cx = 0.5 + Math.sin(this.momentTime * speed * TAU * 0.5) * amplitude;
      }
    }

    if (scene.drop) {
      // caída con gravedad y golpe contra el piso
      const fall = clamp(this.momentTime / 1.05, 0, 1);
      const eased = fall * fall;
      pose.cy = lerp(this.dropFrom, this.targetPose.cy, eased);
      const impact = Math.max(0, 1 - (this.momentTime - 1.05) * 2.6);
      const bounce = this.momentTime > 1.05 ? Math.sin((this.momentTime - 1.05) * 11) * impact * 0.5 : 0;
      pose.flatten = clamp(smoothstep(0.75, 1.1, this.momentTime) + bounce * 0.3, 0, 1.15);
      pose.head = this.pose.head * (1 + bounce * 0.12);
    }

    pose.head *= this.growth;
    pose.armLength *= lerp(1, this.growth, 0.7);
    return pose;
  }

  /* ---------- geometría del pulpo ---------- */

  headMetrics(pose) {
    const base = this.base;
    const hh = pose.head * base * (1 - 0.4 * clamp(pose.flatten, 0, 1));
    const hw = pose.head * 0.88 * base * (1 + 0.3 * clamp(pose.flatten, 0, 1));
    return { hw, hh };
  }

  /* Contorno del manto: elipse que se transforma en cuadrado (frasco) */
  mantleShape(angle, radius, pose, metrics) {
    const { hw, hh } = metrics;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const squareFactor = 1 / Math.max(Math.abs(cos), Math.abs(sin), 0.0001);
    const factor = lerp(1, Math.min(squareFactor, 1.42), pose.square);
    const r = Math.sqrt(radius);
    // manto de pulpo: más alto arriba, más recogido abajo
    const profile = sin < 0 ? 1.18 : 0.82;
    return {
      x: cos * r * hw * factor,
      y: sin * r * hh * factor * profile - hh * 0.12,
    };
  }

  squarePerimeter(p, half) {
    const u = ((p % 1) + 1) % 1;
    const side = Math.floor(u * 4);
    const k = u * 4 - side;
    if (side === 0) return { x: lerp(-half, half, k), y: -half };
    if (side === 1) return { x: half, y: lerp(-half, half, k) };
    if (side === 2) return { x: lerp(half, -half, k), y: half };
    return { x: -half, y: lerp(half, -half, k) };
  }

  /* Camino de un tentáculo en coordenadas locales (cabeza en el origen) */
  armPath(index, pose, metrics) {
    const { hw, hh } = metrics;
    const base = this.base;
    const armLen = pose.armLength * base;
    const fan = (index - (ARMS - 1) / 2) / ((ARMS - 1) / 2);
    const phase = index * 1.73;
    const points = [];

    // --- forma natural: abanico hacia abajo con onda de nado ---
    let x = Math.cos(Math.PI / 2 + fan * 1.02 * pose.spread) * hw * 0.62;
    let y = hh * 0.36;
    const stepLen = armLen / (ARM_POINTS - 1);
    const natural = [{ x, y }];
    for (let k = 1; k < ARM_POINTS; k += 1) {
      const t = k / (ARM_POINTS - 1);
      const theta =
        Math.PI / 2 +
        fan * 1.02 * pose.spread +
        fan * 0.85 * t +
        Math.sin(t * 3.3 - this.time * 2.1 * pose.waveSpeed + phase) * pose.waveAmp * (0.4 + t);
      x += Math.cos(theta) * stepLen;
      y += Math.sin(theta) * stepLen;
      natural.push({ x, y });
    }

    for (let k = 0; k < ARM_POINTS; k += 1) {
      const t = k / (ARM_POINTS - 1);
      let point = natural[k];

      // --- estela hacia atrás (ascenso desde el frasco) ---
      if (pose.trail > 0.01) {
        const angle =
          Math.PI / 2 +
          fan * 0.24 +
          Math.sin(t * 2.4 - this.time * 1.7 + phase) * pose.waveAmp * 0.7 * (0.3 + t);
        const radius = hh * 0.6 + t * armLen * 1.14;
        point = {
          x: lerp(point.x, Math.cos(angle) * radius, pose.trail),
          y: lerp(point.y, Math.sin(angle) * radius, pose.trail),
        };
      }

      // --- aplastado contra el piso ---
      if (pose.flatten > 0.01) {
        const dir = fan === 0 ? 1 : Math.sign(fan);
        const spreadK = 0.45 + Math.abs(fan) * 0.75;
        const flat = {
          x: fan * hw * 0.55 + dir * t * armLen * 1.25 * spreadK,
          y:
            hh * 0.62 +
            Math.sin(t * 4.4 + this.time * 2.2 + phase) * hh * 0.16 * (1 - t) +
            t * hh * 0.1,
        };
        point = {
          x: lerp(point.x, flat.x, clamp(pose.flatten, 0, 1)),
          y: lerp(point.y, flat.y, clamp(pose.flatten, 0, 1)),
        };
      }

      // --- anillo giratorio ---
      if (pose.ring > 0.01) {
        const angle = (index / ARMS) * TAU + this.ringSpin + t * 1.85;
        const radius = lerp(hh * 0.78, armLen * 1.02, easeOut(t));
        const ring = { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius * 0.94 };
        point = { x: lerp(point.x, ring.x, pose.ring), y: lerp(point.y, ring.y, pose.ring) };
      }

      // --- arcos alrededor de la cabeza ---
      if (pose.arch > 0.01) {
        const angle = (index / ARMS) * TAU + this.ringSpin * 0.3 + t * 1.45;
        const radius =
          hh * 0.5 + Math.sin(Math.PI * t) * armLen * (0.95 + Math.sin(this.time * 0.8 + phase) * 0.08);
        const arch = { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius * 0.92 };
        point = { x: lerp(point.x, arch.x, pose.arch), y: lerp(point.y, arch.y, pose.arch) };
      }

      // --- replegado dentro del frasco ---
      if (pose.square > 0.01) {
        const half = hh * 1.5;
        const p = index / ARMS + t * 0.17 + Math.sin(this.time * 0.4 + phase) * 0.006;
        const edge = this.squarePerimeter(p, half * (0.52 + 0.42 * t));
        point = {
          x: lerp(point.x, edge.x, pose.square),
          y: lerp(point.y, edge.y * 0.98 + hh * 0.1, pose.square),
        };
      }

      points.push(point);
    }

    return points;
  }

  updateTargets() {
    const pose = this.livePose();
    this.framePose = pose;
    const metrics = this.headMetrics(pose);
    this.frameMetrics = metrics;

    const cx = pose.cx * this.width;
    const cy = pose.cy * this.height;
    const cos = Math.cos(pose.rotation);
    const sin = Math.sin(pose.rotation);
    const place = (point) => ({
      x: cx + point.x * cos - point.y * sin,
      y: cy + point.x * sin + point.y * cos,
    });
    this.place = place;

    this.armPaths = [];
    for (let i = 0; i < ARMS; i += 1) {
      this.armPaths.push(this.armPath(i, pose, metrics).map(place));
    }

    const { hw, hh } = metrics;
    this.headCenter = place({ x: 0, y: 0 });
    this.eyeCenters = [0, 1].map((eye) =>
      place({ x: (eye === 0 ? -1 : 1) * hw * pose.eyeSpread, y: hh * pose.eyeY }),
    );

    for (const p of this.particles) {
      if (p.role === "arm") {
        const target = this.armPaths[p.arm][p.step];
        p.tx = target.x;
        p.ty = target.y;
      } else if (p.role === "mantle") {
        const local = this.mantleShape(
          p.angle + Math.sin(this.time * 0.6 + p.drift) * 0.05,
          p.radius,
          pose,
          metrics,
        );
        const target = place(local);
        p.tx = target.x + Math.sin(this.time * 1.1 + p.drift) * hw * 0.02;
        p.ty = target.y + Math.cos(this.time * 0.9 + p.drift) * hh * 0.02;
      } else {
        const center = this.eyeCenters[p.eye];
        const radius = hw * 0.17 * Math.sqrt(p.radius);
        p.tx = center.x + Math.cos(p.angle) * radius;
        p.ty = center.y + Math.sin(p.angle) * radius * 0.86;
      }
    }
  }

  moveParticles() {
    const ease = 0.14;
    for (const p of this.particles) {
      p.x = lerp(p.x, p.tx, ease);
      p.y = lerp(p.y, p.ty, ease);
    }
  }

  /* ---------- color ---------- */

  cycleColor() {
    const palette = PALETTE();
    const wheel = [
      palette.eventCyan || "#08a9dd",
      palette.eventMagenta || "#e96daa",
      palette.eventRed || "#f7353f",
      palette.forumGold || "#d6a94f",
      palette.eventSilver || "#dde2e6",
    ].map(hexToRgb);
    const step = this.momentTime / 5;
    const index = Math.floor(step) % wheel.length;
    const next = (index + 1) % wheel.length;
    const t = smoothstep(0, 1, step - Math.floor(step));
    return mixRgb(wheel[index], wheel[next], t);
  }

  particleColor(p) {
    if (this.scene.colorCycle) return this.cycleColor();
    const hex = this.colors[p.lane % this.colors.length];
    return hexToRgb(hex);
  }

  eyeColor(eye) {
    const palette = PALETTE();
    const scene = this.scene;
    if (scene.eyes) {
      const key = scene.eyes[eye];
      return hexToRgb(palette[key] || key);
    }
    if (scene.colorCycle) return this.cycleColor();
    return hexToRgb(palette.ink || "#f7f7f4");
  }

  /* ---------- esferas (diapositivas 4 y 12) ---------- */

  updateCollectibles(dt) {
    const palette = PALETTE();
    const tones = [
      palette.eventCyan || "#08a9dd",
      palette.eventRed || "#f7353f",
      palette.eventMagenta || "#e96daa",
      palette.forumGold || "#d6a94f",
      palette.eventSilver || "#dde2e6",
    ];

    if (this.momentTime > this.nextBallAt && this.balls.length < 14) {
      const seed = this.balls.length + Math.floor(this.momentTime * 3);
      const groupSize = 2 + Math.floor(seededUnit(seed + 9) * 2);
      const gx = 0.12 + seededUnit(seed + 3) * 0.76;
      const gy = 0.42 + seededUnit(seed + 7) * 0.34;
      for (let i = 0; i < groupSize; i += 1) {
        this.balls.push({
          x: (gx + (seededUnit(seed * 5 + i) - 0.5) * 0.1) * this.width,
          y: (gy + (seededUnit(seed * 9 + i) - 0.5) * 0.12) * this.height,
          radius: this.base * (0.007 + seededUnit(seed * 13 + i) * 0.006),
          color: tones[(seed + i) % tones.length],
          captured: false,
          pull: 0,
          life: 1,
          drift: seededUnit(seed * 17 + i) * TAU,
        });
      }
      this.nextBallAt = this.momentTime + 1.3;
    }

    const head = this.headCenter || { x: this.width * 0.5, y: this.height * 0.5 };
    const reach = this.base * (this.framePose ? this.framePose.armLength * 1.1 : 0.26);

    for (const ball of this.balls) {
      if (!ball.captured) {
        ball.y += Math.sin(this.time * 1.4 + ball.drift) * 0.25;
        const dx = head.x - ball.x;
        const dy = head.y - ball.y;
        if (Math.hypot(dx, dy) < reach) ball.captured = true;
      } else {
        ball.pull = Math.min(1, ball.pull + dt * 0.9);
        ball.x = lerp(ball.x, head.x, ball.pull * 0.16);
        ball.y = lerp(ball.y, head.y, ball.pull * 0.16);
        if (Math.hypot(head.x - ball.x, head.y - ball.y) < this.base * 0.03) {
          ball.life -= dt * 2.4;
          this.absorbFlash = 1;
        }
      }
    }

    this.balls = this.balls.filter((ball) => ball.life > 0);
    this.absorbFlash = Math.max(0, (this.absorbFlash || 0) - dt * 2);
  }

  /* ---------- render ---------- */

  render() {
    this.update();
    this.updateTargets();
    this.moveParticles();

    const ctx = this.ctx;
    const hasBackgroundAsset = this.hasBackgroundAsset();
    ctx.clearRect(0, 0, this.width, this.height);
    this.drawBackground(ctx, hasBackgroundAsset);
    this.drawDust(ctx, hasBackgroundAsset);

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    if (this.scene.jar) this.drawJar(ctx);
    if (this.scene.arrows) this.drawArrows(ctx);
    if (this.scene.collect) this.drawBalls(ctx);
    this.drawArms(ctx, hasBackgroundAsset);
    this.drawHead(ctx, hasBackgroundAsset);
    if (this.scene.armBalls) this.drawArmBalls(ctx);
    this.drawEyes(ctx);
    ctx.restore();
  }

  drawBackground(ctx, hasBackgroundAsset) {
    if (hasBackgroundAsset) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const haze = ctx.createRadialGradient(
        this.width * 0.64,
        this.height * 0.48,
        0,
        this.width * 0.64,
        this.height * 0.48,
        this.width * 0.48,
      );
      haze.addColorStop(0, rgba(this.colors[1], 0.05 + this.intensity * 0.04));
      haze.addColorStop(0.54, rgba(this.colors[0], 0.018));
      haze.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = haze;
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.restore();
      return;
    }

    const gradient = ctx.createLinearGradient(0, 0, this.width, this.height);
    gradient.addColorStop(0, "#050607");
    gradient.addColorStop(0.44, rgba(this.colors[0], 0.12 + this.intensity * 0.08));
    gradient.addColorStop(1, "#111315");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    const center = this.headCenter || { x: this.width * 0.7, y: this.height * 0.45 };
    const glow = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, this.width * 0.5);
    glow.addColorStop(0, rgba(this.colors[1], 0.15 * this.intensity));
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  drawDust(ctx, hasBackgroundAsset) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const alpha = (hasBackgroundAsset ? 0.1 : 0.2) * (0.5 + this.intensity * 0.5);
    for (const mote of this.dust) {
      const x = (mote.x + Math.sin(this.time * mote.speed + mote.drift) * 0.02) * this.width;
      const y =
        ((mote.y + this.time * mote.speed * 0.02) % 1.05) * this.height -
        Math.sin(this.time * 0.3 + mote.drift) * 4;
      ctx.fillStyle = rgba(this.colors[mote.lane % this.colors.length], alpha);
      ctx.beginPath();
      ctx.arc(x, y, mote.size, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  drawJar(ctx) {
    const pose = this.framePose;
    const { hh } = this.frameMetrics;
    const half = hh * 1.78;
    const cx = pose.cx * this.width;
    const cy = pose.cy * this.height + hh * 0.05;
    const alpha = 0.16 * pose.square;
    ctx.save();
    ctx.strokeStyle = rgba(CONFIG.palette?.eventSilver || "#dde2e6", alpha);
    ctx.lineWidth = Math.max(1, this.base * 0.0022);
    ctx.strokeRect(cx - half, cy - half, half * 2, half * 2);
    ctx.strokeStyle = rgba(this.colors[0], alpha * 0.8);
    ctx.strokeRect(cx - half * 0.94, cy - half * 0.94, half * 1.88, half * 1.88);
    ctx.restore();
  }

  drawArms(ctx, hasBackgroundAsset) {
    const pose = this.framePose;
    const alphaBase = (0.5 + this.intensity * 0.4) * pose.armAlpha * (hasBackgroundAsset ? 0.8 : 1);
    if (alphaBase < 0.01) return;

    for (let i = 0; i < ARMS; i += 1) {
      const particles = this.armGroups[i];
      ctx.beginPath();
      for (let k = 0; k < particles.length; k += 1) {
        const p = particles[k];
        if (k === 0) ctx.moveTo(p.x, p.y);
        else {
          const prev = particles[k - 1];
          ctx.quadraticCurveTo(prev.x, prev.y, (prev.x + p.x) / 2, (prev.y + p.y) / 2);
        }
      }
      const color = this.particleColor(particles[0]);
      ctx.strokeStyle = rgbaFrom(color, alphaBase * 0.34);
      ctx.lineWidth = Math.max(1, this.base * 0.0055 * (0.7 + this.intensity * 0.5));
      ctx.lineCap = "round";
      ctx.stroke();
    }

    for (const p of this.armParticles) {
      const color = this.particleColor(p);
      const pulse = 0.72 + Math.sin(this.time * 1.9 + p.drift - p.t * 3) * 0.28;
      const alpha = Math.min(0.9, alphaBase * (1 - p.t * 0.32));
      ctx.fillStyle = rgbaFrom(color, alpha);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * pulse * (0.9 + this.intensity * 0.4), 0, TAU);
      ctx.fill();
    }
  }

  drawHead(ctx, hasBackgroundAsset) {
    const pose = this.framePose;
    const { hw, hh } = this.frameMetrics;
    const center = this.headCenter;
    const glowAlpha = (0.16 + this.intensity * 0.14) * (hasBackgroundAsset ? 0.7 : 1) + (this.absorbFlash || 0) * 0.1;

    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.rotate(pose.rotation);
    const glow = ctx.createRadialGradient(0, -hh * 0.1, 0, 0, -hh * 0.1, Math.max(hw, hh) * 1.25);
    const headColor = this.scene.colorCycle ? this.cycleColor() : hexToRgb(this.colors[0]);
    glow.addColorStop(0, rgbaFrom(headColor, glowAlpha));
    glow.addColorStop(0.6, rgbaFrom(headColor, glowAlpha * 0.3));
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.ellipse(0, -hh * 0.1, hw * 1.35, hh * 1.4, 0, 0, TAU);
    ctx.fill();
    ctx.restore();

    const alphaBase = (0.55 + this.intensity * 0.35) * (hasBackgroundAsset ? 0.85 : 1) * pose.bodyAlpha;
    for (const p of this.particles) {
      if (p.role !== "mantle") continue;
      const color = this.particleColor(p);
      const pulse = 0.78 + Math.sin(this.time * 1.5 + p.drift) * 0.22;
      ctx.fillStyle = rgbaFrom(color, Math.min(0.92, alphaBase));
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * pulse * (0.9 + this.intensity * 0.5), 0, TAU);
      ctx.fill();
    }
  }

  drawEyes(ctx) {
    const { hw } = this.frameMetrics;
    for (let eye = 0; eye < 2; eye += 1) {
      const color = this.eyeColor(eye);
      const center = this.eyeCenters[eye];
      const radius = hw * 0.3;
      const glow = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, radius * 1.8);
      glow.addColorStop(0, rgbaFrom(color, 0.5));
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(center.x, center.y, radius * 1.8, 0, TAU);
      ctx.fill();
    }

    for (const p of this.particles) {
      if (p.role !== "eye") continue;
      const color = this.eyeColor(p.eye);
      const pulse = 0.85 + Math.sin(this.time * 2.4 + p.drift) * 0.15;
      ctx.fillStyle = rgbaFrom(color, 0.95);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * pulse * (1 + this.intensity * 0.3), 0, TAU);
      ctx.fill();
    }
  }

  /* Tres esferas sostenidas por tres tentáculos (diapositiva 4) */
  drawArmBalls(ctx) {
    const palette = PALETTE();
    const tones = [palette.eventCyan || "#08a9dd", palette.eventRed || "#f7353f", palette.eventMagenta || "#e96daa"];
    const carriers = [1, 3, 6];
    const appear = smoothstep(0.4, 1.6, this.momentTime);
    if (appear < 0.01) return;

    carriers.forEach((armIndex, i) => {
      const path = this.armPaths[armIndex];
      const tip = path[path.length - 1];
      const radius = this.base * 0.026 * appear * (1 + Math.sin(this.time * 1.6 + i) * 0.06);
      const color = hexToRgb(tones[i % tones.length]);
      const glow = ctx.createRadialGradient(tip.x, tip.y, 0, tip.x, tip.y, radius * 2.6);
      glow.addColorStop(0, rgbaFrom(color, 0.85));
      glow.addColorStop(0.42, rgbaFrom(color, 0.35));
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(tip.x, tip.y, radius * 2.6, 0, TAU);
      ctx.fill();
      ctx.fillStyle = rgbaFrom(color, 0.95);
      ctx.beginPath();
      ctx.arc(tip.x, tip.y, radius, 0, TAU);
      ctx.fill();
    });
  }

  /* Tres partículas de otro color unidas al pulpo por flechas (diapositiva 8) */
  drawArrows(ctx) {
    const head = this.headCenter;
    const appear = smoothstep(0.3, 1.4, this.momentTime);
    if (appear < 0.01) return;

    this.arrows.forEach((node, i) => {
      const x = node.x * this.width;
      const y = node.y * this.height + Math.sin(this.time * 0.9 + i) * this.base * 0.008;
      const color = hexToRgb(node.color);
      const dx = x - head.x;
      const dy = y - head.y;
      const length = Math.hypot(dx, dy) || 1;
      const ux = dx / length;
      const uy = dy / length;
      const start = { x: head.x + ux * this.base * 0.05, y: head.y + uy * this.base * 0.05 };
      const end = { x: x - ux * this.base * 0.026, y: y - uy * this.base * 0.026 };

      const gradient = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
      gradient.addColorStop(0, rgbaFrom(color, 0.08 * appear));
      gradient.addColorStop(1, rgbaFrom(color, 0.5 * appear));
      ctx.strokeStyle = gradient;
      ctx.lineWidth = Math.max(1, this.base * 0.0026);
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();

      // punta de flecha
      const wing = this.base * 0.018;
      const angle = Math.atan2(uy, ux);
      ctx.fillStyle = rgbaFrom(color, 0.6 * appear);
      ctx.beginPath();
      ctx.moveTo(end.x, end.y);
      ctx.lineTo(end.x - Math.cos(angle - 0.4) * wing, end.y - Math.sin(angle - 0.4) * wing);
      ctx.lineTo(end.x - Math.cos(angle + 0.4) * wing, end.y - Math.sin(angle + 0.4) * wing);
      ctx.closePath();
      ctx.fill();

      // partícula destino
      const radius = this.base * 0.014 * appear * (1 + Math.sin(this.time * 2 + i) * 0.08);
      const glow = ctx.createRadialGradient(x, y, 0, x, y, radius * 3);
      glow.addColorStop(0, rgbaFrom(color, 0.8 * appear));
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, radius * 3, 0, TAU);
      ctx.fill();
      ctx.fillStyle = rgbaFrom(color, 0.95 * appear);
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, TAU);
      ctx.fill();
    });
  }

  /* Esferas que el pulpo recoge y absorbe (diapositiva 12) */
  drawBalls(ctx) {
    for (const ball of this.balls) {
      const color = hexToRgb(ball.color);
      const radius = ball.radius * ball.life * (ball.captured ? 1 - ball.pull * 0.3 : 1);
      if (radius <= 0.2) continue;
      const glow = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, radius * 3);
      glow.addColorStop(0, rgbaFrom(color, 0.7 * ball.life));
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, radius * 3, 0, TAU);
      ctx.fill();
      ctx.fillStyle = rgbaFrom(color, 0.92 * ball.life);
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, radius, 0, TAU);
      ctx.fill();

      if (ball.captured) {
        const head = this.headCenter;
        ctx.strokeStyle = rgbaFrom(color, 0.22 * ball.life);
        ctx.lineWidth = Math.max(1, this.base * 0.0018);
        ctx.beginPath();
        ctx.moveTo(ball.x, ball.y);
        ctx.lineTo(head.x, head.y);
        ctx.stroke();
      }
    }
  }
}
