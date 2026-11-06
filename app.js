const $ = id => document.getElementById(id);
let entered = false, musicPlayer, backgroundPlayer, backgroundPaused = false;
let musicReady = false, bgReady = false, muted = false, playing = false, seeking = false, musicError = false;
let toastTimer;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const trackId = '37-XZOXL36U';
function notify(message) {
  $('toast').textContent = message;
  $('toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 3200);
}
function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}
function updatePlayback(isPlaying) {
  playing = isPlaying;
  $('equalizer').classList.toggle('active', playing);
  $('music-toggle').querySelector('use').setAttribute('href', playing ? '#i-pause' : '#i-play');
  $('music-toggle').setAttribute('aria-label', playing ? 'Pausar música' : 'Reproducir música');
}
function renderPosition(current, duration) {
  $('elapsed').textContent = formatTime(current);
  $('seek').value = duration ? current / duration * 100 : 0;
  $('seek').style.setProperty('--progress', `${$('seek').value}%`);
  $('seek').setAttribute('aria-valuetext', `${formatTime(current)} de ${formatTime(duration)}`);
}
function updateTimeline() {
  if (!musicReady || musicError) return;
  const duration = musicPlayer.getDuration();
  if (duration > 0) {
    $('duration').textContent = formatTime(duration);
    $('seek').disabled = false;
    if (!seeking) renderPosition(musicPlayer.getCurrentTime(), duration);
  }
}
function updateMute() {
  $('mute').querySelector('use').setAttribute('href', muted ? '#i-muted' : '#i-volume');
  $('mute').setAttribute('aria-label', muted ? 'Activar música' : 'Silenciar música');
  $('mute').title = muted ? 'Activar música' : 'Silenciar música';
  if (musicReady) { if (muted) musicPlayer.mute(); else musicPlayer.unMute(); }
}
function failMusic() {
  musicError = true;
  updatePlayback(false);
  $('music-status').textContent = 'PULSA PARA REINTENTAR';
  $('seek').disabled = true;
}
function musicState(event) {
  updatePlayback(event.data === 1);
  $('music-status').textContent = event.data === 1 ? 'SONANDO AHORA' : event.data === 3 ? 'CARGANDO…' : 'ALQUIMISTA · KRISTOS';
  updateTimeline();
  if (event.data === 0 && entered) { musicPlayer.seekTo(0); musicPlayer.playVideo(); }
}
function startMusic() {
  if (!musicReady) { notify('La música está cargando.'); return; }
  if (musicError) { musicError = false; musicPlayer.loadVideoById(trackId); }
  musicPlayer.playVideo();
}
window.onYouTubeIframeAPIReady = () => {
  musicPlayer = new YT.Player('music-player', {
    host: 'https://www.youtube-nocookie.com', videoId: trackId, width: '200', height: '200',
    playerVars: { playsinline: 1, controls: 0, disablekb: 1, rel: 0, origin: location.origin },
    events: {
      onReady: event => {
        musicReady = true;
        musicError = false;
        const iframe = event.target.getIframe();
        iframe.title = 'Audio de Alquimista — Kristos';
        iframe.tabIndex = -1;
        iframe.setAttribute('aria-hidden', 'true');
        event.target.setVolume(Number($('volume').value));
        updateMute();
        $('music-status').textContent = 'ALQUIMISTA · KRISTOS';
        updateTimeline();
        if (entered) startMusic();
      },
      onStateChange: musicState,
      onError: failMusic,
      onAutoplayBlocked: () => { updatePlayback(false); $('music-status').textContent = 'PULSA PARA ESCUCHAR'; }
    }
  });
  if (!reducedMotion) backgroundPlayer = new YT.Player('background-player', {
    host: 'https://www.youtube-nocookie.com', videoId: 'gKf-Kp_Z8a4', width: '1920', height: '1080',
    playerVars: { autoplay: 1, mute: 1, controls: 0, disablekb: 1, playsinline: 1, rel: 0, start: 12, origin: location.origin },
    events: {
      onReady: event => {
        bgReady = true;
        event.target.getIframe().title = 'Vídeo de fondo sin sonido';
        event.target.getIframe().tabIndex = -1;
        event.target.mute();
        event.target.playVideo();
      },
      onStateChange: event => {
        if (event.data === 1) document.querySelector('.film').classList.add('playing');
        if (event.data === 0) { backgroundPlayer.seekTo(12); backgroundPlayer.playVideo(); }
      },
      onError: () => { document.querySelector('.film').classList.remove('playing'); $('background-toggle').hidden = true; }
    }
  });
};
$('enter').addEventListener('click', () => {
  if (entered) return;
  entered = true;
  $('enter').classList.add('leaving');
  $('experience').inert = false;
  $('experience').classList.add('entered');
  if (musicReady) startMusic();
  if (bgReady && !backgroundPaused) backgroundPlayer.playVideo();
  setTimeout(() => { $('enter').hidden = true; $('music-toggle').focus({ preventScroll: true }); }, 800);
});
$('music-toggle').addEventListener('click', () => { if (playing) musicPlayer.pauseVideo(); else startMusic(); });
$('seek').addEventListener('input', event => {
  seeking = true;
  const duration = musicPlayer.getDuration();
  $('elapsed').textContent = formatTime(Number(event.target.value) / 100 * duration);
  $('seek').style.setProperty('--progress', `${event.target.value}%`);
});
$('seek').addEventListener('change', event => {
  if (musicReady) {
    const duration = musicPlayer.getDuration();
    const current = Number(event.target.value) / 100 * duration;
    musicPlayer.seekTo(current, true);
    renderPosition(current, duration);
  }
  seeking = false;
});
$('mute').addEventListener('click', () => { muted = !muted; updateMute(); });
$('volume').addEventListener('input', event => {
  const volume = Number(event.target.value);
  if (musicReady) musicPlayer.setVolume(volume);
  muted = volume === 0;
  updateMute();
});
$('background-toggle').addEventListener('click', () => {
  if (!bgReady) { notify('El vídeo de fondo está cargando.'); return; }
  backgroundPaused = !backgroundPaused;
  if (backgroundPaused) backgroundPlayer.pauseVideo(); else backgroundPlayer.playVideo();
  $('background-toggle').querySelector('use').setAttribute('href', backgroundPaused ? '#i-play' : '#i-pause');
  $('background-toggle').querySelector('span').textContent = backgroundPaused ? 'Reanudar fondo' : 'Pausar fondo';
  $('background-toggle').setAttribute('aria-pressed', String(backgroundPaused));
});
$('copy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(location.origin + location.pathname); notify('Enlace copiado'); }
  catch { notify('Puedes copiar el enlace desde la barra de direcciones.'); }
});
if (reducedMotion) $('background-toggle').hidden = true;
const api = document.createElement('script');
api.src = 'https://www.youtube.com/iframe_api';
api.onerror = failMusic;
document.head.appendChild(api);
setInterval(updateTimeline, 400);
setTimeout(() => { if (!musicReady) failMusic(); }, 20000);

