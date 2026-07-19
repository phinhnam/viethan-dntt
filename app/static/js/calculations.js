// Tính toán các ô trong bảng: tổng công nợ, tổng thanh toán,
// số tiền hoàn ứng / thanh toán thêm và số tiền bằng chữ.
(function () {
  function rowTemplate(kind) {
    const tr = document.createElement('tr');
    if (kind === 'debt') {
      tr.innerHTML = `
        <td class="col-stt tcenter stt"></td>
        <td><input type="text" data-f="desc"></td>
        <td><input type="text" data-f="invoice_no"></td>
        <td><input type="date" data-f="invoice_date"></td>
        <td><input type="text" data-f="amount" class="money tright" value="0"></td>
        <td><input type="text" data-f="note"></td>
        <td class="col-del no-print"><button type="button" class="btn-del" title="Xóa dòng">✕</button></td>`;
    } else {
      tr.innerHTML = `
        <td class="col-stt tcenter stt"></td>
        <td><input type="text" data-f="desc"></td>
        <td><input type="text" data-f="amount" class="money tright" value="0"></td>
        <td><input type="text" data-f="note"></td>
        <td class="col-del no-print"><button type="button" class="btn-del" title="Xóa dòng">✕</button></td>`;
    }
    return tr;
  }

  function tbody(kind) {
    return document.querySelector(`#${kind}-table tbody`);
  }

  function renumber(kind) {
    tbody(kind).querySelectorAll('.stt').forEach((td, i) => { td.textContent = i + 1; });
  }

  function addRow(kind, data) {
    const tr = rowTemplate(kind);
    tbody(kind).appendChild(tr);
    if (data) {
      tr.querySelectorAll('[data-f]').forEach((input) => {
        const f = input.dataset.f;
        if (f === 'amount') input.value = fmt.vn(data.amount || 0);
        else input.value = data[f] || '';
      });
    }
    renumber(kind);
    return tr;
  }

  function readRows(kind) {
    return [...tbody(kind).querySelectorAll('tr')].map((tr) => {
      const row = {};
      tr.querySelectorAll('[data-f]').forEach((input) => {
        row[input.dataset.f] = input.dataset.f === 'amount'
          ? fmt.parse(input.value)
          : input.value.trim();
      });
      return row;
    }).filter((row) => Object.values(row).some((v) => v !== '' && v !== 0));
  }

  function sum(kind) {
    return [...tbody(kind).querySelectorAll('input[data-f="amount"]')]
      .reduce((acc, input) => acc + fmt.parse(input.value), 0);
  }

  function recalc() {
    const debtTotal = sum('debt');
    const paymentTotal = sum('payment');
    const advance = fmt.parse(document.getElementById('advance').value);
    // Dương: cần thanh toán thêm; âm: thừa tạm ứng, phải hoàn lại
    const final = paymentTotal - advance;

    document.getElementById('debt-total').textContent = fmt.vn(debtTotal);
    document.getElementById('payment-total').textContent = fmt.vn(paymentTotal);
    document.getElementById('final-label').textContent = final >= 0
      ? (advance > 0 ? 'Số tiền đề nghị thanh toán thêm' : 'Số tiền đề nghị thanh toán')
      : 'Số tiền hoàn ứng lại';
    document.getElementById('final-amount').textContent = fmt.vn(Math.abs(final));
    document.getElementById('amount-words').textContent = docTienVN(Math.abs(final));

    return { debtTotal, paymentTotal, advance, final };
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('input', (e) => {
      if (e.target.closest('#debt-table, #payment-table') || e.target.id === 'advance') recalc();
    });
    document.addEventListener('click', (e) => {
      const add = e.target.closest('[data-add]');
      if (add) { addRow(add.dataset.add); return; }
      const del = e.target.closest('.btn-del');
      if (del && del.closest('#debt-table, #payment-table')) {
        const table = del.closest('table');
        del.closest('tr').remove();
        renumber(table.id === 'debt-table' ? 'debt' : 'payment');
        recalc();
      }
    });
  });

  window.calc = { addRow, readRows, recalc };
})();
