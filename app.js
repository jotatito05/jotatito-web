const $ = id => document.getElementById(id);
const ui = Object.fromEntries(['toast','equalizer','music-toggle','seek','elapsed','duration','music-status','mute','volume','background-toggle','enter','experience','copy'].map(id => [id, $(id)]));
const film = document.querySelector('.film');
const trackId = '37-XZOXL36U';
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
const mouseHover = matchMedia('(hover: hover) and (pointer: fine)');
let entered = false, apiReady = false, musicPlayer, backgroundPlayer;
let musicReady = false, bgReady = false, backgroundPaused = false, muted = false;
let playing = false, seeking = false, musicError = false;
let toastTimer, timelineTimer, backgroundTimer, resizeFrame;
let lastSecond = -1, lastDuration = -1;
function setText(element, text) { if (element.textContent !== text) element.textContent = text; }
function notify(message) {
  setText(ui.toast, message);
  ui.toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ui.toast.classList.remove('visible'), 3200);
}
function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}
function scheduleTimeline() {
  clearTimeout(timelineTimer);
  if (playing && !document.hidden) timelineTimer = setTimeout(() => {
    updateTimeline();
    scheduleTimeline();
  }, 500);
}
function updatePlayback(isPlaying) {
  if (playing !== isPlaying) {
    playing = isPlaying;
    ui.equalizer.classList.toggle('active', playing);
    ui['music-toggle'].querySelector('use').setAttribute('href', playing ? '#i-pause' : '#i-play');
    ui['music-toggle'].setAttribute('aria-label', playing ? 'Pausar música' : 'Reproducir música');
  }
  scheduleTimeline();
}
function renderPosition(current, duration) {
  const percent = duration ? current / duration * 100 : 0;
  ui.seek.value = percent;
  ui.seek.style.setProperty('--progress', `${percent.toFixed(2)}%`);
  const second = Math.floor(current);
  if (second !== lastSecond) {
    lastSecond = second;
    setText(ui.elapsed, formatTime(current));
    ui.seek.setAttribute('aria-valuetext', `${formatTime(current)} de ${formatTime(duration)}`);
  }
}
function updateTimeline() {
  if (!musicReady || musicError || document.hidden) return;
  const duration = musicPlayer.getDuration();
  if (duration > 0) {
    const rounded = Math.floor(duration);
    if (rounded !== lastDuration) {
      lastDuration = rounded;
      setText(ui.duration, formatTime(duration));
      ui.seek.disabled = false;
    }
    if (!seeking) renderPosition(musicPlayer.getCurrentTime(), duration);
  }
}
function updateMute() {
  ui.mute.querySelector('use').setAttribute('href', muted ? '#i-muted' : '#i-volume');
  ui.mute.setAttribute('aria-label', muted ? 'Activar música' : 'Silenciar música');
  ui.mute.title = muted ? 'Activar música' : 'Silenciar música';
  if (musicReady) { if (muted) musicPlayer.mute(); else musicPlayer.unMute(); }
}
function failMusic() {
  musicError = true;
  updatePlayback(false);
  setText(ui['music-status'], 'PULSA PARA REINTENTAR');
  ui.seek.disabled = true;
}
function musicState(event) {
  updatePlayback(event.data === 1);
  setText(ui['music-status'], event.data === 1 ? 'SONANDO AHORA' : event.data === 3 ? 'CARGANDO…' : 'ALQUIMISTA · KRISTOS');
  updateTimeline();
  if (event.data === 0 && entered) { musicPlayer.seekTo(0); musicPlayer.playVideo(); }
}
function startMusic() {
  if (!musicReady) { notify('La música está cargando.'); return; }
  if (musicError) { musicError = false; lastDuration = -1; musicPlayer.loadVideoById(trackId); }
  musicPlayer.playVideo();
}
function resizeBackground() {
  // A small player viewport is upscaled by the compositor, without a full-screen blur.
  film.style.setProperty('--video-scale', (Math.max(innerWidth / 640, innerHeight / 360) * 1.02).toFixed(4));
}
function createBackground() {
  if (!apiReady || !entered || backgroundPlayer || motionPreference.matches || document.hidden) return;
  resizeBackground();
  backgroundPlayer = new YT.Player('background-player', {
    host: 'https://www.youtube-nocookie.com', videoId: 'gKf-Kp_Z8a4', width: '640', height: '360',
    playerVars: { autoplay: 1, mute: 1, controls: 0, disablekb: 1, playsinline: 1, rel: 0, start: 12, origin: location.origin },
    events: {
      onReady: event => {
        bgReady = true;
        event.target.getIframe().title = 'Vídeo de fondo sin sonido';
        event.target.getIframe().tabIndex = -1;
        event.target.mute();
        if (!document.hidden && !backgroundPaused) event.target.playVideo();
        else event.target.pauseVideo();
      },
      onStateChange: event => {
        if (event.data === 1) film.classList.add('playing');
        if (event.data === 0 && !document.hidden && !backgroundPaused) { backgroundPlayer.seekTo(12); backgroundPlayer.playVideo(); }
      },
      onError: () => { film.classList.remove('playing'); ui['background-toggle'].hidden = true; }
    }
  });
}
function queueBackground() {
  clearTimeout(backgroundTimer);
  if (!backgroundPlayer && entered && apiReady) backgroundTimer = setTimeout(createBackground, 850);
}
window.onYouTubeIframeAPIReady = () => {
  apiReady = true;
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
        event.target.setVolume(Number(ui.volume.value));
        updateMute();
        setText(ui['music-status'], 'ALQUIMISTA · KRISTOS');
        updateTimeline();
        if (entered) startMusic();
      },
      onStateChange: musicState,
      onError: failMusic,
      onAutoplayBlocked: () => { updatePlayback(false); setText(ui['music-status'], 'PULSA PARA ESCUCHAR'); }
    }
  });
  queueBackground();
};
ui.enter.addEventListener('click', () => {
  if (entered) return;
  entered = true;
  ui.enter.classList.add('leaving');
  ui.experience.inert = false;
  ui.experience.classList.add('entered');
  if (musicReady) startMusic();
  queueBackground();
  setTimeout(() => { ui.enter.hidden = true; ui['music-toggle'].focus({ preventScroll: true }); }, 800);
});
ui['music-toggle'].addEventListener('click', () => { if (playing) musicPlayer.pauseVideo(); else startMusic(); });
ui.seek.addEventListener('input', event => {
  seeking = true;
  const duration = musicPlayer.getDuration();
  const current = Number(event.target.value) / 100 * duration;
  setText(ui.elapsed, formatTime(current));
  ui.seek.setAttribute('aria-valuetext', `${formatTime(current)} de ${formatTime(duration)}`);
  ui.seek.style.setProperty('--progress', `${event.target.value}%`);
});
ui.seek.addEventListener('change', event => {
  if (musicReady) {
    const duration = musicPlayer.getDuration();
    const current = Number(event.target.value) / 100 * duration;
    musicPlayer.seekTo(current, true);
    lastSecond = -1;
    renderPosition(current, duration);
  }
  seeking = false;
});
ui.mute.addEventListener('click', () => { muted = !muted; updateMute(); });
ui.volume.addEventListener('input', event => {
  const volume = Number(event.target.value);
  if (musicReady) musicPlayer.setVolume(volume);
  muted = volume === 0;
  updateMute();
});
ui['background-toggle'].addEventListener('click', () => {
  if (!bgReady) { notify('El vídeo de fondo está cargando.'); return; }
  backgroundPaused = !backgroundPaused;
  if (backgroundPaused) backgroundPlayer.pauseVideo(); else backgroundPlayer.playVideo();
  ui['background-toggle'].querySelector('use').setAttribute('href', backgroundPaused ? '#i-play' : '#i-pause');
  ui['background-toggle'].querySelector('span').textContent = backgroundPaused ? 'Reanudar fondo' : 'Pausar fondo';
  ui['background-toggle'].setAttribute('aria-pressed', String(backgroundPaused));
});
ui.copy.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(location.origin + location.pathname); notify('Enlace copiado'); }
  catch { notify('Puedes copiar el enlace desde la barra de direcciones.'); }
});

