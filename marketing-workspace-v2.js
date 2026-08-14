/* AZAAD CLINIC — Marketing Workspace V2
   Free-first, fast admin media workspace.
   Uses the existing clinic_marketing_posts + clinic_media_uploads contracts.
   No paid social API is required; publishing is tracked as workflow state.
*/
(() => {
  'use strict';
  const SUPABASE = 'https://derofsthjivlkcdnojww.supabase.co';
  const KEY = 'sb_publishable_GC253fvQebNBsDOaKjWGRw_tPYJrgLa';
  const state = { posts: [], filter: 'all', query: '' };
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[c]));
  const auth = () => window.AZAAD?.state?.session?.access_token || '';
  const db = () => window.AZAAD?.supabase;
  const toast = (message, error = false) => {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message;
    el.style.background = error ? '#a32939' : '#17214f';
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2800);
  };

  async function callAdmin(path, options = {}) {
    const token = auth();
    if (!token) throw new Error('Admin session is missing or expired.');
    const response = await fetch(`${SUPABASE}/functions/v1/${path}`, {
      ...options,
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: KEY,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {})
      }
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || body.message || `HTTP ${response.status}`);
    return body;
  }

  function styles() {
    if (document.getElementById('azaadMarketingV2Styles')) return;
    const style = document.createElement('style');
    style.id = 'azaadMarketingV2Styles';
    style.textContent = `
      #marketingV2{margin-top:16px}
      #marketingV2 .mkt-head{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap}
      #marketingV2 .mkt-toolbar{display:grid;grid-template-columns:minmax(0,1fr) 180px auto;gap:10px;margin:14px 0}
      #marketingV2 .mkt-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}
      #marketingV2 .mkt-card{overflow:hidden;border:1px solid #e4e8f0;border-radius:18px;background:#fff;box-shadow:0 8px 28px rgba(23,33,79,.06)}
      #marketingV2 .mkt-media{width:100%;aspect-ratio:4/5;object-fit:cover;background:#eef1f7;display:block}
      #marketingV2 .mkt-video{width:100%;aspect-ratio:4/5;object-fit:cover;background:#10131b;display:block}
      #marketingV2 .mkt-body{padding:14px}.mkt-body h3{margin:0 0 7px}.mkt-caption{white-space:pre-wrap;color:#59627a;line-height:1.6}.mkt-meta{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}
      #marketingV2 .mkt-pill{display:inline-flex;padding:5px 9px;border-radius:999px;background:#f1f3f8;font-size:11px;font-weight:800}
      #marketingV2 .mkt-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}
      #marketingV2 .mkt-composer{display:none;border:1px solid #dfe4ee;border-radius:18px;padding:16px;background:#fbfcff;margin-bottom:16px}
      #marketingV2 .mkt-composer.show{display:block}.mkt-form{display:grid;gap:11px}.mkt-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
      #marketingV2 textarea{min-height:120px;resize:vertical}.mkt-preview{border:1px dashed #cfd6e4;border-radius:14px;padding:10px;margin-top:8px}.mkt-preview img,.mkt-preview video{max-width:100%;max-height:420px;border-radius:12px;display:block;margin:auto}
      #marketingV2 .mkt-empty{padding:28px;text-align:center;color:#737d94;background:#f7f8fb;border-radius:14px}
      @media(max-width:700px){#marketingV2 .mkt-toolbar,#marketingV2 .mkt-form-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function shell() {
    if (document.getElementById('marketingV2')) return document.getElementById('marketingV2');
    const panel = document.getElementById('marketing-center');
    if (!panel) return null;
    const host = document.createElement('div');
    host.id = 'marketingV2';
    host.innerHTML = `
      <div class="card">
        <div class="mkt-head"><div><h2>📣 Marketing Studio</h2><div class="muted">Instagram/Facebook-style media workspace — images, video, captions, drafts, scheduling and safe archiving.</div></div><button id="mktNew" class="btn btn-primary" type="button">➕ New Post</button></div>
        <div class="mkt-toolbar"><input id="mktSearch" type="search" placeholder="🔎 Search posts, captions or platforms"><select id="mktStatus"><option value="all">All statuses</option><option value="draft">Draft</option><option value="scheduled">Scheduled</option><option value="published">Published</option><option value="archived">Archived</option></select><button id="mktRefresh" class="btn btn-secondary" type="button">🔄 Refresh</button></div>
        <div id="mktComposer" class="mkt-composer"></div>
        <div id="mktGrid" class="mkt-grid"></div>
      </div>`;
    panel.appendChild(host);
    document.getElementById('mktNew').onclick = () => composer();
    document.getElementById('mktRefresh').onclick = load;
    document.getElementById('mktSearch').oninput = e => { state.query = e.target.value.toLowerCase(); render(); };
    document.getElementById('mktStatus').onchange = e => { state.filter = e.target.value; render(); };
    return host;
  }

  function composer(post = null) {
    const box = document.getElementById('mktComposer');
    if (!box) return;
    const p = post || {};
    box.classList.add('show');
    box.innerHTML = `<div class="mkt-form"><div class="mkt-head"><h3>${post ? '✏️ Edit Post' : '➕ Create Post'}</h3><button id="mktCancel" class="btn btn-secondary" type="button">Cancel</button></div><div class="mkt-form-grid"><input id="mktTitle" placeholder="Post title" value="${esc(p.title)}"><select id="mktPlatform"><option ${p.platform==='instagram'?'selected':''} value="instagram">Instagram</option><option ${p.platform==='facebook'?'selected':''} value="facebook">Facebook</option><option ${p.platform==='both'?'selected':''} value="both">Instagram + Facebook</option><option ${p.platform==='website'?'selected':''} value="website">Website</option></select></div><textarea id="mktContent" placeholder="Write the caption / description…">${esc(p.content)}</textarea><div class="mkt-form-grid"><select id="mktMediaType"><option value="image" ${p.media_type==='image'?'selected':''}>🖼️ Image</option><option value="video" ${p.media_type==='video'?'selected':''}>🎬 Video</option><option value="none" ${!p.media_type||p.media_type==='none'?'selected':''}>📝 Text only</option></select><input id="mktMediaUrl" placeholder="Media URL (optional)" value="${esc(p.media_url)}"></div><input id="mktExternal" placeholder="External URL / CTA link (optional)" value="${esc(p.external_url)}"><div class="mkt-preview" id="mktPreview">${p.media_url ? mediaHtml(p) : '🖼️ Preview will appear here.'}</div><div class="mkt-actions"><button id="mktSaveDraft" class="btn btn-secondary" type="button">💾 Save Draft</button><button id="mktPublish" class="btn btn-primary" type="button">🚀 Publish</button></div><div class="muted">🆓 Core publishing workflow is local/free-first. No paid social API is required.</div></div>`;
    document.getElementById('mktCancel').onclick = () => box.classList.remove('show');
    document.getElementById('mktMediaUrl').oninput = preview;
    document.getElementById('mktMediaType').onchange = preview;
    document.getElementById('mktSaveDraft').onclick = () => save(post, 'draft');
    document.getElementById('mktPublish').onclick = () => save(post, 'published');
  }

  function preview() {
    const p = { media_url: document.getElementById('mktMediaUrl')?.value, media_type: document.getElementById('mktMediaType')?.value };
    const target = document.getElementById('mktPreview');
    if (target) target.innerHTML = p.media_url ? mediaHtml(p) : '🖼️ Preview will appear here.';
  }

  function mediaHtml(p) {
    const url = esc(p.media_url);
    if (p.media_type === 'video') return `<video class="mkt-video" controls preload="metadata" src="${url}"></video>`;
    if (p.media_type === 'image') return `<img class="mkt-media" loading="lazy" decoding="async" src="${url}" alt="Azaad Clinic post media">`;
    return '📝 Text post';
  }

  async function save(post, status) {
    const payload = { title: document.getElementById('mktTitle')?.value.trim() || '', content: document.getElementById('mktContent')?.value.trim() || '', media_url: document.getElementById('mktMediaUrl')?.value.trim() || null, media_type: document.getElementById('mktMediaType')?.value || 'none', platform: document.getElementById('mktPlatform')?.value || 'both', external_url: document.getElementById('mktExternal')?.value.trim() || null, status };
    if (!payload.content && !payload.media_url) return toast('Add a caption or media first.', true);
    try {
      const url = post?.id ? `azaad-admin?api=marketing-post&id=${encodeURIComponent(post.id)}` : 'azaad-admin?api=marketing-post';
      const result = await callAdmin(url, { method: post?.id ? 'PUT' : 'POST', body: JSON.stringify(payload) });
      toast(status === 'published' ? '🚀 Post published.' : '💾 Draft saved.');
      document.getElementById('mktComposer')?.classList.remove('show');
      await load();
      return result;
    } catch (error) {
      toast(error.message, true);
    }
  }

  async function archive(post) {
    if (!confirm(`Archive “${post.title || 'post'}”? Historical campaign data will be preserved.`)) return;
    try {
      await callAdmin(`azaad-admin?api=marketing-post&id=${encodeURIComponent(post.id)}`, { method: 'DELETE' });
      toast('📦 Post archived.');
      load();
    } catch (error) { toast(error.message, true); }
  }

  function render() {
    const grid = document.getElementById('mktGrid');
    if (!grid) return;
    const list = state.posts.filter(p => (state.filter === 'all' || String(p.status || '').toLowerCase() === state.filter) && (!state.query || [p.title,p.content,p.platform,p.status].join(' ').toLowerCase().includes(state.query)));
    if (!list.length) { grid.innerHTML = '<div class="mkt-empty">📭 No posts match the current filter.</div>'; return; }
    grid.innerHTML = list.map(p => `<article class="mkt-card">${p.media_url ? mediaHtml(p) : ''}<div class="mkt-body"><h3>${esc(p.title || 'Untitled post')}</h3><div class="mkt-caption">${esc(p.content || '')}</div><div class="mkt-meta"><span class="mkt-pill">📱 ${esc(p.platform || 'both')}</span><span class="mkt-pill">${esc(p.status || 'draft')}</span>${p.scheduled_at ? `<span class="mkt-pill">🕐 ${esc(String(p.scheduled_at).slice(0,16).replace('T',' '))}</span>` : ''}</div><div class="mkt-actions"><button class="btn btn-secondary" type="button" data-edit-post="${esc(p.id)}">✏️ Edit</button><button class="btn btn-danger" type="button" data-archive-post="${esc(p.id)}">📦 Archive</button></div></div></article>`).join('');
    grid.querySelectorAll('[data-edit-post]').forEach(b => b.onclick = () => composer(state.posts.find(p => String(p.id) === String(b.dataset.editPost))));
    grid.querySelectorAll('[data-archive-post]').forEach(b => b.onclick = () => { const p = state.posts.find(x => String(x.id) === String(b.dataset.archivePost)); if (p) archive(p); });
  }

  async function load() {
    const host = shell();
    if (!host || !db()) return;
    const grid = document.getElementById('mktGrid');
    if (grid) grid.innerHTML = '<div class="mkt-empty">⏳ Loading posts…</div>';
    const result = await db().from('clinic_marketing_posts').select('id,title,content,media_url,media_type,platform,status,scheduled_at,published_at,ai_caption,ai_hashtags,created_at,updated_at').order('created_at', { ascending: false }).limit(200);
    if (result.error) { if (grid) grid.innerHTML = `<div class="mkt-empty">❌ ${esc(result.error.message)}</div>`; return; }
    state.posts = result.data || [];
    render();
  }

  function boot() {
    styles();
    if (!shell()) return;
    load().catch(error => toast(error.message, true));
  }

  const wait = setInterval(() => { if (window.AZAAD?.supabase) { clearInterval(wait); boot(); } }, 250);
  setTimeout(() => clearInterval(wait), 15000);
  window.AZAAD_MARKETING_V2 = { load, render, composer };
})();
