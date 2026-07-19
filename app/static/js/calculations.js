// Tính toán các ô trong bảng theo biểu mẫu TCKT-DNTT-BM01:
// - Bảng I (công nợ): tổng cộng từng cột.
// - Bảng II: mỗi dòng tự tính Số tiền hoàn ứng / Số tiền thanh toán /
//   Giá trị còn lại từ "Giá trị thực hiện/Tạm ứng" và "Đã thanh toán/Hoàn ứng".
// - Số tiền bằng chữ theo số tiền thanh toán (hoặc hoàn ứng) ròng.
(function () {
  const MATRIX_ROWS = ['dau_ky', 'thuc_hien'];
  const MATRIX_COLS = ['ps', 'tt', 'ck', 'qh', 'hm', 'tg'];
  const dash = (n) => (n ? fmt.vn(n) : '-');

  // ---------------- Bảng II: dòng động ----------------

  function rowTemplate() {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="col-stt tcenter stt"></td>
      <td><input type="text" data-f="desc"></td>
      <td><input type="text" data-f="bp"></td>
      <td><input type="text" data-f="gt" class="money tright"></td>
      <td><input type="text" data-f="da" class="money tright"></td>
      <td class="tright c-refund">-</td>
      <td class="tright c-pay">-</td>
      <td class="tright c-remain">-</td>
      <td><input type="text" data-f="note"></td>
      <td class="col-del no-print"><button type="button" class="btn-del" title="Xóa dòng">✕</button></td>`;
    return tr;
  }

  function tbody() {
    return document.querySelector('#payment-table tbody');
  }

  function renumber() {
    tbody().querySelectorAll('.stt').forEach((td, i) => { td.textContent = i + 1; });
  }

  function addRow(data) {
    const tr = rowTemplate();
    tbody().appendChild(tr);
    if (data) {
      tr.querySelectorAll('[data-f]').forEach((input) => {
        const f = input.dataset.f;
        if (f === 'gt' || f === 'da') input.value = data[f] ? fmt.vn(data[f]) : '';
        else input.value = data[f] || '';
      });
    }
    renumber();
    recalc();
    return tr;
  }

  function recalcRow(tr) {
    const get = (f) => fmt.parse(tr.querySelector(`[data-f="${f}"]`).value);
    const gt = get('gt');
    const da = get('da');
    const diff = gt - da;
    const pay = diff > 0 ? diff : 0;      // còn thiếu -> đề nghị thanh toán
    const refund = diff < 0 ? -diff : 0;  // ứng thừa -> hoàn ứng lại
    tr.querySelector('.c-refund').textContent = dash(refund);
    tr.querySelector('.c-pay').textContent = dash(pay);
    tr.querySelector('.c-remain').textContent = diff ? fmt.vn(diff) : '-';
    return { gt, da, pay, refund, remain: diff };
  }

  function readRows() {
    return [...tbody().querySelectorAll('tr')].map((tr) => {
      const row = {};
      tr.querySelectorAll('[data-f]').forEach((input) => {
        const f = input.dataset.f;
        row[f] = (f === 'gt' || f === 'da') ? fmt.parse(input.value) : input.value.trim();
      });
      const c = recalcRow(tr);
      row.refund = c.refund;
      row.pay = c.pay;
      row.remain = c.remain;
      return row;
    }).filter((row) => Object.values(row).some((v) => v !== '' && v !== 0));
  }

  // ---------------- Bảng I: ma trận công nợ ----------------

  function matrixInput(row, col) {
    return document.querySelector(`#debt-table [data-row="${row}"][data-col="${col}"]`);
  }

  function readMatrix() {
    return MATRIX_ROWS.map((row) => {
      const item = { row };
      MATRIX_COLS.forEach((col) => {
        item[col] = fmt.parse(matrixInput(row, col).value);
      });
      return item;
    });
  }

  function loadMatrix(list) {
    (list || []).forEach((item) => {
      if (!MATRIX_ROWS.includes(item.row)) return;
      MATRIX_COLS.forEach((col) => {
        const input = matrixInput(item.row, col);
        const value = item[col] || 0;
        if (!value) return;
        input.value = col === 'tg' ? String(value) : fmt.vn(value);
      });
    });
  }

  // ---------------- Tổng hợp ----------------

  function recalc() {
    // Bảng I: tổng từng cột tiền
    const colTotals = {};
    ['ps', 'tt', 'ck', 'qh', 'hm'].forEach((col) => {
      let sum = 0;
      MATRIX_ROWS.forEach((row) => { sum += fmt.parse(matrixInput(row, col).value); });
      colTotals[col] = sum;
      document.querySelector(`#debt-table [data-total="${col}"]`).textContent = dash(sum);
    });

    // Bảng II: từng dòng + tổng
    const totals = { gt: 0, da: 0, refund: 0, pay: 0, remain: 0 };
    tbody().querySelectorAll('tr').forEach((tr) => {
      const c = recalcRow(tr);
      totals.gt += c.gt;
      totals.da += c.da;
      totals.refund += c.refund;
      totals.pay += c.pay;
      totals.remain += c.remain;
    });
    const totalCell = (k) => document.querySelector(`#payment-table [data-ptotal="${k}"]`);
    totalCell('gt').textContent = fmt.vn(totals.gt);
    totalCell('da').textContent = fmt.vn(totals.da);
    totalCell('refund').textContent = dash(totals.refund);
    totalCell('pay').textContent = dash(totals.pay);
    totalCell('remain').textContent = totals.remain ? fmt.vn(totals.remain) : '0';

    // Số tiền ròng: dương = thanh toán thêm, âm = hoàn ứng lại
    const net = totals.pay - totals.refund;
    const words = document.getElementById('amount-words');
    if (totals.gt === 0 && totals.da === 0) {
      words.innerHTML = '&nbsp;';
    } else {
      words.textContent = (net < 0 ? '(Hoàn ứng) ' : '') + docTienVN(Math.abs(net));
    }

    return { colTotals, totals, net };
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('input', (e) => {
      if (e.target.closest('#debt-table, #payment-table')) recalc();
    });
    document.addEventListener('click', (e) => {
      const add = e.target.closest('[data-add="payment"]');
      if (add) { addRow(); return; }
      const del = e.target.closest('.btn-del');
      if (del && del.closest('#payment-table')) {
        del.closest('tr').remove();
        renumber();
        recalc();
      }
    });
  });

  window.calc = { addRow, readRows, readMatrix, loadMatrix, recalc };
})();
