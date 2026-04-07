import axios from 'axios';

const api = axios.create({
  baseURL: '/dra-mkt/api',
  withCredentials: true,
});

export default api;

// Helper para SSE (Server-Sent Events)
export function createSSERequest(url, data, callbacks) {
  return fetch(`/dra-mkt/api${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  }).then(response => {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    function processBuffer() {
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      let currentEvent = null;
      let currentData = null;

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.replace('event: ', '').trim();
        } else if (line.startsWith('data: ')) {
          currentData = line.replace('data: ', '').trim();
          if (currentEvent && currentData) {
            try {
              const parsed = JSON.parse(currentData);
              if (currentEvent === 'status' && callbacks.onStatus) {
                callbacks.onStatus(parsed);
              } else if (currentEvent === 'complete' && callbacks.onComplete) {
                callbacks.onComplete(parsed);
              } else if (currentEvent === 'error' && callbacks.onError) {
                callbacks.onError(parsed);
              }
            } catch (e) {
              console.error('Erro ao parsear SSE:', e);
            }
            currentEvent = null;
            currentData = null;
          }
        }
      }
    }

    function read() {
      return reader.read().then(({ done, value }) => {
        if (done) {
          processBuffer();
          return;
        }
        buffer += decoder.decode(value, { stream: true });
        processBuffer();
        return read();
      });
    }

    return read();
  });
}

// API de Produtos
export const produtosApi = {
  listar: () => api.get('/produtos/'),
  criar: (data) => api.post('/produtos/', data),
  atualizar: (id, data) => api.put(`/produtos/${id}`, data),
  deletar: (id) => api.delete(`/produtos/${id}`),
};

// API de Personas
export const personasApi = {
  listar: () => api.get('/personas/'),
  criar: (data) => api.post('/personas/', data),
  atualizar: (id, data) => api.put(`/personas/${id}`, data),
  deletar: (id) => api.delete(`/personas/${id}`),
};

// API de Copys
export const copysApi = {
  listar: (params) => api.get('/copys/', { params }),
  gerar: (data, callbacks) => createSSERequest('/copys/gerar', data, callbacks),
  detalhe: (id) => api.get(`/copys/${id}`),
  favoritar: (id) => api.put(`/copys/${id}/favorito`),
  alterarStatus: (id, status) => api.put(`/copys/${id}/status?status=${status}`),
  deletar: (id) => api.delete(`/copys/${id}`),
  listarProviders: () => api.get('/copys/providers'),
};