// Measure the stationary shell so the card never chases its own transformed bounds.
const cardShell = document.querySelector('.card-shell');
const profileCard = cardShell.querySelector('.profile');
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
const mouseHover = matchMedia('(hover: hover) and (pointer: fine)');
let tiltFrame = 0;
function resetCardTilt() {
  cancelAnimationFrame(tiltFrame);
  cardShell.classList.remove('is-tilting');
  profileCard.style.removeProperty('--tilt-x');
  profileCard.style.removeProperty('--tilt-y');
  profileCard.style.removeProperty('--card-lift');
}
cardShell.addEventListener('pointermove', event => {
  if (!entered || motionPreference.matches || !mouseHover.matches || event.pointerType !== 'mouse') return;
  const bounds = cardShell.getBoundingClientRect();
  const horizontal = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1));
  const vertical = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1));
  cancelAnimationFrame(tiltFrame);
  tiltFrame = requestAnimationFrame(() => {
    cardShell.classList.add('is-tilting');
    profileCard.style.setProperty('--tilt-x', `${(-vertical * 5).toFixed(2)}deg`);
    profileCard.style.setProperty('--tilt-y', `${(horizontal * 6).toFixed(2)}deg`);
    profileCard.style.setProperty('--card-lift', '-3px');
  });
});
cardShell.addEventListener('pointerleave', resetCardTilt);
cardShell.addEventListener('pointercancel', resetCardTilt);
window.addEventListener('blur', resetCardTilt);
motionPreference.addEventListener('change', resetCardTilt);
mouseHover.addEventListener('change', resetCardTilt);
