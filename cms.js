import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject, getMetadata } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export { signInWithEmailAndPassword, onAuthStateChanged, signOut };

const IMAGE_MAX_EDGE = 1800;
const IMAGE_QUALITY = 0.88;
const IMAGE_HARD_LIMIT = 30 * 1024 * 1024;
const VIDEO_HARD_LIMIT = 100 * 1024 * 1024;
const VIDEO_DIRECT_LIMIT = 4 * 1024 * 1024;
const VIDEO_FALLBACK_LIMIT = 12 * 1024 * 1024;

function safeBaseName(name = 'archivo') {
  return name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'archivo';
}

async function blobToFile(blob, name, type) {
  return new File([blob], name, { type: type || blob.type, lastModified: Date.now() });
}

export async function optimizeImage(file, options = {}) {
  if (!file || !file.type || !file.type.startsWith('image/')) return file;
  if (file.size > IMAGE_HARD_LIMIT) throw new Error('La imagen supera 30 MB. Reduce el archivo antes de subirlo.');
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') return file;

  const maxEdge = Math.max(600, Number(options.maxEdge || IMAGE_MAX_EDGE));
  const quality = Math.min(0.95, Math.max(0.78, Number(options.quality || IMAGE_QUALITY)));
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch (_) {
    bitmap = await createImageBitmap(file);
  }
  const srcW = bitmap.width;
  const srcH = bitmap.height;
  const scale = Math.min(1, maxEdge / Math.max(srcW, srcH));
  const width = Math.max(1, Math.round(srcW * scale));
  const height = Math.max(1, Math.round(srcH * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, width, height);
  if (bitmap.close) bitmap.close();

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => b ? resolve(b) : reject(new Error('No se pudo optimizar la imagen.')), 'image/webp', quality);
  });
  const optimized = await blobToFile(blob, `${safeBaseName(file.name)}.webp`, 'image/webp');

  // Si la imagen original ya era más eficiente y no necesitaba reducción, la conservamos.
  if (scale === 1 && optimized.size >= file.size * 0.98) return file;
  return optimized;
}

function supportedVideoMime() {
  if (!window.MediaRecorder) return '';
  const candidates = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4'
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) || '';
}

export async function optimizeHeroVideo(file, options = {}) {
  if (!file || !file.type || !file.type.startsWith('video/')) return file;
  if (file.size > VIDEO_HARD_LIMIT) throw new Error('El video supera 100 MB. Usa un clip más corto antes de subirlo.');
  if (file.size <= VIDEO_DIRECT_LIMIT) return file;

  const mimeType = supportedVideoMime();
  const canCapture = typeof HTMLCanvasElement !== 'undefined' && HTMLCanvasElement.prototype.captureStream;
  if (!mimeType || !canCapture) {
    if (file.size <= VIDEO_FALLBACK_LIMIT) return file;
    throw new Error('Este navegador no puede optimizar el video. Usa Chrome/Edge o sube un video de menos de 12 MB.');
  }

  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.src = url;
  video.muted = true;
  video.playsInline = true;
  video.preload = 'metadata';

  try {
    await new Promise((resolve, reject) => {
      video.onloadedmetadata = resolve;
      video.onerror = () => reject(new Error('No se pudo leer el video.'));
    });
    if (!Number.isFinite(video.duration) || video.duration <= 0) throw new Error('Duración de video no válida.');
    if (video.duration > 90) throw new Error('Para el hero usa un video de 90 segundos o menos.');

    const maxW = Number(options.maxWidth || 1280);
    const maxH = Number(options.maxHeight || 720);
    const scale = Math.min(1, maxW / video.videoWidth, maxH / video.videoHeight);
    const width = Math.max(2, Math.round(video.videoWidth * scale / 2) * 2);
    const height = Math.max(2, Math.round(video.videoHeight * scale / 2) * 2);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { alpha: false });
    const stream = canvas.captureStream(24);
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: Number(options.videoBitsPerSecond || 2400000)
    });
    const chunks = [];
    recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    const stopped = new Promise((resolve, reject) => {
      recorder.onstop = resolve;
      recorder.onerror = (e) => reject(e.error || new Error('Error al optimizar el video.'));
    });

    let raf = 0;
    const draw = () => {
      if (!video.paused && !video.ended) {
        ctx.drawImage(video, 0, 0, width, height);
        raf = requestAnimationFrame(draw);
      }
    };

    recorder.start(1000);
    await video.play();
    draw();
    await new Promise((resolve) => { video.onended = resolve; });
    cancelAnimationFrame(raf);
    if (recorder.state !== 'inactive') recorder.stop();
    await stopped;
    stream.getTracks().forEach((t) => t.stop());

    const outType = mimeType.split(';')[0];
    const blob = new Blob(chunks, { type: outType });
    if (!blob.size) throw new Error('El video optimizado quedó vacío.');
    const ext = outType === 'video/mp4' ? 'mp4' : 'webm';
    const optimized = await blobToFile(blob, `${safeBaseName(file.name)}.${ext}`, outType);
    return optimized.size < file.size ? optimized : file;
  } finally {
    video.pause();
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(url);
  }
}

async function uploadPrepared(pathPrefix, file, metadata = {}) {
  const path = `${pathPrefix}/${Date.now()}_${file.name}`;
  const r = ref(storage, path);
  await uploadBytes(r, file, { contentType: file.type || undefined, ...metadata });
  return await getDownloadURL(r);
}

// Compatibilidad: las llamadas existentes a uploadImage ahora optimizan automáticamente.
export async function uploadImage(pathPrefix, file, options = {}) {
  let prepared = file;
  if (file && file.type && file.type.startsWith('image/')) prepared = await optimizeImage(file, options);
  else if (file && file.type && file.type.startsWith('video/')) prepared = await optimizeHeroVideo(file, options);
  return uploadPrepared(pathPrefix, prepared);
}

