import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { auth, storage } from './firebase.js';

const BASE = '/api';

async function authHeaders() {
  const token = await auth.currentUser?.getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Errore ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function uploadToStorage(folder, file) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Devi effettuare il login');
  const path = `users/${uid}/${folder}/${Date.now()}-${file.name}`;
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, file);
  return getDownloadURL(fileRef);
}

async function deleteFromStorage(url) {
  if (!url) return;
  try {
    await deleteObject(ref(storage, url));
  } catch {
    // Best-effort: an already-deleted or foreign-URL object shouldn't block the UI.
  }
}

export const api = {
  listQuizzes: () => request('/quizzes'),
  getQuiz: (id) => request(`/quizzes/${id}`),
  createQuiz: (data) => request('/quizzes', { method: 'POST', body: JSON.stringify(data) }),
  updateQuiz: (id, data) => request(`/quizzes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteQuiz: (id) => request(`/quizzes/${id}`, { method: 'DELETE' }),

  uploadBackground: async (quizId, file) => {
    const url = await uploadToStorage(`quizzes/${quizId}/backgrounds`, file);
    return api.updateQuiz(quizId, { background_url: url });
  },
  deleteBackground: async (quizId, currentUrl) => {
    await deleteFromStorage(currentUrl);
    return api.updateQuiz(quizId, { background_url: '' });
  },
  uploadLogo: async (quizId, file) => {
    const url = await uploadToStorage(`quizzes/${quizId}/logos`, file);
    return api.updateQuiz(quizId, { logo_url: url });
  },
  deleteLogo: async (quizId, currentUrl) => {
    await deleteFromStorage(currentUrl);
    return api.updateQuiz(quizId, { logo_url: '' });
  },

  addSession: (quizId, data) => request(`/quizzes/${quizId}/sessions`, { method: 'POST', body: JSON.stringify(data) }),
  updateSession: (id, data) => request(`/sessions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteSession: (id) => request(`/sessions/${id}`, { method: 'DELETE' }),
  uploadMusic: async (sessionId, file) => {
    const url = await uploadToStorage(`sessions/${sessionId}/music`, file);
    return api.updateSession(sessionId, { music_url: url });
  },

  addQuestion: (sessionId, data) => request(`/sessions/${sessionId}/questions`, { method: 'POST', body: JSON.stringify(data) }),
  updateQuestion: (id, data) => request(`/questions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteQuestion: (id) => request(`/questions/${id}`, { method: 'DELETE' }),

  networkInfo: () => request('/network-info'),
  gameResults: (code) => request(`/games/${code}/results`),
  exportUrl: async (code, format) => {
    const res = await fetch(`${BASE}/games/${code}/export.${format}`, { headers: await authHeaders() });
    if (!res.ok) throw new Error(`Errore ${res.status}`);
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  },
};
