// Trang lập phiếu: nạp danh mục, xem trước số phiếu,
// "Lấy số quy định" = lưu phiếu + cấp số chính thức, rồi upload chứng từ.
(function () {
  const state = { requestId: window.PAGE.requestId, docNumber: null };

  const $ = (id) => document.getElementById(id);

  async function previewNumber() {
    if (state.requestId) return; // phiếu đã có số thật
    const deptId = $('department').value;
    const dateVal = $('request-date').value;
    if (!deptId) {
      $('doc-number').innerHTML = '&nbsp;';
      return;
    }
    try {
      const query = dateVal ? `&request_date=${dateVal}` : '';
      const res = await api.get(`/api/next-number?department_id=${deptId}${query}`);
      $('doc-number').textContent = `${res.preview} (dự kiến)`;
    } catch (err) {
      $('doc-number').innerHTML = '&nbsp;';
    }
  }

  function buildPayload() {
    const r = calc.recalc();
    return {
      department_id: Number($('department').value),
      request_date: $('request-date').value,
      requester_name: $('requester-name').value.trim(),
      content: $('content').value.trim(),
      recipient: $('recipient').value.trim(),
      bank_account: $('bank-account').value.trim(),
      advance_amount: r.totals.da,
      total_debt: r.colTotals.ck,
      total_payment: r.totals.pay,
      final_amount: r.net,
      amount_in_words: $('amount-words').textContent.trim(),
      debt_lines: calc.readMatrix(),
      payment_lines: calc.readRows(),
    };
  }

  async function save() {
    const btn = $('btn-save');
    const payload = buildPayload();
    if (!payload.department_id) { alert('Vui lòng chọn bộ phận để lấy số theo quy định.'); return; }
    if (!payload.request_date) { alert('Vui lòng chọn ngày lập phiếu.'); return; }
    if (!payload.requester_name) { alert('Vui lòng nhập tên người đề nghị.'); return; }

    btn.disabled = true;
    try {
      let res;
      if (state.requestId) {
        res = await api.put(`/api/requests/${state.requestId}`, payload);
      } else {
        res = await api.post('/api/requests', payload);
        state.requestId = res.id;
        history.replaceState(null, '', `/phieu/${res.id}`);
      }
      state.docNumber = res.doc_number;
      $('doc-number').textContent = res.doc_number;
      $('department').disabled = true; // số đã cấp theo bộ phận, không đổi nữa
      btn.textContent = 'Lưu thay đổi';

      await docs.uploadPending(state.requestId);
      alert(`Đã lưu phiếu số ${res.doc_number}`);
    } catch (err) {
      alert('Lỗi khi lưu phiếu: ' + err.message);
    } finally {
      btn.disabled = false;
    }
  }

  async function loadExisting() {
    const r = await api.get(`/api/requests/${state.requestId}`);
    state.docNumber = r.doc_number;
    $('doc-number').textContent = r.doc_number;
    $('request-date').value = r.request_date;
    $('department').value = String(r.department_id);
    $('department').disabled = true;
    $('requester-name').value = r.requester_name;
    $('content').value = r.content;
    $('recipient').value = r.recipient || 'Ban Tổng Giám Đốc';
    $('bank-account').value = r.bank_account || '';
    $('btn-save').textContent = 'Lưu thay đổi';

    calc.loadMatrix(r.debt_lines);
    (r.payment_lines.length ? r.payment_lines : [{}]).forEach((row) => calc.addRow(row));
    docs.setSaved(r.attachments);
    calc.recalc();
  }

  document.addEventListener('DOMContentLoaded', async () => {
    fmt.bindMoneyInputs(document);

    try {
      const [depts, types] = await Promise.all([
        api.get('/api/departments'),
        api.get('/api/doc-types'),
      ]);
      const select = $('department');
      depts.forEach((d) => {
        const opt = document.createElement('option');
        opt.value = d.id;
        opt.textContent = `${d.code} - ${d.name}`;
        select.appendChild(opt);
      });
      docs.setDocTypes(types);
    } catch (err) {
      alert('Không tải được danh mục từ máy chủ: ' + err.message);
      return;
    }

    if (state.requestId) {
      await loadExisting();
    } else {
      $('request-date').value = new Date().toISOString().slice(0, 10);
      calc.addRow();
      calc.recalc();
    }

    $('department').addEventListener('change', previewNumber);
    $('request-date').addEventListener('change', previewNumber);
    $('btn-save').addEventListener('click', save);
    $('btn-print').addEventListener('click', () => window.print());
  });
})();
