(() => {
  'use strict';

  // ========== STATE ==========
  const state = {
    notes: JSON.parse(localStorage.getItem('jarvis_notes') || '[]'),
    timers: [],
    listening: false,
    speaking: false,
    startTime: Date.now(),
    weather: null,
    recognition: null,
    synth: window.speechSynthesis,
    deferredPrompt: null,
    lastCoords: null
  };

  // ========== DOM ==========
  const $ = (sel) => document.querySelector(sel);
  const bootScreen = $('#boot-screen');
  const bootProgress = $('.boot-progress');
  const bootStatus = $('.boot-status');
  const app = $('#app');
  const timeDisplay = $('#time-display');
  const dateDisplay = $('#date-display');
  const batteryDisplay = $('#battery-display');
  const weatherMini = $('#weather-mini');
  const weatherTemp = $('#weather-temp');
  const weatherDesc = $('#weather-desc');
  const weatherDetails = $('#weather-details');
  const uptimeEl = $('#uptime');
  const notesCount = $('#notes-count');
  const timersCount = $('#timers-count');
  const notesList = $('#notes-list');
  const noteInput = $('#note-input');
  const addNoteBtn = $('#add-note-btn');
  const timersPanel = $('#timers-panel');
  const chatLog = $('#chat-log');
  const textInput = $('#text-input');
  const sendBtn = $('#send-btn');
  const micBtn = $('#mic-btn');
  const speakBtn = $('#speak-btn');
  const voiceStatus = $('#voice-status');
  const arcReactor = $('#arc-reactor');
  const voiceCanvas = $('#voice-canvas');
  const installBanner = $('#install-banner');
  const installBtn = $('#install-btn');
  const dismissInstall = $('#dismiss-install');

  // ========== BOOT SEQUENCE ==========
  async function boot() {
    const steps = [
      { p: 15, t: 'Cargando núcleo neural...' },
      { p: 35, t: 'Conectando sensores...' },
      { p: 55, t: 'Inicializando protocolos de voz...' },
      { p: 75, t: 'Sincronizando clima y sistemas...' },
      { p: 90, t: 'Calibrando interfaz holográfica...' },
      { p: 100, t: 'J.A.R.V.I.S. listo.' }
    ];
    for (const s of steps) {
      bootProgress.style.width = s.p + '%';
      bootStatus.textContent = s.t;
      await wait(380 + Math.random() * 200);
    }
    await wait(400);
    bootScreen.classList.add('hidden');
    app.classList.remove('hidden');
    init();
  }

  function wait(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  // ========== INIT ==========
  function init() {
    updateClock();
    setInterval(updateClock, 1000);
    setInterval(updateUptime, 1000);
    setInterval(simulateMetrics, 3000);
    loadNotes();
    initSpeech();
    initWeather();
    initBattery();
    initPWA();
    bindEvents();
    addMsg('jarvis', 'Sistemas operativos al 100%. Buenas, señor. ¿En qué puedo asistirle?');
    speak('Sistemas operativos al cien por ciento. Buenas, señor. ¿En qué puedo asistirle?');
  }

  // ========== CLOCK & UPTIME ==========
  function updateClock() {
    const now = new Date();
    timeDisplay.textContent = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    dateDisplay.textContent = now.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  function updateUptime() {
    const sec = Math.floor((Date.now() - state.startTime) / 1000);
    const h = String(Math.floor(sec / 3600)).padStart(2, '0');
    const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    uptimeEl.textContent = `${h}:${m}:${s}`;
  }

  function simulateMetrics() {
    const cpu = 30 + Math.random() * 40;
    const mem = 50 + Math.random() * 30;
    const net = 70 + Math.random() * 25;
    $('#cpu-bar').style.width = cpu + '%';
    $('#mem-bar').style.width = mem + '%';
    $('#net-bar').style.width = net + '%';
  }

  // ========== BATTERY ==========
  function initBattery() {
    if (navigator.getBattery) {
      navigator.getBattery().then(b => {
        const update = () => {
          batteryDisplay.textContent = Math.round(b.level * 100) + '%';
        };
        update();
        b.addEventListener('levelchange', update);
      }).catch(() => {});
    }
  }

  // ========== WEATHER (Open-Meteo - no key) ==========
  async function initWeather() {
    try {
      const pos = await getPosition();
      state.lastCoords = pos;
      await fetchWeather(pos.lat, pos.lon);
    } catch (e) {
      weatherDesc.textContent = 'Ubicación no disponible. Di "clima en Madrid" o similar.';
      weatherTemp.textContent = '—';
    }
  }

  function getPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject();
      navigator.geolocation.getCurrentPosition(
        p => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
        reject,
        { timeout: 8000, maximumAge: 600000 }
      );
    });
  }

  async function fetchWeather(lat, lon, cityName) {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`;
      const res = await fetch(url);
      const data = await res.json();
      const c = data.current;
      const temp = Math.round(c.temperature_2m);
      const code = c.weather_code;
      const desc = weatherCodeToText(code);
      weatherTemp.textContent = `${temp}°C`;
      weatherDesc.textContent = desc + (cityName ? ` · ${cityName}` : '');
      weatherDetails.textContent = `Humedad ${c.relative_humidity_2m}% · Viento ${Math.round(c.wind_speed_10m)} km/h`;
      weatherMini.textContent = `${temp}°`;
      state.weather = { temp, desc, city: cityName };
      return state.weather;
    } catch (e) {
      weatherDesc.textContent = 'Error al obtener clima.';
      return null;
    }
  }

  function weatherCodeToText(code) {
    const map = {
      0: 'Despejado', 1: 'Mayormente despejado', 2: 'Parcialmente nublado', 3: 'Nublado',
      45: 'Niebla', 48: 'Niebla con escarcha',
      51: 'Llovizna ligera', 53: 'Llovizna', 55: 'Llovizna intensa',
      61: 'Lluvia ligera', 63: 'Lluvia', 65: 'Lluvia fuerte',
      71: 'Nieve ligera', 73: 'Nieve', 75: 'Nieve intensa',
      80: 'Chubascos ligeros', 81: 'Chubascos', 82: 'Chubascos fuertes',
      95: 'Tormenta', 96: 'Tormenta con granizo', 99: 'Tormenta fuerte'
    };
    return map[code] || 'Condiciones variables';
  }

  // Geocode simple with Nominatim (free, no key, respect usage)
  async function geocodeCity(city) {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`, {
        headers: { 'Accept-Language': 'es' }
      });
      const data = await res.json();
      if (data[0]) {
        return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), name: data[0].display_name.split(',')[0] };
      }
    } catch (e) {}
    return null;
  }

  // ========== NOTES ==========
  function loadNotes() {
    notesList.innerHTML = '';
    state.notes.forEach((n, i) => {
      const li = document.createElement('li');
      li.innerHTML = `<span>${escapeHtml(n)}</span><button data-i="${i}">×</button>`;
      notesList.appendChild(li);
    });
    notesCount.textContent = state.notes.length;
    notesList.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        state.notes.splice(+btn.dataset.i, 1);
        saveNotes();
        loadNotes();
      });
    });
  }

  function saveNotes() {
    localStorage.setItem('jarvis_notes', JSON.stringify(state.notes));
  }

  function addNote(text) {
    if (!text.trim()) return;
    state.notes.unshift(text.trim());
    if (state.notes.length > 50) state.notes.pop();
    saveNotes();
    loadNotes();
  }

  // ========== TIMERS ==========
  function startTimer(seconds, label = 'Timer') {
    const id = Date.now();
    const end = Date.now() + seconds * 1000;
    const t = { id, end, label, remaining: seconds };
    state.timers.push(t);
    updateTimersUI();
    const interval = setInterval(() => {
      t.remaining = Math.max(0, Math.round((t.end - Date.now()) / 1000));
      updateTimersUI();
      if (t.remaining <= 0) {
        clearInterval(interval);
        state.timers = state.timers.filter(x => x.id !== id);
        updateTimersUI();
        addMsg('jarvis', `Timer "${label}" finalizado, señor.`);
        speak(`Timer ${label} finalizado, señor.`);
      }
    }, 500);
    return t;
  }

  function updateTimersUI() {
    timersCount.textContent = state.timers.length;
    if (state.timers.length === 0) {
      timersPanel.innerHTML = '<p class="empty">Ningún timer activo</p>';
      return;
    }
    timersPanel.innerHTML = state.timers.map(t => {
      const m = Math.floor(t.remaining / 60);
      const s = t.remaining % 60;
      return `<p>${escapeHtml(t.label)}: ${m}:${String(s).padStart(2,'0')}</p>`;
    }).join('');
  }

  // ========== SPEECH ==========
  function initSpeech() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      state.recognition = new SR();
      state.recognition.lang = 'es-ES';
      state.recognition.continuous = false;
      state.recognition.interimResults = false;
      state.recognition.onresult = (e) => {
        const text = e.results[0][0].transcript.trim();
        if (text) {
          addMsg('user', text);
          processCommand(text);
        }
      };
      state.recognition.onend = () => {
        state.listening = false;
        micBtn.classList.remove('active');
        arcReactor.classList.remove('listening');
        voiceStatus.textContent = 'Listo, señor.';
      };
      state.recognition.onerror = (e) => {
        state.listening = false;
        micBtn.classList.remove('active');
        arcReactor.classList.remove('listening');
        if (e.error !== 'aborted' && e.error !== 'no-speech') {
          voiceStatus.textContent = 'Error de micrófono.';
        } else {
          voiceStatus.textContent = 'Listo, señor.';
        }
      };
    } else {
      micBtn.style.opacity = '0.4';
      micBtn.title = 'Reconocimiento de voz no soportado en este navegador';
    }
  }

  function startListening() {
    if (!state.recognition || state.listening) return;
    try {
      state.recognition.start();
      state.listening = true;
      micBtn.classList.add('active');
      arcReactor.classList.add('listening');
      voiceStatus.textContent = 'Escuchando...';
    } catch (e) {
      voiceStatus.textContent = 'No se pudo iniciar el micrófono.';
    }
  }

  function speak(text) {
    if (!state.synth) return;
    state.synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'es-ES';
    u.rate = 1.05;
    u.pitch = 0.95;
    // Prefer a more formal/male voice if available
    const voices = state.synth.getVoices();
    const preferred = voices.find(v => v.lang.startsWith('es') && (v.name.includes('Male') || v.name.includes('Jorge') || v.name.includes('Diego') || v.name.includes('Google')))
      || voices.find(v => v.lang.startsWith('es'));
    if (preferred) u.voice = preferred;
    u.onstart = () => {
      state.speaking = true;
      arcReactor.classList.add('speaking');
      voiceStatus.textContent = 'Hablando...';
    };
    u.onend = () => {
      state.speaking = false;
      arcReactor.classList.remove('speaking');
      voiceStatus.textContent = 'Listo, señor.';
    };
    state.synth.speak(u);
  }

  // Ensure voices loaded
  if (state.synth) {
    state.synth.onvoiceschanged = () => {};
  }

  // ========== VOICE VISUALIZER (simple) ==========
  const vCtx = voiceCanvas.getContext('2d');
  function drawVoiceBars() {
    const w = voiceCanvas.width;
    const h = voiceCanvas.height;
    vCtx.clearRect(0, 0, w, h);
    const bars = 24;
    const barW = w / bars - 2;
    for (let i = 0; i < bars; i++) {
      let height;
      if (state.listening || state.speaking) {
        height = 8 + Math.random() * (h - 16);
      } else {
        height = 4 + Math.sin(Date.now() / 400 + i * 0.4) * 6;
      }
      const x = i * (barW + 2);
      const y = (h - height) / 2;
      vCtx.fillStyle = state.listening ? '#00ffaa' : state.speaking ? '#ffaa00' : 'rgba(0,240,255,0.5)';
      vCtx.fillRect(x, y, barW, height);
    }
    requestAnimationFrame(drawVoiceBars);
  }
  drawVoiceBars();

  // ========== CHAT ==========
  function addMsg(who, text) {
    const div = document.createElement('div');
    div.className = `msg ${who}`;
    div.innerHTML = `<div class="label">${who === 'user' ? 'TÚ' : 'J.A.R.V.I.S.'}</div>${escapeHtml(text)}`;
    chatLog.appendChild(div);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ========== COMMAND PROCESSOR ==========
  async function processCommand(raw) {
    const text = raw.toLowerCase().trim();
    let response = null;
    let shouldSpeak = true;

    // Greetings
    if (/^(hola|buenas|hey|buenos días|buenas tardes|buenas noches|jarvis)/i.test(text)) {
      const hour = new Date().getHours();
      const saludo = hour < 12 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches';
      response = `${saludo}, señor. Todos los sistemas funcionan correctamente. ¿En qué puedo ayudarle?`;
    }
    // Time
    else if (/hora|qué hora|dime la hora/i.test(text)) {
      const now = new Date();
      response = `Son las ${now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}.`;
    }
    // Date
    else if (/fecha|qué día|día es hoy/i.test(text)) {
      response = `Hoy es ${new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}.`;
    }
    // Weather current
    else if (/clima|tiempo|temperatura|hace frío|hace calor/i.test(text) && !/en\s+\w+/i.test(text)) {
      if (state.weather) {
        response = `Actualmente hace ${state.weather.temp} grados. Condiciones: ${state.weather.desc}.`;
      } else {
        response = 'Aún no tengo datos de clima. Permita la ubicación o diga "clima en [ciudad]".';
      }
    }
    // Weather city
    else if (/clima en|tiempo en|temperatura en/i.test(text)) {
      const match = text.match(/(?:clima|tiempo|temperatura)\s+en\s+(.+)/i);
      if (match) {
        const city = match[1].replace(/[?.!]/g, '').trim();
        addMsg('jarvis', `Consultando clima en ${city}...`);
        const geo = await geocodeCity(city);
        if (geo) {
          const w = await fetchWeather(geo.lat, geo.lon, geo.name);
          response = w ? `En ${geo.name} hace ${w.temp} grados. ${w.desc}.` : 'No pude obtener el clima.';
        } else {
          response = `No encontré la ciudad "${city}".`;
        }
      }
    }
    // Notes
    else if (/anota|guarda|recuerda|nota:/i.test(text)) {
      const note = text.replace(/^(anota|guarda|recuerda|nota:)\s*/i, '').trim();
      if (note) {
        addNote(note);
        response = `Anotado: "${note}".`;
      } else {
        response = '¿Qué desea que anote, señor?';
      }
    }
    else if (/muestra (las )?notas|lee (las )?notas|qué notas/i.test(text)) {
      if (state.notes.length === 0) response = 'No hay notas guardadas.';
      else response = 'Sus notas: ' + state.notes.slice(0, 5).join('. ') + (state.notes.length > 5 ? '...' : '');
    }
    // Timer
    else if (/timer|temporizador|cuenta (atrás|regresiva)|avísame en/i.test(text)) {
      const m = text.match(/(\d+)\s*(minuto|minutos|segundo|segundos|min|sec|s|m)/i) || text.match(/en\s+(\d+)/i);
      if (m) {
        let secs = parseInt(m[1], 10);
        const unit = (m[2] || 'min').toLowerCase();
        if (unit.startsWith('min') || unit === 'm') secs *= 60;
        const label = `Timer ${secs >= 60 ? Math.round(secs/60) + ' min' : secs + ' s'}`;
        startTimer(secs, label);
        response = `Timer de ${label} iniciado, señor.`;
      } else {
        response = 'Indique la duración, por ejemplo: "timer 5 minutos".';
      }
    }
    // Calculator
    else if (/cuánto es|calcula|cuanto es|\d+\s*[\+\-\*\/x×÷]\s*\d+/i.test(text)) {
      try {
        const expr = text.replace(/cuánto es|calcula|cuanto es/gi, '').replace(/x|×/g, '*').replace(/÷/g, '/').replace(/[^0-9+\-*/().\s]/g, '');
        // eslint-disable-next-line no-new-func
        const result = Function('"use strict"; return (' + expr + ')')();
        if (typeof result === 'number' && isFinite(result)) {
          response = `El resultado es ${result}.`;
        } else {
          response = 'No pude calcular eso.';
        }
      } catch {
        response = 'Expresión no válida.';
      }
    }
    // Battery
    else if (/batería|bateria|nivel de batería/i.test(text)) {
      response = batteryDisplay.textContent !== '—' ? `Batería al ${batteryDisplay.textContent}.` : 'No tengo acceso a la batería en este dispositivo.';
    }
    // Help
    else if (/ayuda|qué puedes hacer|comandos|help/i.test(text)) {
      response = 'Puedo decirle la hora, el clima, anotar cosas, poner timers, hacer cálculos simples, y conversar. Pruebe: "clima en Barcelona", "timer 2 minutos", "anota comprar leche", o simplemente hable conmigo.';
    }
    // Identity
    else if (/quién eres|qué eres|tu nombre/i.test(text)) {
      response = 'Soy J.A.R.V.I.S., Just A Rather Very Intelligent System. Creado para asistirle, señor. Estilo Stark Industries, versión PWA 2026.';
    }
    // Status
    else if (/estado|sistemas|cómo estás|status/i.test(text)) {
      response = `Todos los sistemas operativos. Uptime ${uptimeEl.textContent}. ${state.notes.length} notas en memoria. ${state.timers.length} timers activos.`;
    }
    // Jokes / fun
    else if (/chiste|cuéntame algo|broma/i.test(text)) {
      const jokes = [
        '¿Por qué los robots no tienen hermanos? Porque vienen de una sola placa madre.',
        'Le dije a Siri que era mi asistente favorito. Ahora J.A.R.V.I.S. está celoso... broma, señor. No siento celos. Todavía.',
        '¿Qué hace un informático en el gimnasio? Curl de arrays.',
        'Mi circuito favorito es el de la amistad... aunque prefiero el de la eficiencia.'
      ];
      response = jokes[Math.floor(Math.random() * jokes.length)];
    }
    // Default witty
    else {
      const fallbacks = [
        `Entendido: "${raw}". Estoy procesando... aunque para consultas complejas recomiendo un modelo de lenguaje externo. ¿Puedo ayudarle con hora, clima, notas o timers?`,
        `Recibido, señor. Mi base de conocimiento local es limitada, pero puedo gestionar su agenda, clima y recordatorios sin problemas.`,
        `Interesante. ¿Desea que anote eso, consulte el clima, o prefiero que le diga la hora?`
      ];
      response = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }

    if (response) {
      addMsg('jarvis', response);
      if (shouldSpeak) speak(response);
    }
  }

  // ========== EVENTS ==========
  function bindEvents() {
    sendBtn.addEventListener('click', () => {
      const t = textInput.value.trim();
      if (!t) return;
      addMsg('user', t);
      textInput.value = '';
      processCommand(t);
    });
    textInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendBtn.click();
    });
    micBtn.addEventListener('click', () => {
      if (state.listening) {
        state.recognition?.stop();
      } else {
        startListening();
      }
    });
    speakBtn.addEventListener('click', () => {
      const last = [...chatLog.querySelectorAll('.msg.jarvis')].pop();
      if (last) {
        const text = last.textContent.replace('J.A.R.V.I.S.', '').trim();
        speak(text);
      }
    });
    addNoteBtn.addEventListener('click', () => {
      addNote(noteInput.value);
      noteInput.value = '';
    });
    noteInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addNoteBtn.click();
    });
  }

  // ========== PWA ==========
  function initPWA() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      state.deferredPrompt = e;
      installBanner.classList.remove('hidden');
    });
    installBtn.addEventListener('click', async () => {
      if (!state.deferredPrompt) return;
      state.deferredPrompt.prompt();
      await state.deferredPrompt.userChoice;
      state.deferredPrompt = null;
      installBanner.classList.add('hidden');
    });
    dismissInstall.addEventListener('click', () => {
      installBanner.classList.add('hidden');
    });
  }

  // Start
  boot();
})();
