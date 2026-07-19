// Chứng từ kèm theo: bấm nút loại chứng từ hoặc kéo-thả file,
// nhận diện loại theo tiền tố tên file: TT- (Tờ trình), BG- (Báo giá),
// NT- (Nghiệm thu), HD- (Hóa đơn), HDKT-/HĐ- (Hợp đồng).
(function () {
  const state = {
    docTypes: [],       // [{prefix, name, aliases:[]}]
    pending: [],        // file chưa upload: {file, prefix}
    saved: [],          // chứng từ đã lưu trên server (khi mở lại phiếu)
    chipPrefix: null,   // loại đang chọn khi bấm chip
  };

  function detectPrefix(filename) {
    const stem = filename.replace(/\.[^.]*$/, '');
    const head = (stem.split(/[_\-\s.]/)[0] || '').toUpperCase();
    for (const t of state.docTypes) {
      if (t.prefix === head || (t.aliases || []).includes(head)) return t.prefix;
    }
    return 'KHAC';
  }

  function typeName(prefix) {
    const t = state.docTypes.find((x) => x.prefix === prefix);
    return t ? t.name : prefix;
  }

  function typeSelect(prefix) {
    const options = state.docTypes
      .map((t) => `<option value="${t.prefix}" ${t.prefix === prefix ? 'selected' : ''}>${t.name}</option>`)
      .join('');
    return `<select class="attach-type no-print">${options}</select><span class="print-only">${typeName(prefix)}</span>`;
  }

  function renderChips() {
    const box = document.getElementById('type-chips');
    if (!box) return;
    box.innerHTML = '';
    state.docTypes
      .filter((t) => t.prefix !== 'KHAC' && t.prefix !== 'DNTT')
      .forEach((t) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'chip';
        btn.textContent = t.name;
        btn.dataset.prefix = t.prefix;
        box.appendChild(btn);
      });
  }

  function render() {
    const tb = document.querySelector('#attach-table tbody');
    tb.innerHTML = '';
    let stt = 0;

    state.saved.forEach((a) => {
      stt += 1;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="tcenter">${stt}</td>
        <td>${typeName(a.doc_type_prefix)}</td>
        <td><a href="/api/attachments/${a.id}/download">${a.original_name}</a></td>
        <td>${fmt.size(a.size)}</td>
        <td class="col-del no-print"><button type="button" class="btn-del" data-saved-id="${a.id}" title="Xóa chứng từ">✕</button></td>`;
      tb.appendChild(tr);
    });

    state.pending.forEach((p, i) => {
      stt += 1;
      const tr = document.createElement('tr');
      tr.className = 'pending';
      tr.innerHTML = `
        <td class="tcenter">${stt}</td>
        <td data-pending-type="${i}">${typeSelect(p.prefix)}</td>
        <td>${p.file.name} <span class="badge no-print">chưa lưu</span></td>
        <td>${fmt.size(p.file.size)}</td>
        <td class="col-del no-print"><button type="button" class="btn-del" data-pending-id="${i}" title="Bỏ file">✕</button></td>`;
      tb.appendChild(tr);
    });

    // Ẩn bảng khi chưa có chứng từ nào
    document.getElementById('attach-table').style.display = stt ? '' : 'none';
  }

  function addFiles(fileList, forcedPrefix) {
    [...fileList].forEach((file) => {
      state.pending.push({
        file,
        prefix: forcedPrefix || detectPrefix(file.name),
      });
    });
    render();
  }

  document.addEventListener('DOMContentLoaded', () => {
    const dropzone = document.getElementById('dropzone');
    const input = document.getElementById('file-input');

    dropzone.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      state.chipPrefix = chip ? chip.dataset.prefix : null;
      input.click();
    });
    input.addEventListener('change', () => {
      addFiles(input.files, state.chipPrefix);
      state.chipPrefix = null;
      input.value = '';
    });
    ['dragover', 'dragenter'].forEach((ev) => dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    }));
    ['dragleave', 'drop'].forEach((ev) => dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
    }));
    dropzone.addEventListener('drop', (e) => addFiles(e.dataTransfer.files));

    document.querySelector('#attach-table').addEventListener('change', (e) => {
      const cell = e.target.closest('[data-pending-type]');
      if (cell && e.target.classList.contains('attach-type')) {
        state.pending[Number(cell.dataset.pendingType)].prefix = e.target.value;
      }
    });

    document.querySelector('#attach-table').addEventListener('click', async (e) => {
      const btn = e.target.closest('.btn-del');
      if (!btn) return;
      if (btn.dataset.pendingId !== undefined) {
        state.pending.splice(Number(btn.dataset.pendingId), 1);
        render();
      } else if (btn.dataset.savedId !== undefined) {
        if (!confirm('Xóa chứng từ này khỏi phiếu?')) return;
        await api.del(`/api/attachments/${btn.dataset.savedId}`);
        state.saved = state.saved.filter((a) => a.id !== Number(btn.dataset.savedId));
        render();
      }
    });

    render();
  });

  window.docs = {
    state,
    render,
    setDocTypes(types) {
      state.docTypes = types;
      renderChips();
    },
    setSaved(list) { state.saved = list; render(); },
    async uploadPending(requestId) {
      while (state.pending.length > 0) {
        const p = state.pending[0];
        const saved = await api.upload(
          `/api/requests/${requestId}/attachments`, p.file, p.prefix,
        );
        state.saved.push(saved);
        state.pending.shift();
        render();
      }
    },
  };
})();
