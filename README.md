# J.A.R.V.I.S. PWA — Stark Industries Edition

**Just A Rather Very Intelligent System**  
Asistente AI instalable en iPad, iPhone y Android. 100% gratuito, sin API keys de pago, funciona offline.

## Características

- Interfaz holográfica estilo Iron Man / Arc Reactor animado
- Reconocimiento de voz (Web Speech API) — funciona en Safari iPadOS y Chrome Android
- Síntesis de voz (TTS) en español
- Clima en tiempo real (Open-Meteo, sin clave)
- Notas persistentes (localStorage)
- Timers / temporizadores con aviso de voz
- Reloj, fecha, batería, métricas de sistema simuladas
- Comandos de lenguaje natural en español
- PWA instalable (Añadir a pantalla de inicio)
- Service Worker → funciona offline

## Cómo instalar en iPad

1. Activa **GitHub Pages** en este repositorio (Settings → Pages → Source: Deploy from a branch → main / root).
2. Espera 1-2 minutos y abre la URL que te da GitHub (ejemplo: `https://ancobs.github.io/jarvis-pwa/`).
3. En el **iPad** abre esa URL con **Safari**.
4. Toca el botón **Compartir** → **Añadir a pantalla de inicio**.
5. Confirma. Ya tienes J.A.R.V.I.S. como app nativa.

> **Importante**: Para micrófono y geolocalización necesita HTTPS (GitHub Pages ya lo da).

## Cómo probar localmente

```bash
# Clona el repo
git clone https://github.com/Ancobs/jarvis-pwa.git
cd jarvis-pwa
npx serve .
# o: python -m http.server 8080
```

Abre `http://localhost:3000` (o el puerto que indique) en el navegador.

## Comandos de ejemplo

- "Hola Jarvis"
- "¿Qué hora es?"
- "Clima" / "Clima en Barcelona"
- "Anota comprar café"
- "Muestra las notas"
- "Timer 2 minutos"
- "Cuánto es 15 * 24"
- "Estado de sistemas"
- "Cuéntame un chiste"
- "¿Quién eres?"

## Notas técnicas

- No usa ninguna API de pago (GPT, Claude, etc.). Las respuestas inteligentes son rule-based + personalidad Jarvis.
- Para una versión con LLM real (infinita conversación avanzada) se puede añadir después una clave de OpenRouter / Groq / etc. de forma opcional.
- El diseño es responsive y se ve excelente en iPad landscape y portrait.

Creado para superar demos de reels: esto es una **app real instalable**, no un video.  

Stark Industries — 2026
