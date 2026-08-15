/* AZAAD CLINIC — Clinical Evidence & Question Library
 * Safe-by-default: source metadata, clinician approval, no autonomous diagnosis/treatment.
 */
(function () {
  'use strict';

  const state = { items: [], filter: '', domain: 'all', favoritesOnly: false };

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }

  function sourceBadge(item) {
    const type = item.evidence_type || item.source_type || 'Evidence';
    return `<span class="azaad-evidence-badge">📚 ${esc(type)}</span>`;
  }

  function render(target, items = state.items) {
    if (!target) return;
    const filtered = items.filter(item => {
      const hay = `${item.title || ''} ${item.topic || ''} ${item.source_name || ''}`.toLowerCase();
      return (!state.filter || hay.includes(state.filter.toLowerCase()))
        && (state.domain === 'all' || item.domain === state.domain)
        && (!state.favoritesOnly || item.is_favorite);
    });

    target.innerHTML = filtered.length ? filtered.map(item => `
      <article class="azaad-evidence-card" data-id="${esc(item.id)}">
        <div class="azaad-evidence-card__head">
          <div><strong>${esc(item.title)}</strong><div>${sourceBadge(item)}</div></div>
          <button type="button" data-action="favorite" data-id="${esc(item.id)}" aria-label="Favorite">${item.is_favorite ? '⭐' : '☆'}</button>
        </div>
        <p>${esc(item.summary || item.description || '')}</p>
        <small>${esc(item.source_name || '')} · ${esc(item.version || '')} · ${esc(item.updated_at || item.publication_date || '')}</small>
        <div class="azaad-evidence-card__actions">
          <button type="button" data-action="review" data-id="${esc(item.id)}">Reviewed</button>
          <button type="button" data-action="discuss" data-id="${esc(item.id)}">Discuss with team</button>
          ${item.source_url ? `<a href="${esc(item.source_url)}" target="_blank" rel="noopener noreferrer">Source ↗</a>` : ''}
        </div>
      </article>`).join('') : '<div class="azaad-empty-state">No evidence updates match your filters.</div>';
  }

  function mount(target, items) {
    state.items = Array.isArray(items) ? items : [];
    render(target);
    target.addEventListener('click', event => {
      const button = event.target.closest('[data-action]');
      if (!button) return;
      const item = state.items.find(x => String(x.id) === String(button.dataset.id));
      if (!item) return;
      if (button.dataset.action === 'favorite') item.is_favorite = !item.is_favorite;
      if (button.dataset.action === 'review') item.reviewed_at = new Date().toISOString();
      if (button.dataset.action === 'discuss') item.discuss_with_team = true;
      render(target);
      target.dispatchEvent(new CustomEvent('azaad:evidence-action', { detail: { action: button.dataset.action, item } }));
    });
  }

  window.AzaadClinicalEvidenceLibrary = {
    mount,
    setFilter(value) { state.filter = value || ''; },
    setDomain(value) { state.domain = value || 'all'; },
    setFavoritesOnly(value) { state.favoritesOnly = !!value; },
    render
  };
})();
