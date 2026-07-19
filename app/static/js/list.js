// Trang kế toán: liệt kê, tìm kiếm, lọc toàn bộ phiếu.
(function () {
  const $ = (id) => document.getElementById(id);

  async function load() {
    const params = new URLSearchParams();
    const q = $('filter-q').value.trim();
    const dept = $('filter-dept').value;
    const month = $('filter-month').value; // YYYY-MM
    if (q) params.set('q', q);
    if (dept) params.set('department_id', dept);
    if (month) params.set('period', month.replace('-', ''));

    $('list-status').textContent = 'Đang tải...';
    try {
      const res = await api.get('/api/requests?' + params.toString());
      const tb = document.querySelector('#req-table tbody');
      tb.innerHTML = '';
      res.items.forEach((r) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><a href="/phieu/${r.id}"><strong>${r.doc_number}</strong></a></td>
          <td>${r.request_date.split('-').reverse().join('/')}</td>
          <td>${r.department_code}</td>
          <td>${r.requester_name}</td>
          <td class="ellipsis" title="${r.content}">${r.content}</td>
          <td class="tright">${fmt.vn(r.total_payment)}</td>
          <td class="tcenter">${r.attachment_count}</td>`;
        tb.appendChild(tr);
      });
      $('list-status').textContent = res.total === 0
        ? 'Chưa có phiếu nào khớp điều kiện lọc.'
        : `Hiển thị ${res.items.length} / ${res.total} phiếu.`;
    } catch (err) {
      $('list-status').textContent = 'Lỗi tải danh sách: ' + err.message;
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    try {
      const depts = await api.get('/api/departments');
      depts.forEach((d) => {
        const opt = document.createElement('option');
        opt.value = d.id;
        opt.textContent = `${d.code} - ${d.name}`;
        $('filter-dept').appendChild(opt);
      });
    } catch (_) { /* vẫn cho xem danh sách dù lỗi danh mục */ }

    $('btn-filter').addEventListener('click', load);
    $('btn-clear').addEventListener('click', () => {
      $('filter-q').value = '';
      $('filter-dept').value = '';
      $('filter-month').value = '';
      load();
    });
    $('filter-q').addEventListener('keydown', (e) => { if (e.key === 'Enter') load(); });
    load();
  });
})();
