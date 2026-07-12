/* ══════════════════════════════════════════════════════════════════════
   Terrain Analysis — "backend en el cliente" (TA)
   ----------------------------------------------------------------------
   Port a JavaScript del backend FastAPI de Terrain_Analysis para correr
   100% en el navegador (GitHub Pages, sin servidor). Reemplaza los endpoints
   /api/{config,surface,water,weather,weather/field} con:
     · cómputo local  → puerto fiel de core/geo.py, core/solar.py,
                        services/surface.py (malla + point-in-polygon +
                        proyección + suavizado).
     · fetch directo  → Open-Meteo (elevación + clima) y Overpass (agua),
                        ambos CORS `*` y sin API key.
   El único cambio de fuente vs el backend: elevación open-elevation →
   Open-Meteo /v1/elevation (tiene CORS y no rate-limitea igual). Las formas
   de respuesta son idénticas a las del backend, así el frontend no cambia.
   ══════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  // ── Constantes (espejo de core/config.py) ───────────────────────────
  var OPEN_METEO = 'https://api.open-meteo.com/v1';
  var OVERPASS_URLS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
  ];
  var SURFACE_GRID_MIN = 10, SURFACE_GRID_MAX = 120;
  var SURFACE_SMOOTH_WINDOW = 3;
  var WATER_MAX_FEATURES = 1200, OVERPASS_TIMEOUT_S = 40;
  var WEATHER_FIELD_GRID = 6;
  var SUN_LIGHT_SCALE = 100000.0;
  // Con elevación por tiles (abajo), el nº de requests no depende del detalle, así
  // que se puede usar una malla fina como el backend. 96×96 = buen relieve y Plotly
  // lo mueve con fluidez.
  var FRONTEND_DETAIL = 96, FRONTEND_WATER = true;

  var rad = function (d) { return d * Math.PI / 180; };
  var deg = function (r) { return r * 180 / Math.PI; };

  // ══════════════════════════════════════════════════════════════════
  //  core/geo.py — ray casting
  // ══════════════════════════════════════════════════════════════════
  function pointInPolygon(lon, lat, polygon) {
    var inside = false, n = polygon.length, j = n - 1;
    for (var i = 0; i < n; i++) {
      var xi = polygon[i][0], yi = polygon[i][1];
      var xj = polygon[j][0], yj = polygon[j][1];
      if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) inside = !inside;
      j = i;
    }
    return inside;
  }

  // ══════════════════════════════════════════════════════════════════
  //  services/surface.py — suavizado + generación de malla
  // ══════════════════════════════════════════════════════════════════
  function smoothGrid(g, window) {
    window = Math.floor(window);
    if (window < 3) return g;
    var half = window >> 1, R = g.length, C = R ? g[0].length : 0;
    var h = [], out = [], r, c, lo, hi, s;
    for (r = 0; r < R; r++) {
      h.push(new Array(C));
      for (c = 0; c < C; c++) {
        lo = Math.max(0, c - half); hi = Math.min(C, c + half + 1); s = 0;
        for (var k = lo; k < hi; k++) s += g[r][k];
        h[r][c] = s / (hi - lo);
      }
    }
    for (c = 0; c < C; c++) {
      for (r = 0; r < R; r++) {
        if (!out[r]) out[r] = new Array(C);
        lo = Math.max(0, r - half); hi = Math.min(R, r + half + 1); s = 0;
        for (var k2 = lo; k2 < hi; k2++) s += h[k2][c];
        out[r][c] = s / (hi - lo);
      }
    }
    return out;
  }

  // ── Elevación vía tiles Terrain-RGB (AWS Open Data, keyless + CORS `*`) ──
  // Se abandonó la API de elevación por-punto de open-elevation/Open-Meteo porque
  // rate-limitea las ráfagas (429). Un tile de 256×256 trae 65 536 muestras, así un
  // AOI típico se cubre con 1-9 tiles → pocas requests, sin rate-limit.
  // Codificación "terrarium":  elev_m = R·256 + G + B/256 − 32768.
  var TERRAIN_TILE = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium';

  function lonToGlobalPx(lon, z) { return (lon + 180) / 360 * Math.pow(2, z) * 256; }
  function latToGlobalPx(lat, z) {
    var s = Math.sin(rad(Math.max(-85.05, Math.min(85.05, lat))));
    return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * Math.pow(2, z) * 256;
  }
  function loadTile(z, tx, ty) {
    return new Promise(function (res, rej) {
      var img = new Image();
      img.crossOrigin = 'anonymous';                 // + CORS `*` → canvas no se "tainta"
      img.onload = function () {
        var cv = document.createElement('canvas'); cv.width = 256; cv.height = 256;
        var cx = cv.getContext('2d'); cx.drawImage(img, 0, 0);
        res(cx.getImageData(0, 0, 256, 256).data);
      };
      img.onerror = function () { rej(new Error('tile ' + z + '/' + tx + '/' + ty)); };
      img.src = TERRAIN_TILE + '/' + z + '/' + tx + '/' + ty + '.png';
    });
  }

  // Elevación de cada coord [lon,lat] por muestreo bilineal de las tiles que cubren
  // el AOI. Devuelve un array alineado a `coords` (igual que la API vieja).
  async function fetchElevations(coords, grid) {
    var lons = coords.map(function (p) { return p[0]; });
    var lats = coords.map(function (p) { return p[1]; });
    var west = Math.min.apply(null, lons), east = Math.max.apply(null, lons);
    var south = Math.min.apply(null, lats), north = Math.max.apply(null, lats);
    var lat0 = (north + south) / 2;
    // Zoom tal que la resolución del tile ≈ tamaño de celda de la malla.
    var widthM = Math.max((east - west) * 111320 * Math.cos(rad(lat0)), 1);
    var cell = Math.max(widthM / Math.max(grid, 1), 1);
    var z = Math.round(Math.log(156543.03 * Math.cos(rad(lat0)) / cell) / Math.LN2);
    z = Math.max(8, Math.min(14, z));

    var gx0 = lonToGlobalPx(west, z), gx1 = lonToGlobalPx(east, z);
    var gy0 = latToGlobalPx(north, z), gy1 = latToGlobalPx(south, z);   // norte = y menor
    var txMin = Math.floor((Math.min(gx0, gx1) - 1) / 256), txMax = Math.floor((Math.max(gx0, gx1) + 1) / 256);
    var tyMin = Math.floor((Math.min(gy0, gy1) - 1) / 256), tyMax = Math.floor((Math.max(gy0, gy1) + 1) / 256);

    var tiles = {}, jobs = [];
    for (var tx = txMin; tx <= txMax; tx++) {
      for (var ty = tyMin; ty <= tyMax; ty++) {
        (function (tx, ty) { jobs.push(loadTile(z, tx, ty).then(function (d) { tiles[tx + ',' + ty] = d; })); })(tx, ty);
      }
    }
    await Promise.all(jobs);

    function elevAt(px, py) {
      var tx = Math.floor(px / 256), ty = Math.floor(py / 256);
      var d = tiles[tx + ',' + ty];
      if (!d) return null;
      var lx = Math.max(0, Math.min(255, Math.floor(px) - tx * 256));
      var ly = Math.max(0, Math.min(255, Math.floor(py) - ty * 256));
      var i = (ly * 256 + lx) * 4;
      return (d[i] * 256 + d[i + 1] + d[i + 2] / 256) - 32768;
    }
    return coords.map(function (p) {
      var px = lonToGlobalPx(p[0], z), py = latToGlobalPx(p[1], z);
      var x0 = Math.floor(px), y0 = Math.floor(py), fx = px - x0, fy = py - y0;
      var e00 = elevAt(x0, y0), e10 = elevAt(x0 + 1, y0), e01 = elevAt(x0, y0 + 1), e11 = elevAt(x0 + 1, y0 + 1);
      if (e00 == null) e00 = (e10 != null ? e10 : (e01 != null ? e01 : (e11 != null ? e11 : 0)));
      if (e10 == null) e10 = e00; if (e01 == null) e01 = e00; if (e11 == null) e11 = e10;
      var top = e00 + (e10 - e00) * fx, bot = e01 + (e11 - e01) * fx;
      return top + (bot - top) * fy;
    });
  }

  // polygonLatLon = [{lat, lon}, ...] (lo que manda el frontend). Devuelve la
  // MISMA forma que /api/surface del backend.
  async function surface(polygonLatLon, grid) {
    var poly = polygonLatLon.map(function (p) { return [p.lon, p.lat]; });  // [lon,lat]
    grid = Math.max(SURFACE_GRID_MIN, Math.min(SURFACE_GRID_MAX, Math.floor(grid)));
    var R = grid, C = grid;

    var lons = poly.map(function (p) { return p[0]; });
    var lats = poly.map(function (p) { return p[1]; });
    var west = Math.min.apply(null, lons), east = Math.max.apply(null, lons);
    var south = Math.min.apply(null, lats), north = Math.max.apply(null, lats);
    var ex = (east - west) * 1e-4, ey = (north - south) * 1e-4;
    west += ex; east -= ex; south += ey; north -= ey;

    var lonAt = function (c) { return west + (east - west) * c / (C - 1); };
    var latAt = function (r) { return north - (north - south) * r / (R - 1); };

    var coords = [];
    for (var r = 0; r < R; r++) for (var c = 0; c < C; c++) coords.push([lonAt(c), latAt(r)]);
    var elevs = await fetchElevations(coords, grid);

    var raw = [];
    for (var r2 = 0; r2 < R; r2++) {
      var row = new Array(C);
      for (var c2 = 0; c2 < C; c2++) row[c2] = Number(elevs[r2 * C + c2]);
      raw.push(row);
    }
    var ge = smoothGrid(raw, SURFACE_SMOOTH_WINDOW);

    var lat0 = (north + south) / 2, lon0 = (west + east) / 2;
    var mx = 111320.0 * Math.cos(rad(lat0)), my = 110540.0;
    var round1 = function (v) { return Math.round(v * 10) / 10; };
    var x = [], y = [];
    for (var c3 = 0; c3 < C; c3++) x.push(round1((lonAt(c3) - lon0) * mx));
    for (var r3 = 0; r3 < R; r3++) y.push(round1((latAt(r3) - lat0) * my));

    var z = [], zmin = Infinity, zmax = -Infinity, inside = 0;
    for (var r4 = 0; r4 < R; r4++) {
      var zrow = new Array(C);
      for (var c4 = 0; c4 < C; c4++) {
        var e = ge[r4][c4];
        if (pointInPolygon(lonAt(c4), latAt(r4), poly)) {
          zrow[c4] = round1(e); zmin = Math.min(zmin, e); zmax = Math.max(zmax, e); inside++;
        } else zrow[c4] = null;
      }
      z.push(zrow);
    }
    if (inside === 0) {
      z = ge.map(function (row) { return row.map(round1); });
      var flat = [].concat.apply([], z);
      zmin = Math.min.apply(null, flat); zmax = Math.max.apply(null, flat); inside = R * C;
    }
    return {
      x: x, y: y, z: z, zmin: round1(zmin), zmax: round1(zmax),
      grid: grid, inside: inside,
      lon0: lon0, lat0: lat0, mx: Math.round(mx * 1e4) / 1e4, my: my
    };
  }

  // ══════════════════════════════════════════════════════════════════
  //  core/solar.py — posición solar + vector de luz (puro, offline)
  // ══════════════════════════════════════════════════════════════════
  function julianDay(date) {
    var yy = date.getUTCFullYear(), m = date.getUTCMonth() + 1;
    var day = date.getUTCDate() + (date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600) / 24;
    if (m <= 2) { yy -= 1; m += 12; }
    var a = Math.floor(yy / 100), b = 2 - a + Math.floor(a / 4);
    return Math.floor(365.25 * (yy + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524.5;
  }
  function solarPosition(lat, lon, date) {
    var d = julianDay(date) - 2451545.0;
    var mod = function (v, m) { return ((v % m) + m) % m; };
    var L = mod(280.460 + 0.9856474 * d, 360);
    var g = rad(mod(357.528 + 0.9856003 * d, 360));
    var lam = rad(mod(L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g), 360));
    var eps = rad(23.439 - 0.0000004 * d);
    var decl = Math.asin(Math.sin(eps) * Math.sin(lam));
    var raDeg = mod(deg(Math.atan2(Math.cos(eps) * Math.sin(lam), Math.cos(lam))), 360);
    var gmst = mod(280.46061837 + 360.98564736629 * d, 360);
    var lmst = mod(gmst + lon, 360);
    var h = rad(lmst - raDeg);
    var phi = rad(lat);
    var elev = Math.asin(Math.sin(phi) * Math.sin(decl) + Math.cos(phi) * Math.cos(decl) * Math.cos(h));
    var azS = Math.atan2(Math.sin(h), Math.cos(h) * Math.sin(phi) - Math.tan(decl) * Math.cos(phi));
    var az = mod(deg(azS) + 180, 360);
    return [az, deg(elev)];
  }
  function lightVector(azDeg, elevDeg, scale) {
    var a = rad(azDeg), e = rad(elevDeg);
    var r1 = function (v) { return Math.round(v * 10) / 10; };
    return { x: r1(Math.cos(e) * Math.sin(a) * scale), y: r1(Math.cos(e) * Math.cos(a) * scale), z: r1(Math.sin(e) * scale) };
  }

  // ══════════════════════════════════════════════════════════════════
  //  services/weather.py — clima (Open-Meteo) + sol
  // ══════════════════════════════════════════════════════════════════
  var WMO = {
    0: 'Despejado', 1: 'Mayormente despejado', 2: 'Parcialmente nublado', 3: 'Nublado',
    45: 'Niebla', 48: 'Niebla con escarcha', 51: 'Llovizna ligera', 53: 'Llovizna', 55: 'Llovizna intensa',
    56: 'Llovizna helada', 57: 'Llovizna helada intensa', 61: 'Lluvia ligera', 63: 'Lluvia', 65: 'Lluvia intensa',
    66: 'Lluvia helada', 67: 'Lluvia helada intensa', 71: 'Nieve ligera', 73: 'Nieve', 75: 'Nieve intensa',
    77: 'Granos de nieve', 80: 'Chubascos ligeros', 81: 'Chubascos', 82: 'Chubascos violentos',
    85: 'Chubascos de nieve', 86: 'Chubascos de nieve intensos', 95: 'Tormenta eléctrica',
    96: 'Tormenta con granizo', 99: 'Tormenta con granizo fuerte'
  };
  function describeWmo(code) { return code == null ? null : (WMO[Number(code)] || ('Código ' + code)); }
  function windUv(fromDeg, speed) {
    var to = rad(((Number(fromDeg) + 180) % 360));
    return [Math.round(Math.sin(to) * speed * 1e3) / 1e3, Math.round(Math.cos(to) * speed * 1e3) / 1e3];
  }
  function visibilityAt(j, t) {
    var hourly = j.hourly || {}, times = hourly.time || [], vals = hourly.visibility || [];
    if (t) { var pref = t.slice(0, 13); for (var i = 0; i < times.length; i++) if (times[i].slice(0, 13) === pref && i < vals.length) return vals[i]; }
    return vals.length ? vals[0] : null;
  }
  function sunInfo(lat, lon, atDate) {
    var sp = solarPosition(lat, lon, atDate), az = sp[0], elev = sp[1], isUp = elev > 0;
    var ambient, diffuse, lvElev;
    if (isUp) { ambient = 0.35; diffuse = 0.95; lvElev = Math.max(elev, 4.0); }
    else { ambient = 0.22; diffuse = 0.30; lvElev = 8.0; }
    var lv = lightVector(az, lvElev, SUN_LIGHT_SCALE);
    return { azimuth_deg: Math.round(az * 10) / 10, elevation_deg: Math.round(elev * 10) / 10, is_up: isUp,
             light: { x: lv.x, y: lv.y, z: lv.z, ambient: ambient, diffuse: diffuse } };
  }

  async function weather(lat, lon, atIso) {
    var at = atIso ? new Date(atIso) : new Date();
    var notes = [], cond = null;
    try {
      var p = new URLSearchParams({
        latitude: lat, longitude: lon,
        current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m',
        hourly: 'visibility', daily: 'sunrise,sunset', wind_speed_unit: 'kmh', timezone: 'auto', forecast_days: 1
      });
      var r = await fetch(OPEN_METEO + '/forecast?' + p.toString());
      if (!r.ok) throw new Error('HTTP ' + r.status);
      var j = await r.json(), cur = j.current || {}, daily = j.daily || {}, units = j.current_units || {};
      cond = {
        observed_at: cur.time, temp_c: cur.temperature_2m, feels_c: cur.apparent_temperature,
        humidity_pct: cur.relative_humidity_2m, precip_mm: cur.precipitation, cloud_pct: cur.cloud_cover,
        visibility_m: visibilityAt(j, cur.time), code: cur.weather_code, condition: describeWmo(cur.weather_code),
        is_day: cur.is_day == null ? null : !!cur.is_day,
        sunrise: (daily.sunrise || [null])[0], sunset: (daily.sunset || [null])[0],
        wind_speed: cur.wind_speed_10m, wind_gust: cur.wind_gusts_10m, wind_dir_deg: cur.wind_direction_10m,
        wind_unit: units.wind_speed_10m || 'km/h'
      };
    } catch (exc) {
      cond = { observed_at: null, temp_c: null, feels_c: null, humidity_pct: null, precip_mm: null,
               cloud_pct: null, visibility_m: null, code: null, condition: null, is_day: null,
               sunrise: null, sunset: null, wind_speed: 0, wind_gust: null, wind_dir_deg: 0, wind_unit: 'km/h' };
      notes.push('Clima no disponible (' + (exc && exc.name || 'error') + '); solo posición solar.');
    }
    var uv = windUv(cond.wind_dir_deg || 0, cond.wind_speed || 0);
    return {
      lat: lat, lon: lon, observed_at: cond.observed_at, temp_c: cond.temp_c, feels_c: cond.feels_c,
      humidity_pct: cond.humidity_pct, precip_mm: cond.precip_mm, cloud_pct: cond.cloud_pct,
      visibility_m: cond.visibility_m, code: cond.code, condition: cond.condition, is_day: cond.is_day,
      sunrise: cond.sunrise, sunset: cond.sunset,
      wind: { speed: cond.wind_speed, gust: cond.wind_gust, dir_deg: cond.wind_dir_deg, unit: cond.wind_unit, u: uv[0], v: uv[1] },
      sun: sunInfo(lat, lon, at), source: 'open-meteo', notes: notes
    };
  }

  function bbox(polygonLatLon) {
    var lons = polygonLatLon.map(function (p) { return p.lon; });
    var lats = polygonLatLon.map(function (p) { return p.lat; });
    return [Math.min.apply(null, lats), Math.min.apply(null, lons), Math.max.apply(null, lats), Math.max.apply(null, lons)];
  }

  async function weatherField(polygonLatLon, grid) {
    var bb = bbox(polygonLatLon), s = bb[0], w = bb[1], n = bb[2], e = bb[3];
    if (grid == null) {
      var midlat = rad((n + s) / 2);
      var spanKm = Math.max((n - s) * 111.0, (e - w) * 111.0 * Math.cos(midlat));
      grid = Math.round(spanKm / 18.0);
    }
    grid = Math.max(WEATHER_FIELD_GRID, Math.min(16, Math.floor(grid) || WEATHER_FIELD_GRID));
    var rows = grid, cols = grid, coords = [], latlon = [];
    for (var r = 0; r < rows; r++) {
      var lat = rows > 1 ? n - (n - s) * (r / (rows - 1)) : (n + s) / 2;
      for (var c = 0; c < cols; c++) {
        var lon = cols > 1 ? w + (e - w) * (c / (cols - 1)) : (w + e) / 2;
        coords.push([lon, lat]); latlon.push([lat, lon]);
      }
    }
    var notes = [], data;
    try {
      var lats = coords.map(function (p) { return (Math.round(p[1] * 1e4) / 1e4); }).join(',');
      var lons = coords.map(function (p) { return (Math.round(p[0] * 1e4) / 1e4); }).join(',');
      var p = OPEN_METEO + '/forecast?latitude=' + lats + '&longitude=' + lons + '&current=precipitation,weather_code,cloud_cover';
      var rq = await fetch(p);
      if (!rq.ok) throw new Error('HTTP ' + rq.status);
      var j = await rq.json(), items = Array.isArray(j) ? j : [j];
      data = items.map(function (it) {
        var cur = it.current || {};
        return { precip_mm: cur.precipitation, cloud_pct: cur.cloud_cover, code: cur.weather_code };
      });
    } catch (exc) {
      data = coords.map(function () { return { precip_mm: null, cloud_pct: null, code: null }; });
      notes.push('Campo de clima no disponible (' + (exc && exc.name || 'error') + ').');
    }
    var cells = data.map(function (dd, i) {
      return { lat: latlon[i][0], lon: latlon[i][1], precip_mm: dd.precip_mm, cloud_pct: dd.cloud_pct, code: dd.code };
    });
    return { cells: cells, rows: rows, cols: cols, south: s, west: w, north: n, east: e, source: 'open-meteo', notes: notes };
  }

  // ══════════════════════════════════════════════════════════════════
  //  services/water.py — Overpass (con espejos de respaldo)
  // ══════════════════════════════════════════════════════════════════
  function classify(tags) {
    if (tags.waterway) return 'line';
    if (tags.natural === 'coastline') return 'coast';
    return 'area';
  }
  function parseOverpass(data, maxFeatures) {
    maxFeatures = maxFeatures || WATER_MAX_FEATURES;
    var feats = [], els = data.elements || [];
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.type === 'way' && el.geometry) {
        feats.push({ kind: classify(el.tags || {}), coords: el.geometry.map(function (g) { return [g.lon, g.lat]; }) });
      } else if (el.type === 'relation') {
        (el.members || []).forEach(function (m) {
          if (m.geometry) feats.push({ kind: 'area', coords: m.geometry.map(function (g) { return [g.lon, g.lat]; }) });
        });
      }
      if (feats.length >= maxFeatures) break;
    }
    return feats;
  }
  var WATER_CACHE = {};
  async function water(polygonLatLon) {
    var bb = bbox(polygonLatLon), s = bb[0], w = bb[1], n = bb[2], e = bb[3];
    var key = [s, w, n, e].map(function (v) { return v.toFixed(3); }).join(',');
    if (WATER_CACHE[key]) return WATER_CACHE[key];
    var b = s + ',' + w + ',' + n + ',' + e;
    var query = '[out:json][timeout:' + Math.floor(OVERPASS_TIMEOUT_S) + '];(' +
      'way["natural"="water"](' + b + ');' +
      'way["waterway"~"river|stream|canal"](' + b + ');' +
      'way["natural"="coastline"](' + b + ');' +
      'relation["natural"="water"](' + b + ');' +
      ');out geom;';
    var last = null;
    for (var i = 0; i < OVERPASS_URLS.length; i++) {
      try {
        // Timeout de cliente: si un espejo se cuelga, aborta y prueba el siguiente
        // (fetch por sí solo no tiene timeout → sin esto podría esperar para siempre).
        var ctrl = new AbortController();
        var to = setTimeout(function () { ctrl.abort(); }, (OVERPASS_TIMEOUT_S + 10) * 1000);
        var r;
        try {
          r = await fetch(OVERPASS_URLS[i], {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'data=' + encodeURIComponent(query),
            signal: ctrl.signal
          });
        } finally { clearTimeout(to); }
        if (!r.ok) throw new Error('HTTP ' + r.status);
        var feats = parseOverpass(await r.json());
        var res = { features: feats, count: feats.length };
        WATER_CACHE[key] = res;
        return res;
      } catch (exc) { last = exc; }
    }
    throw last || new Error('Overpass no respondió');
  }

  function config() { return Promise.resolve({ detail: FRONTEND_DETAIL, water: FRONTEND_WATER }); }

  global.TA = {
    config: config, surface: surface, water: water, weather: weather, weatherField: weatherField,
    // expuestos por si se quieren testear (paridad con los módulos puros del backend)
    _pointInPolygon: pointInPolygon, _smoothGrid: smoothGrid,
    _solarPosition: solarPosition, _lightVector: lightVector, _windUv: windUv, _describeWmo: describeWmo
  };

})(window);
