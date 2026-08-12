import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// ---------- Report Generation ----------

export async function generateReport(featureType) {
  const res = await api.post(`/${featureType}/generate`);
  return res.data;
}

export async function generatePromptSqlInjectionReport(formData) {
  const res = await api.post(`/prompt-sql-injection/generate`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data;
}

export async function generatePromptSqlInjectionReportStream(formData, onProgress) {
  try {
    const response = await fetch('/api/prompt-sql-injection/generate-stream', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok || !response.body) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let finalResult = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() || '';

      for (const part of parts) {
        const line = part.trim();
        if (line.startsWith('data: ')) {
          try {
            const jsonStr = line.slice(6);
            const msg = JSON.parse(jsonStr);
            if (msg.type === 'progress' && onProgress) {
              onProgress(msg.data);
            } else if (msg.type === 'result') {
              finalResult = msg.data;
            } else if (msg.type === 'error') {
              throw new Error(msg.error);
            }
          } catch (e) {
            console.warn('Error parsing SSE event:', e);
          }
        }
      }
    }

    if (finalResult) return finalResult;
    throw new Error('No result received from stream');
  } catch (err) {
    console.warn('Streaming failed, falling back to standard generate:', err);
    return await generatePromptSqlInjectionReport(formData);
  }
}

export async function downloadReportExcel(reportId) {
  const res = await api.get(`/prompt-sql-injection/download-excel/${reportId}`, {
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(
    new Blob([res.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = `ATE_Report_${reportId}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

// ---------- Vulnerability Discovery API ----------

export async function generateVulnerabilityReport(formData) {
  const res = await api.post(`/vulnerability-discovery/generate`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data;
}

export async function generateVulnerabilityReportStream(formData, onProgress) {
  try {
    const response = await fetch('/api/vulnerability-discovery/generate-stream', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok || !response.body) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let finalResult = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() || '';

      for (const part of parts) {
        const line = part.trim();
        if (line.startsWith('data: ')) {
          try {
            const jsonStr = line.slice(6);
            const msg = JSON.parse(jsonStr);
            if (msg.type === 'progress' && onProgress) {
              onProgress(msg.data);
            } else if (msg.type === 'result') {
              finalResult = msg.data;
            } else if (msg.type === 'error') {
              throw new Error(msg.error);
            }
          } catch (e) {
            console.warn('Error parsing SSE event:', e);
          }
        }
      }
    }

    if (finalResult) return finalResult;
    throw new Error('No result received from stream');
  } catch (err) {
    console.warn('Streaming failed, falling back to standard generate:', err);
    return await generateVulnerabilityReport(formData);
  }
}

export async function downloadVulnerabilityExcel(reportId) {
  const res = await api.get(`/vulnerability-discovery/download-excel/${reportId}`, {
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(
    new Blob([res.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = `vulnerabilities_UFO_${reportId}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

// ---------- Reports ----------

export async function getReports(filters = {}) {
  const params = new URLSearchParams();
  if (filters.feature) params.append('feature', filters.feature);
  if (filters.from_date) params.append('from_date', filters.from_date);
  if (filters.to_date) params.append('to_date', filters.to_date);
  if (filters.limit) params.append('limit', filters.limit);

  const res = await api.get(`/reports?${params.toString()}`);
  return res.data;
}

export async function getReport(reportId) {
  const res = await api.get(`/reports/${reportId}`);
  return res.data;
}

export async function downloadReportPdf(reportId) {
  try {
    const res = await api.get(`/reports/${reportId}/pdf`, {
      responseType: 'blob',
    });
    const contentType = res.headers['content-type'] || '';
    const isPdf = contentType.includes('application/pdf');
    const url = window.URL.createObjectURL(
      new Blob([res.data], { type: isPdf ? 'application/pdf' : 'text/html' })
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = isPdf ? `report_${reportId}.pdf` : `report_${reportId}.html`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.warn('Server-side PDF download failed, use client-side fallback:', err);
    return false;
  }
}

export async function downloadReportHtml(reportId) {
  const res = await api.get(`/reports/${reportId}`);
  const htmlContent = res.data.html_content;
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `report_${reportId}.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

// ---------- Feature-specific Report Lists ----------

export async function getFeatureReports(featureType) {
  const res = await api.get(`/${featureType}/reports`);
  return res.data;
}

// ---------- Chatbot ----------

export async function sendChatMessage(message) {
  const res = await api.post('/chat', { message });
  return res.data;
}

export default api;
