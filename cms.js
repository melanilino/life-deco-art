import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, deleteDoc, writeBatch, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject, getMetadata } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export { signInWithEmailAndPassword, onAuthStateChanged, signOut };

const RICH_TEXT_ALLOWED_TAGS = new Set([
  'P', 'BR', 'STRONG', 'B', 'EM', 'I', 'H2', 'H3',
  'UL', 'OL', 'LI', 'A', 'BLOCKQUOTE'
]);
const RICH_TEXT_DROP_CONTENT_TAGS = new Set([
  'SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'MATH'
]);

function isSafeRichTextUrl(value) {
  const url = String(value || '').trim();
  if (!url) return false;
  if (/^(https?:|mailto:|tel:)/i.test(url)) return true;
  return /^(\/|#|\?|\.\.?\/)/.test(url);
}

export function sanitizeRichHtml(value) {
  const source = String(value || '');
  if (!source || typeof DOMParser === 'undefined') return '';

  const doc = new DOMParser().parseFromString(`<div>${source}</div>`, 'text/html');
  const root = doc.body.firstElementChild;
  if (!root) return '';

  const cleanNode = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      return doc.createTextNode(node.textContent || '');
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return null;

    const tag = node.tagName.toUpperCase();
    if (RICH_TEXT_DROP_CONTENT_TAGS.has(tag)) return null;

    const children = [...node.childNodes].map(cleanNode).filter(Boolean);
    if (!RICH_TEXT_ALLOWED_TAGS.has(tag)) {
      const fragment = doc.createDocumentFragment();
      children.forEach((child) => fragment.appendChild(child));
      return fragment;
    }

    const clean = doc.createElement(tag.toLowerCase());
    if (tag === 'A') {
      const href = node.getAttribute('href');
      if (isSafeRichTextUrl(href)) clean.setAttribute('href', href.trim());
      const title = node.getAttribute('title');
      if (title) clean.setAttribute('title', title.slice(0, 300));
      if (node.getAttribute('target') === '_blank') {
        clean.setAttribute('target', '_blank');
        clean.setAttribute('rel', 'noopener noreferrer');
      }
    }
    children.forEach((child) => clean.appendChild(child));
    return clean;
  };

  const output = doc.createElement('div');
  [...root.childNodes].map(cleanNode).filter(Boolean).forEach((node) => output.appendChild(node));
  return output.innerHTML;
}

function sanitizePageContent(pageId, data) {
  if (!data || typeof data !== 'object') return {};
  if (pageId !== 'aprende' || !Array.isArray(data.blog)) return data;
  return {
    ...data,
    blog: data.blog.map((item) => ({
      ...item,
      content: sanitizeRichHtml(item && item.content),
    })),
  };
}

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

  const maxEdge = Math.max(320, Number(options.maxEdge || IMAGE_MAX_EDGE));
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

async function imageFileInfo(file) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch (_) {
    bitmap = await createImageBitmap(file);
  }
  const info = { width: bitmap.width, height: bitmap.height, bytes: file.size, type: file.type || '' };
  if (bitmap.close) bitmap.close();
  return info;
}

export async function uploadResponsiveImage(pathPrefix, file, options = {}) {
  if (!file || !file.type || !file.type.startsWith('image/')) {
    throw new Error('Selecciona un archivo de imagen válido.');
  }
  const original = await imageFileInfo(file);
  const maxEdge = Math.max(600, Number(options.maxEdge || IMAGE_MAX_EDGE));
  const requested = Array.isArray(options.variantEdges) && options.variantEdges.length
    ? options.variantEdges
    : [480, 960, maxEdge];
  const edges = [...new Set(requested.map(Number).filter(Number.isFinite).map((edge) => Math.max(320, Math.min(maxEdge, edge))))].sort((a, b) => a - b);
  if (!edges.includes(maxEdge)) edges.push(maxEdge);

  const uploaded = [];
  for (const edge of edges) {
    const prepared = await optimizeImage(file, { ...options, maxEdge: edge });
    const info = await imageFileInfo(prepared);
    if (uploaded.some((entry) => entry.width === info.width)) continue;
    const url = await uploadPrepared(pathPrefix, prepared, {
      cacheControl: 'public,max-age=31536000,immutable',
      customMetadata: {
        optimizedBy: 'life-deco-art-cms',
        originalWidth: String(original.width),
        originalHeight: String(original.height),
      },
    });
    uploaded.push({ url, width: info.width, height: info.height, bytes: info.bytes, type: info.type });
  }
  uploaded.sort((a, b) => a.width - b.width);
  const primary = uploaded[uploaded.length - 1];
  return {
    url: primary.url,
    srcset: uploaded.map((entry) => `${entry.url} ${entry.width}w`).join(', '),
    variants: uploaded,
    width: primary.width,
    height: primary.height,
    bytes: primary.bytes,
    originalBytes: original.bytes,
    originalWidth: original.width,
    originalHeight: original.height,
    format: primary.type || 'image/webp',
  };
}

