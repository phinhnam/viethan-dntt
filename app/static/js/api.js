// Gọi API JSON dùng chung cho mọi trang.
window.api = {
  async request(method, url, body) {
    const opts = { method, headers: {} };
    if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(url, opts);
    if (!res.ok) {
      let detail = res.statusText;
      try { detail = (await res.json()).detail || detail; } catch (_) { /* giữ statusText */ }
      throw new Error(detail);
    }
    if (res.status === 204) return null;
    return res.json();
  },
  get(url) { return this.request('GET', url); },
  post(url, body) { return this.request('POST', url, body); },
  put(url, body) { return this.request('PUT', url, body); },
  del(url) { return this.request('DELETE', url); },

  async upload(url, file, docTypePrefix) {
    const fd = new FormData();
    fd.append('file', file, file.name);
    fd.append('doc_type_prefix', docTypePrefix);
    const res = await fetch(url, { method: 'POST', body: fd });
    if (!res.ok) {
      let detail = res.statusText;
      try { detail = (await res.json()).detail || detail; } catch (_) { /* giữ statusText */ }
      throw new Error(detail);
    }
    return res.json();
  },
};