const cardShell = document.querySelector('.card-shell');
const profileCard = cardShell.querySelector('.profile');
let bounds, tiltFrame = 0, tiltX = 0, tiltY = 0, targetX = 0, targetY = 0;
function animateTilt() {
  tiltX += (targetX - tiltX) * .2;
  tiltY += (targetY - tiltY) * .2;
  const settled = Math.abs(targetX - tiltX) + Math.abs(targetY - tiltY) < .02;
  if (settled) { tiltX = targetX; tiltY = targetY; }
  profileCard.style.transform = `perspective(1000px) translate3d(0,-3px,0) rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg)`;
  tiltFrame = settled ? 0 : requestAnimationFrame(animateTilt);
}
function resetCardTilt() {
  cancelAnimationFrame(tiltFrame);
  tiltFrame = 0;
  bounds = null;
  tiltX = tiltY = targetX = targetY = 0;
  cardShell.classList.remove('is-tilting');
  profileCard.style.removeProperty('transform');
}
cardShell.addEventListener('pointerenter', () => {
  if (mouseHover.matches && !motionPreference.matches) bounds = cardShell.getBoundingClientRect();
}, { passive: true });
cardShell.addEventListener('pointermove', event => {
  if (!entered || motionPreference.matches || !mouseHover.matches || event.pointerType !== 'mouse') return;
  // Read geometry once per hover, then only change the composited transform.
  if (!bounds) bounds = cardShell.getBoundingClientRect();
  const horizontal = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1));
  const vertical = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1));
  targetX = -vertical * 5;
  targetY = horizontal * 6;
  cardShell.classList.add('is-tilting');
  if (!tiltFrame) tiltFrame = requestAnimationFrame(animateTilt);
}, { passive: true });
cardShell.addEventListener('pointerleave', resetCardTilt);
cardShell.addEventListener('pointercancel', resetCardTilt);
window.addEventListener('blur', resetCardTilt);
window.addEventListener('scroll', resetCardTilt, { passive: true });
window.addEventListener('resize', () => {
  resetCardTilt();
  if (!resizeFrame) resizeFrame = requestAnimationFrame(() => { resizeFrame = 0; resizeBackground(); });
}, { passive: true });
mouseHover.addEventListener('change', resetCardTilt);
motionPreference.addEventListener('change', () => {
  resetCardTilt();
  ui['background-toggle'].hidden = motionPreference.matches;
  if (bgReady) {
    if (motionPreference.matches) backgroundPlayer.pauseVideo();
    else if (!document.hidden && !backgroundPaused) backgroundPlayer.playVideo();
  } else if (!motionPreference.matches) queueBackground();
});
document.addEventListener('visibilitychange', () => {
  resetCardTilt();
  scheduleTimeline();
  if (document.hidden) { if (bgReady) backgroundPlayer.pauseVideo(); }
  else {
    updateTimeline();
    if (bgReady && !backgroundPaused && !motionPreference.matches) backgroundPlayer.playVideo();
    else if (!bgReady) queueBackground();
  }
});
if (motionPreference.matches) ui['background-toggle'].hidden = true;
resizeBackground();
const api = document.createElement('script');
api.src = 'https://www.youtube.com/iframe_api';
api.onerror = failMusic;
document.head.appendChild(api);
setTimeout(() => { if (!musicReady) failMusic(); }, 20000);