// Compatibilidad: las llamadas existentes a uploadImage ahora optimizan automáticamente.
export async function uploadImage(pathPrefix, file, options = {}) {
  let prepared = file;
  if (file && file.type && file.type.startsWith('image/')) prepared = await optimizeImage(file, options);
  else if (file && file.type && file.type.startsWith('video/')) prepared = await optimizeHeroVideo(file, options);
  return uploadPrepared(pathPrefix, prepared, file && file.type && file.type.startsWith('image/')
    ? { cacheControl: 'public,max-age=31536000,immutable' }
    : {});
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
  const data = sanitizePageContent(pageId, snap.exists() ? snap.data() : {});
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(`lda:page:${pageId}`, JSON.stringify(data));
    }
  } catch (_) {}
  return data;
}

export async function savePageContent(pageId, data) {
  const dref = doc(db, "content", pageId);
  const safeData = sanitizePageContent(pageId, data);
  await setDoc(dref, safeData, { merge: true });
  try {
    if (typeof sessionStorage !== 'undefined') {
      const key = `lda:page:${pageId}`;
      const previous = JSON.parse(sessionStorage.getItem(key) || '{}');
      sessionStorage.setItem(key, JSON.stringify({ ...previous, ...safeData }));
    }
  } catch (_) {}
}

const ENTITY_TYPES = new Set([
  'categories', 'products', 'courses', 'workshops', 'resources',
  'posts', 'essentials', 'communities', 'services'
]);

function assertEntityType(type) {
  if (!ENTITY_TYPES.has(type)) throw new Error(`Tipo de contenido no permitido: ${type}`);
}

export async function getEntities(type, options = {}) {
  assertEntityType(type);
  const snapshot = await getDocs(collection(db, 'cmsEntities', type, 'items'));
  const items = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  const visible = options.includeDrafts ? items : items.filter((item) => !item.status || item.status === 'Publicado' || item.status === 'Activo');
  return visible.sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
}

export async function saveEntity(type, id, data) {
  assertEntityType(type);
  if (!id) throw new Error('El contenido necesita un identificador estable.');
  const target = doc(db, 'cmsEntities', type, 'items', String(id));
  await setDoc(target, { ...data, id: String(id), updatedAt: serverTimestamp() }, { merge: true });
}

export async function saveEntities(type, items) {
  assertEntityType(type);
  const batch = writeBatch(db);
  (items || []).forEach((item, index) => {
    if (!item || !item.id) return;
    const target = doc(db, 'cmsEntities', type, 'items', String(item.id));
    batch.set(target, { ...item, order: Number.isFinite(Number(item.order)) ? Number(item.order) : index, updatedAt: serverTimestamp() }, { merge: true });
  });
  await batch.commit();
}

export async function archiveEntity(type, id) {
  return saveEntity(type, id, { status: 'Archivado' });
}

export async function deleteEntity(type, id) {
  assertEntityType(type);
  await deleteDoc(doc(db, 'cmsEntities', type, 'items', String(id)));
}

export async function createContentSnapshot(label, payload) {
  const id = `${Date.now()}-${String(label || 'cambio').replace(/[^a-z0-9_-]+/gi, '-').toLowerCase()}`;
  await setDoc(doc(db, 'cmsHistory', id), {
    label: label || 'Cambio de contenido',
    payload,
    createdAt: serverTimestamp()
  });
  return id;
}

export async function deleteMediaUrl(url) {
  if (!url || !/firebasestorage\.googleapis\.com|storage\.googleapis\.com/.test(String(url))) return false;
  try {
    await deleteObject(ref(storage, url));
    return true;
  } catch (e) {
    if (e && e.code === 'storage/object-not-found') return true;
    throw e;
  }
}