export async function uploadFile(pathPrefix, file) {
  return uploadPrepared(pathPrefix, file);
}

export async function uploadVideo(pathPrefix, file, options = {}) {
  const prepared = await optimizeHeroVideo(file, options);
  return uploadPrepared(pathPrefix, prepared);
}

export async function getPageContent(pageId) {
  const dref = doc(db, "content", pageId);
  const snap = await getDoc(dref);
  return snap.exists() ? snap.data() : {};
}

export async function savePageContent(pageId, data) {
  const dref = doc(db, "content", pageId);
  await setDoc(dref, data, { merge: true });
}

function collectFirebaseUrls(value, out = new Set()) {
  if (Array.isArray(value)) value.forEach((v) => collectFirebaseUrls(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => collectFirebaseUrls(v, out));
  else if (typeof value === 'string' && /firebasestorage\.googleapis\.com|storage\.googleapis\.com/.test(value)) out.add(value);
  return out;
}

async function classifyMediaUrl(url) {
  try {
    const r = ref(storage, url);
    const meta = await getMetadata(r);
    const type = (meta.contentType || '').toLowerCase();
    return { ref: r, isMedia: type.startsWith('image/') || type.startsWith('video/') };
  } catch (_) {
    return { ref: null, isMedia: false };
  }
}

function clearUrls(value, mediaSet) {
  if (Array.isArray(value)) return value.map((v) => clearUrls(v, mediaSet));
  if (value && typeof value === 'object') {
    const copy = {};
    Object.entries(value).forEach(([k, v]) => { copy[k] = clearUrls(v, mediaSet); });
    return copy;
  }
  if (typeof value === 'string' && mediaSet.has(value)) return '';
  return value;
}

// Borra únicamente imágenes/videos administrados que estén referenciados por el CMS.
// PDFs y otros descargables se conservan.
export async function purgeCurrentMedia(pageIds = ['inicio', 'tienda', 'aprende', 'sobremi']) {
  const docs = [];
  const allUrls = new Set();
  for (const pageId of pageIds) {
    const dref = doc(db, 'content', pageId);
    const snap = await getDoc(dref);
    const data = snap.exists() ? snap.data() : {};
    docs.push({ pageId, dref, data });
    collectFirebaseUrls(data, allUrls);
  }

  const mediaSet = new Set();
  const refsToDelete = [];
  for (const url of allUrls) {
    const info = await classifyMediaUrl(url);
    if (info.isMedia) {
      mediaSet.add(url);
      if (info.ref) refsToDelete.push(info.ref);
    }
  }

  let deleted = 0;
  for (const r of refsToDelete) {
    try { await deleteObject(r); deleted++; } catch (e) {
      if (e && e.code !== 'storage/object-not-found') throw e;
    }
  }

  for (const entry of docs) {
    const cleaned = clearUrls(entry.data, mediaSet);
    await setDoc(entry.dref, cleaned, { merge: false });
  }
  return { deleted, clearedReferences: mediaSet.size };
}

function installCmsMediaTools() {
  if (typeof window === 'undefined' || !/^\/cms\/?$/.test(window.location.pathname)) return;
  const ID = 'lda-media-tools';
  const mount = (user) => {
    const old = document.getElementById(ID);
    if (!user) { if (old) old.remove(); return; }
    if (old) return;
    const box = document.createElement('div');
    box.id = ID;
    box.style.cssText = 'position:fixed;right:20px;bottom:20px;z-index:2147483000;background:#111;color:#fff;border-radius:8px;padding:12px 14px;box-shadow:0 6px 24px rgba(0,0,0,.18);font-family:Montserrat,Arial,sans-serif;max-width:280px';
    const note = document.createElement('div');
    note.textContent = 'Nuevas imágenes: WebP alta calidad · máx. 1800 px. Video hero: optimización automática cuando es necesario.';
    note.style.cssText = 'font-size:11px;line-height:1.45;color:rgba(255,255,255,.72);margin-bottom:9px';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Eliminar imágenes y video actuales';
    btn.style.cssText = 'width:100%;border:1px solid rgba(246,80,145,.75);background:transparent;color:#fff;border-radius:5px;padding:9px 10px;font:500 12px Montserrat,Arial,sans-serif;cursor:pointer';
    const status = document.createElement('div');
    status.style.cssText = 'font-size:11px;line-height:1.4;color:rgba(255,255,255,.72);margin-top:8px;display:none';
    btn.onclick = async () => {
      if (!window.confirm('Esto eliminará de Firebase Storage las imágenes y videos actualmente referenciados por Inicio, Tienda, Aprende y Sobre Mí. Los PDFs se conservarán. ¿Continuar?')) return;
      if (!window.confirm('Confirmación final: después tendrás que volver a subir las imágenes y el video desde el CMS. ¿Eliminar ahora?')) return;
      btn.disabled = true;
      btn.textContent = 'Eliminando medios…';
      status.style.display = 'block';
      status.textContent = 'Procesando…';
      try {
        const result = await purgeCurrentMedia();
        status.textContent = `Listo: ${result.deleted} archivos eliminados y ${result.clearedReferences} referencias limpiadas.`;
        btn.textContent = 'Medios actuales eliminados';
      } catch (e) {
        console.error('[LDA CMS] Error al eliminar medios:', e);
        status.textContent = 'No se pudo completar la limpieza. Revisa permisos de Firebase Storage e inténtalo de nuevo.';
        btn.disabled = false;
        btn.textContent = 'Reintentar eliminación de medios';
      }
    };
    box.append(note, btn, status);
    document.body.appendChild(box);
  };
  onAuthStateChanged(auth, mount);
}

installCmsMediaTools();
