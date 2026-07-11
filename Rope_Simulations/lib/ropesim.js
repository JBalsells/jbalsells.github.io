/* ══════════════════════════════════════════════════════════════════════
   Rope Simulations — librería compartida (RS)
   ----------------------------------------------------------------------
   Puerto JS del framework Python de "Física del Rescate":
     · RS.phys.*  → espejo FIEL de physics.py (única fuente de verdad).
     · RS.viz.*   → umbrales de color de viz.py (semáforo de seguridad).
     · RS.COLORS  → paleta terminal verde fósforo (config.py).
     · RS.draw.*  → helpers de canvas (flechas, badges, arcos, líneas).
     · RS.controls / RS.responsive → UI (slider + casilla editable, escala).
   Mantener physics.py y RS.phys sincronizados: cambiar la fórmula acá si
   cambia allá (y viceversa).
   ══════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  // ── Constantes físicas (config.py) ──────────────────────────────────
  var G = 9.81;
  var ROPE_STATIC_MBS = 30.0;   // MBS cuerda estática 11 mm (kN)
  var ROPE_DYNAMIC_MBS = 24.0;  // MBS cuerda dinámica 10 mm (kN)
  var NFPA_WORK_LOAD = 13.5;    // carga de trabajo NFPA (kN)
  var UIAA_MAX_IMPACT = 12.0;   // fuerza de choque máxima UIAA (kN)

  // ── Paleta terminal verde fósforo (config.COLORS) ───────────────────
  var COLORS = {
    bg: '#0a0f0a', panel: '#0e1a0e', primary: '#00ff33', secondary: '#ffb000',
    accent: '#00cc22', warning: '#ffcc00', danger: '#ff3333', info: '#00d9a0',
    text: '#88cc88', grid: '#1a2e1a', rope: '#aaff44', anchor: '#5c8a5c',
    white: '#c8ffc8'
  };

  var rad = function (d) { return d * Math.PI / 180; };
  var deg = function (r) { return r * 180 / Math.PI; };

  // ══════════════════════════════════════════════════════════════════
  //  FÍSICA — puerto fiel de physics.py
  // ══════════════════════════════════════════════════════════════════
  var phys = {
    weightKn: function (mass_kg) { return mass_kg * G / 1000.0; },

    // Ventaja mecánica simple (poleas)
    pulleyEffort: function (load, ma, efficiency) {
      efficiency = (efficiency === undefined) ? 1.0 : efficiency;
      if (ma <= 0 || efficiency <= 0) return Infinity;
      return load / (ma * efficiency);
    },
    pulleyHaulDistance: function (lift_distance, ma) { return ma * lift_distance; },

    // Anclaje en V
    vAnchorTensions: function (W_kn, theta_deg, phi_deg) {
      phi_deg = phi_deg || 0.0;
      var theta = rad(theta_deg), phi = rad(phi_deg), half = theta / 2.0;
      var sin_t = Math.sin(theta);
      if (Math.abs(sin_t) < 1e-2) return [99.0 * W_kn, 99.0 * W_kn];
      return [W_kn * Math.sin(half + phi) / sin_t, W_kn * Math.sin(half - phi) / sin_t];
    },

    // Factor de caída
    fallFactor: function (fall_m, rope_m) { return rope_m <= 0 ? 0.0 : fall_m / rope_m; },
    impactVelocity: function (fall_m) { return Math.sqrt(2.0 * G * Math.max(fall_m, 0.0)); },
    impactForceKn: function (mass_kg, ff, epsilon) {
      if (epsilon <= 0) return Infinity;
      return mass_kg * G * (1.0 + ff / epsilon) / 1000.0;
    },

    // Distribución multi-anclaje auto-ecualizado
    anchorForceDistribution: function (alpha_degs, W_kn) {
      var n = alpha_degs.length;
      if (n === 0) return [];
      var cosines = alpha_degs.map(function (a) { return Math.max(Math.cos(rad(a)), 0.0); });
      var cos_sum = cosines.reduce(function (s, c) { return s + c; }, 0);
      if (cos_sum < 1e-3) return alpha_degs.map(function () { return W_kn / n; });
      return cosines.map(function (c) { return W_kn * c / cos_sum; });
    },
    slingTension: function (force_kn, alpha_deg) {
      var cos_a = Math.cos(rad(alpha_deg));
      if (cos_a < 1e-2) return 99.99;
      return force_kn / cos_a;
    },

    // Tirolesa / highline con carga puntual
    ropeLengthForSag: function (L, h_A, h_B, d) {
      var y_P = (h_A + h_B) / 2.0 - d;
      var lPA = Math.sqrt(Math.pow(L / 2.0, 2) + Math.pow(y_P - h_A, 2));
      var lPB = Math.sqrt(Math.pow(L / 2.0, 2) + Math.pow(y_P - h_B, 2));
      return lPA + lPB;
    },
    spanForRope: function (rope_len, d, h_A, h_B, iters) {
      h_A = h_A || 0.0; h_B = h_B || 0.0; iters = iters || 60;
      var lo = 0.0, hi = rope_len;
      if (phys.ropeLengthForSag(0.0, h_A, h_B, d) >= rope_len) return 0.0;
      for (var i = 0; i < iters; i++) {
        var mid = (lo + hi) * 0.5;
        if (phys.ropeLengthForSag(mid, h_A, h_B, d) < rope_len) lo = mid; else hi = mid;
      }
      return (lo + hi) * 0.5;
    },
    solveLoadY: function (x, L, h_A, h_B, S, iters) {
      iters = iters || 64;
      if (x <= 0.005 * L) return h_A;
      if (x >= 0.995 * L) return h_B;
      var length = function (y) {
        return Math.sqrt(x * x + Math.pow(y - h_A, 2)) +
               Math.sqrt(Math.pow(L - x, 2) + Math.pow(y - h_B, 2));
      };
      var t = x / L;
      var y_hi = h_A * (1.0 - t) + h_B * t;
      var y_lo = y_hi - S;
      for (var i = 0; i < iters; i++) {
        var y_mid = (y_lo + y_hi) * 0.5;
        if (length(y_mid) < S) y_hi = y_mid; else y_lo = y_mid;
      }
      return (y_lo + y_hi) * 0.5;
    },
    tyroleanForces: function (x, L, h_A, h_B, y_P, W_kn) {
      x = Math.max(1e-4 * L, Math.min(x, (1 - 1e-4) * L));
      var lPA = Math.sqrt(x * x + Math.pow(y_P - h_A, 2));
      var lPB = Math.sqrt(Math.pow(L - x, 2) + Math.pow(y_P - h_B, 2));
      var denom = (L - x) * (h_A - y_P) / x + (h_B - y_P);
      var T_A, T_B;
      if (Math.abs(denom) < 1e-9 || lPA < 1e-9 || lPB < 1e-9) {
        T_A = T_B = 999.0;
      } else {
        T_B = W_kn * lPB / denom;
        T_A = T_B * (L - x) * lPA / (x * lPB);
      }
      var alpha_A = deg(Math.atan2(h_A - y_P, x));
      var alpha_B = deg(Math.atan2(h_B - y_P, L - x));
      var uA = [-x / lPA, (h_A - y_P) / lPA];
      var uB = [(L - x) / lPB, (h_B - y_P) / lPB];
      var cos_v = Math.max(-1.0, Math.min(1.0, uA[0] * uB[0] + uA[1] * uB[1]));
      var v_angle = deg(Math.acos(cos_v));
      return { T_A: T_A, T_B: T_B, W: W_kn, y_P: y_P, lPA: lPA, lPB: lPB,
               alpha_A: alpha_A, alpha_B: alpha_B, uA: uA, uB: uB, v_angle: v_angle };
    },

    // Tirolesa horizontal (h_A = h_B)
    highlineRopeLength: function (span, d_center) {
      var half = span / 2.0;
      return 2.0 * Math.sqrt(half * half + d_center * d_center);
    },
    solveSagAt: function (x, span, rope_length, iters) {
      iters = iters || 64;
      x = Math.max(1e-4 * span, Math.min(x, (1 - 1e-4) * span));
      var lo = 0.0001, hi = rope_length * 0.5;
      for (var i = 0; i < iters; i++) {
        var mid = (lo + hi) * 0.5;
        var s = Math.sqrt(x * x + mid * mid) + Math.sqrt(Math.pow(span - x, 2) + mid * mid);
        if (s < rope_length) lo = mid; else hi = mid;
      }
      return (lo + hi) * 0.5;
    },
    highlineForces: function (x, span, d, mass_kg) {
      var W_kn = phys.weightKn(mass_kg);
      x = Math.max(0.01 * span, Math.min(x, 0.99 * span));
      var alpha_L = Math.atan2(d, x);
      var alpha_R = Math.atan2(d, span - x);
      var H = d > 0.001 ? W_kn * x * (span - x) / (d * span) : 0.0;
      var T_L = Math.cos(alpha_L) > 1e-6 ? H / Math.cos(alpha_L) : 999.0;
      var T_R = Math.cos(alpha_R) > 1e-6 ? H / Math.cos(alpha_R) : 999.0;
      var v_angle = 180.0 - deg(alpha_L) - deg(alpha_R);
      return { W: W_kn, H: H, T_L: T_L, T_R: T_R, alpha_L_deg: deg(alpha_L),
               alpha_R_deg: deg(alpha_R), v_angle: v_angle, d: d, x: x };
    },
    highlinePulleyForces: function (x, span, d, mass_kg) {
      var W_kn = phys.weightKn(mass_kg);
      x = Math.max(0.01 * span, Math.min(x, 0.99 * span));
      var alpha_L = Math.atan2(d, x);
      var alpha_R = Math.atan2(d, span - x);
      var denom = Math.sin(alpha_L) + Math.sin(alpha_R);
      var T = denom > 1e-6 ? W_kn / denom : 999.0;
      var f_control = T * (Math.cos(alpha_L) - Math.cos(alpha_R));
      var v_angle = 180.0 - deg(alpha_L) - deg(alpha_R);
      return { W: W_kn, T: T, f_control: f_control, alpha_L_deg: deg(alpha_L),
               alpha_R_deg: deg(alpha_R), v_angle: v_angle, d: d, x: x };
    },

    // Suma vectorial
    resultant: function (forces) {
      var cx = 0, cy = 0, sum_arith = 0;
      forces.forEach(function (f) {
        cx += f[1] * Math.cos(rad(f[0]));
        cy += f[1] * Math.sin(rad(f[0]));
        sum_arith += f[1];
      });
      var R = Math.hypot(cx, cy);
      return { cx: cx, cy: cy, R: R, angle_deg: deg(Math.atan2(cy, cx)),
               efficiency: sum_arith > 0 ? R / sum_arith * 100.0 : 0.0 };
    },

    // Nudos y factor de seguridad
    knotMbs: function (rope_mbs_kn, eff_pct) { return rope_mbs_kn * eff_pct / 100.0; },
    safetyFactor: function (mbs_kn, load_kn) {
      return load_kn <= 1e-3 ? Infinity : mbs_kn / load_kn;
    }
  };

  // ══════════════════════════════════════════════════════════════════
  //  VIZ — umbrales de color (viz.py)
  // ══════════════════════════════════════════════════════════════════
  var viz = {
    RATIO_CAUTION: 0.75,
    RATIO_DANGER: 1.00,
    ratioColor: function (ratio) {
      if (ratio <= 0.75) return COLORS.accent;
      if (ratio <= 1.00) return COLORS.warning;
      return COLORS.danger;
    },
    ratioStatus: function (ratio) {
      if (ratio <= 0.75) return 'SEGURO';
      if (ratio <= 1.00) return 'PRECAUCIÓN';
      return 'PELIGROSO';
    },
    tensionColor: function (t_kn) {
      if (t_kn >= ROPE_STATIC_MBS) return COLORS.danger;
      if (t_kn >= NFPA_WORK_LOAD) return COLORS.secondary;
      if (t_kn >= NFPA_WORK_LOAD * 0.7) return COLORS.warning;
      return COLORS.accent;
    },
    vAngleColor: function (v_angle) {
      if (v_angle > 160) return COLORS.danger;
      if (v_angle > 140) return COLORS.secondary;
      if (v_angle > 120) return COLORS.warning;
      return COLORS.accent;
    }
  };

  // ══════════════════════════════════════════════════════════════════
  //  DRAW — helpers de canvas (fondo hi-DPI, flechas, badges, arcos)
  // ══════════════════════════════════════════════════════════════════
  var FONT = "'Roboto Mono', ui-monospace, monospace";

  var draw = {
    clear: function (ctx, w, h) {
      ctx.fillStyle = COLORS.bg;
      ctx.fillRect(0, 0, w, h);
    },
    arrow: function (ctx, x1, y1, x2, y2, color, lw, hs) {
      lw = lw || 2.5; hs = hs || 12;
      var ang = Math.atan2(y2 - y1, x2 - x1);
      ctx.save();
      ctx.strokeStyle = color; ctx.fillStyle = color;
      ctx.lineWidth = lw; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - hs * Math.cos(ang - 0.4), y2 - hs * Math.sin(ang - 0.4));
      ctx.lineTo(x2 - hs * Math.cos(ang + 0.4), y2 - hs * Math.sin(ang + 0.4));
      ctx.closePath(); ctx.fill();
      ctx.restore();
    },
    diamond: function (ctx, x, y, size, color) {
      ctx.save();
      ctx.fillStyle = color;
      ctx.strokeStyle = COLORS.bg; ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x, y - size); ctx.lineTo(x + size, y);
      ctx.lineTo(x, y + size); ctx.lineTo(x - size, y);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    },
    dot: function (ctx, x, y, r, color, stroke) {
      ctx.save();
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); }
      ctx.restore();
    },
    rrect: function (ctx, x, y, w, h, r) {
      r = Math.min(r || 5, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    },
    dashedLine: function (ctx, x1, y1, x2, y2, color, lw, dash) {
      ctx.save();
      ctx.strokeStyle = color; ctx.lineWidth = lw || 1;
      ctx.setLineDash(dash || [5, 4]);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.restore();
    },
    // Cuadro redondeado con líneas de texto centradas en (cx, cy).
    badge: function (ctx, cx, cy, lines, color, fs, bottom) {
      fs = fs || 10;
      ctx.save();
      ctx.font = 'bold ' + fs + 'px ' + FONT;
      var lh = fs + 6, pad = 6;
      var maxW = 0;
      lines.forEach(function (l) { maxW = Math.max(maxW, ctx.measureText(l).width); });
      var bw = maxW + pad * 2, bh = lines.length * lh + pad;
      var bx = cx - bw / 2;
      var by = bottom ? cy - bh - 4 : cy - bh / 2;
      ctx.fillStyle = COLORS.bg + 'F0';
      ctx.strokeStyle = color; ctx.lineWidth = 1.6;
      draw.rrect(ctx, bx, by, bw, bh, 5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      lines.forEach(function (line, i) {
        ctx.fillText(line, cx, by + pad / 2 + (i + 0.5) * lh);
      });
      ctx.restore();
    },
    text: function (ctx, x, y, str, color, fs, opts) {
      opts = opts || {};
      ctx.save();
      ctx.font = (opts.bold ? 'bold ' : '') + (opts.italic ? 'italic ' : '') + (fs || 11) + 'px ' + FONT;
      ctx.fillStyle = color;
      ctx.textAlign = opts.align || 'left';
      ctx.textBaseline = opts.baseline || 'alphabetic';
      ctx.fillText(str, x, y);
      ctx.restore();
    }
  };

  // Prepara un canvas para pantallas hi-DPI (dibuja en unidades CSS).
  function setupCanvas(canvas) {
    var dpr = global.devicePixelRatio || 1;
    var w = canvas.width, h = canvas.height;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    var ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    canvas._cssW = w; canvas._cssH = h;
    return ctx;
  }

  // ══════════════════════════════════════════════════════════════════
  //  CONTROLS — panel slider + casilla editable (attach_editable_numbers)
  // ══════════════════════════════════════════════════════════════════
  // specs: [{id,label,min,max,value,step,decimals,color,fmt}]
  // onChange(values) se llama en cada cambio. Devuelve { values(), set(id,v), get(id) }.
  function controls(mountEl, specs, onChange) {
    if (typeof mountEl === 'string') mountEl = document.getElementById(mountEl);
    var box = document.createElement('div');
    box.className = 'sim-controls';
    var title = document.createElement('div');
    title.className = 'ctrl-title';
    title.textContent = 'Controles';
    box.appendChild(title);

    var state = {}, sliders = {}, nums = {};

    specs.forEach(function (s) {
      var decimals = s.decimals === undefined ? 0 : s.decimals;
      state[s.id] = s.value;
      var row = document.createElement('div');
      row.className = 'ctrl-row';

      var lab = document.createElement('label');
      lab.textContent = s.label;
      if (s.color) lab.style.color = COLORS[s.color] || s.color;

      var range = document.createElement('input');
      range.type = 'range';
      range.min = s.min; range.max = s.max; range.step = s.step; range.value = s.value;
      if (s.color) range.style.accentColor = COLORS[s.color] || s.color;

      var num = document.createElement('input');
      num.type = 'number';
      num.min = s.min; num.max = s.max; num.step = s.step;
      num.value = (+s.value).toFixed(decimals);
      if (s.color) num.style.color = COLORS[s.color] || s.color;

      sliders[s.id] = range; nums[s.id] = num;

      range.addEventListener('input', function () {
        var v = +range.value;
        state[s.id] = v;
        num.value = v.toFixed(decimals);
        fire();
      });
      num.addEventListener('change', function () {
        var v = parseFloat(num.value.replace(',', '.'));
        if (isNaN(v)) { num.value = (+state[s.id]).toFixed(decimals); return; }
        v = Math.max(s.min, Math.min(s.max, v));
        state[s.id] = v;
        range.value = v;
        num.value = v.toFixed(decimals);
        fire();
      });

      row.appendChild(lab); row.appendChild(range); row.appendChild(num);
      box.appendChild(row);
    });

    mountEl.appendChild(box);

    function fire() { if (onChange) onChange(api.values()); }
    var api = {
      values: function () {
        var v = {}; for (var k in state) v[k] = state[k]; return v;
      },
      get: function (id) { return state[id]; },
      set: function (id, v) {
        var s = specs.filter(function (x) { return x.id === id; })[0];
        var decimals = s && s.decimals !== undefined ? s.decimals : 0;
        state[id] = v;
        if (sliders[id]) sliders[id].value = v;
        if (nums[id]) nums[id].value = (+v).toFixed(decimals);
      }
    };
    return api;
  }

  // Botonera de opciones exclusivas. options: [{label,value}] o valores sueltos.
  function buttonGroup(mountEl, options, initial, onSelect) {
    if (typeof mountEl === 'string') mountEl = document.getElementById(mountEl);
    var wrap = document.createElement('div');
    wrap.className = 'sim-buttons';
    var btns = [];
    options.forEach(function (opt) {
      var value = (opt && opt.value !== undefined) ? opt.value : opt;
      var label = (opt && opt.label !== undefined) ? opt.label : String(opt);
      var b = document.createElement('button');
      b.className = 'sim-btn' + (value === initial ? ' active' : '');
      b.textContent = label;
      b.addEventListener('click', function () {
        btns.forEach(function (x) { x.el.classList.toggle('active', x.value === value); });
        onSelect(value);
      });
      btns.push({ el: b, value: value });
      wrap.appendChild(b);
    });
    mountEl.appendChild(wrap);
    return {
      select: function (value) {
        btns.forEach(function (x) { x.el.classList.toggle('active', x.value === value); });
      }
    };
  }

  // ══════════════════════════════════════════════════════════════════
  //  RESPONSIVE — escala el stage a lo ancho disponible (como old sims)
  // ══════════════════════════════════════════════════════════════════
  function responsive(selector) {
    var s = document.querySelector(selector || '.sim-stage');
    if (!s) return;
    function init() {
      var saved = s.style.minWidth;
      s.style.minWidth = 'max-content';
      var nW = s.offsetWidth, nH = s.offsetHeight;
      s.style.minWidth = saved;
      if (!nW) return;
      var w = document.createElement('div');
      w.style.cssText = 'width:100%;overflow:hidden;';
      s.parentNode.insertBefore(w, s);
      w.appendChild(s);
      function rescale() {
        var a = w.clientWidth;
        if (a > 0 && a < nW) {
          var sc = a / nW;
          s.style.transformOrigin = 'top left';
          s.style.transform = 'scale(' + sc + ')';
          w.style.height = Math.ceil(nH * sc) + 'px';
        } else { s.style.transform = ''; w.style.height = ''; }
      }
      global.addEventListener('resize', rescale);
      rescale();
    }
    if (document.readyState === 'complete') init();
    else global.addEventListener('load', init);
  }

  function footerYear() {
    var el = document.getElementById('footer-year');
    if (el) el.textContent = new Date().getFullYear();
  }

  global.RS = {
    G: G, ROPE_STATIC_MBS: ROPE_STATIC_MBS, ROPE_DYNAMIC_MBS: ROPE_DYNAMIC_MBS,
    NFPA_WORK_LOAD: NFPA_WORK_LOAD, UIAA_MAX_IMPACT: UIAA_MAX_IMPACT,
    COLORS: COLORS, FONT: FONT, rad: rad, deg: deg,
    phys: phys, viz: viz, draw: draw,
    setupCanvas: setupCanvas, controls: controls, buttonGroup: buttonGroup,
    responsive: responsive, footerYear: footerYear
  };

})(window);
