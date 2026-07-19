// Định dạng & phân tích số tiền kiểu Việt Nam (1.500.000).
window.fmt = {
  vn(n) {
    n = Math.trunc(Number(n) || 0);
    return n.toLocaleString('vi-VN');
  },
  parse(s) {
    const digits = String(s ?? '').replace(/[^\d]/g, '');
    return digits ? parseInt(digits, 10) : 0;
  },
  size(bytes) {
    if (bytes >= 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
    if (bytes >= 1024) return Math.round(bytes / 1024) + ' KB';
    return bytes + ' B';
  },
  // Tự chèn dấu chấm ngăn cách nghìn khi đang gõ trong ô .money
  bindMoneyInputs(root) {
    (root || document).addEventListener('input', (e) => {
      const el = e.target;
      if (!el.classList || !el.classList.contains('money')) return;
      const value = this.parse(el.value);
      el.value = value ? this.vn(value) : '';
    });
  },
};
