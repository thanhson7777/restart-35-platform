/**
 * API Client for HTTP-level integration tests
 * Makes real HTTP calls to the Express app via node:fetch.
 */

import { StatusCodes } from 'http-status-codes';

class ApiClient {
  constructor(baseUrl = 'http://localhost:8017') {
    this.baseUrl = baseUrl;
  }

  async _request(method, url, data, token) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const options = { method, headers };
    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(data);
    }

    try {
      const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`;
      const res = await fetch(fullUrl, options);
      let body;
      try { body = await res.json(); } catch { body = await res.text(); }
      return { status: res.status, data: body, ok: res.ok };
    } catch (err) {
      return { status: 0, data: { message: err.message }, ok: false, error: err };
    }
  }

  get(url, token, params) {
    if (params) {
      const qs = new URLSearchParams(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== null)
      ).toString();
      url = qs ? `${url}?${qs}` : url;
    }
    return this._request('GET', url, null, token);
  }

  post(url, data, token) { return this._request('POST', url, data, token); }
  put(url, data, token) { return this._request('PUT', url, data, token); }
  patch(url, data, token) { return this._request('PATCH', url, data, token); }
  delete(url, token) { return this._request('DELETE', url, null, token); }
}

export const apiClient = new ApiClient();
export default apiClient;
