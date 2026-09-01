const BASE = '/api';

async function request(path, options) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Errore ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  listQuizzes: () => request('/quizzes'),
  getQuiz: (id) => request(`/quizzes/${id}`),
  createQuiz: (data) => request('/quizzes', { method: 'POST', body: JSON.stringify(data) }),
  updateQuiz: (id, data) => request(`/quizzes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteQuiz: (id) => request(`/quizzes/${id}`, { method: 'DELETE' }),

  uploadImage: async (path, fieldName, file) => {
    const form = new FormData();
    form.append(fieldName, file);
    const res = await fetch(`${BASE}${path}`, { method: 'POST', body: form });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Errore ${res.status}`);
    }
    return res.json();
  },
  uploadBackground: (quizId, file) => api.uploadImage(`/quizzes/${quizId}/background`, 'background', file),
  deleteBackground: (quizId) => request(`/quizzes/${quizId}/background`, { method: 'DELETE' }),
  uploadLogo: (quizId, file) => api.uploadImage(`/quizzes/${quizId}/logo`, 'logo', file),
  deleteLogo: (quizId) => request(`/quizzes/${quizId}/logo`, { method: 'DELETE' }),

  addSession: (quizId, data) => request(`/quizzes/${quizId}/sessions`, { method: 'POST', body: JSON.stringify(data) }),
  updateSession: (id, data) => request(`/sessions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteSession: (id) => request(`/sessions/${id}`, { method: 'DELETE' }),
  uploadMusic: async (sessionId, file) => {
    const form = new FormData();
    form.append('music', file);
    const res = await fetch(`${BASE}/sessions/${sessionId}/music`, { method: 'POST', body: form });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Errore ${res.status}`);
    }
    return res.json();
  },

  addQuestion: (sessionId, data) => request(`/sessions/${sessionId}/questions`, { method: 'POST', body: JSON.stringify(data) }),
  updateQuestion: (id, data) => request(`/questions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteQuestion: (id) => request(`/questions/${id}`, { method: 'DELETE' }),

  networkInfo: () => request('/network-info'),
};
