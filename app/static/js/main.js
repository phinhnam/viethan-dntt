// Khởi tạo trang lập phiếu: nạp danh mục, xem trước số phiếu,
// lưu phiếu (cấp số) rồi upload chứng từ.
(function () {
  const state = { requestId: window.PAGE.requestId, docNumber: null };

  const $ = (id) => document.getElementById(id);

  async function previewNumber() {
    if (state.requestId) return; // phiếu đã có số thật
    const deptId = $('department').value;
    const dateVal = $('request-date').value;
    if (!deptId) {
      $('doc-number').textContent = '(chọn bộ phận để xem số dự kiến)';
      return;
    }
    try {
      const query = dateVal ? `&request_date=${dateVal}` : '';
      const res = await api.get(`/api/next-number?department_id=${deptId}${query}`);
      $('doc-number').textContent = `${res.preview} (dự kiến - cấp chính thức khi lưu)`;
    } catch (err) {
      $('doc-number').textContent = '(không xem trước được số phiếu)';
    }
  }

  function buildPayload() {
    const totals = calc.recalc();
    return {
      department_id: Number($('department').value),
      request_date: $('request-date').value,
      requester_name: $('requester-name').value.trim(),
      content: $('content').value.trim(),
      advance_amount: totals.advance,
      total_debt: totals.debtTotal,
      total_payment: totals.paymentTotal,
      final_amount: totals.final,
      amount_in_words: $('amount-words').textContent,
      debt_lines: calc.readRows('debt'),
      payment_lines: calc.readRows('payment'),
    };
  }

  async function save() {
    const btn = $('btn-save');
    const payload = buildPayload();
    if (!payload.department_id) { alert('Vui lòng chọn bộ phận để cấp số phiếu.'); return; }
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

      await docs.uploadPending(state.requestId);
      alert(`Đã lưu phiếu ${res.doc_number}`);
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
    $('advance').value = fmt.vn(r.advance_amount);

    (r.debt_lines.length ? r.debt_lines : [{}]).forEach((row) => calc.addRow('debt', row));
    (r.payment_lines.length ? r.payment_lines : [{}]).forEach((row) => calc.addRow('payment', row));
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
      calc.addRow('debt');
      calc.addRow('debt');
      calc.addRow('payment');
      calc.addRow('payment');
      calc.recalc();
    }

    $('department').addEventListener('change', previewNumber);
    $('request-date').addEventListener('change', previewNumber);
    $('btn-save').addEventListener('click', save);
    $('btn-print').addEventListener('click', () => window.print());
  });
})();
