// Đổi số sang chữ tiếng Việt: 1204500 -> "Một triệu hai trăm linh bốn nghìn năm trăm"
(function () {
  const CHU_SO = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
  const DON_VI = ['', ' nghìn', ' triệu', ' tỷ', ' nghìn tỷ', ' triệu tỷ'];

  // Đọc nhóm 3 chữ số; keepZeroHundred=true khi nhóm đứng sau nhóm khác
  function readTriple(n, keepZeroHundred) {
    const tram = Math.floor(n / 100);
    const chuc = Math.floor((n % 100) / 10);
    const donvi = n % 10;
    const parts = [];

    if (tram > 0 || keepZeroHundred) parts.push(CHU_SO[tram] + ' trăm');

    if (chuc > 1) {
      parts.push(CHU_SO[chuc] + ' mươi');
      if (donvi === 1) parts.push('mốt');
      else if (donvi === 4) parts.push('tư');
      else if (donvi === 5) parts.push('lăm');
      else if (donvi > 0) parts.push(CHU_SO[donvi]);
    } else if (chuc === 1) {
      parts.push('mười');
      if (donvi === 5) parts.push('lăm');
      else if (donvi > 0) parts.push(CHU_SO[donvi]);
    } else if (donvi > 0) {
      if (parts.length > 0) parts.push('linh');
      parts.push(CHU_SO[donvi]);
    }
    return parts.join(' ');
  }

  window.docSoVN = function (n) {
    n = Math.trunc(Math.abs(Number(n) || 0));
    if (n === 0) return 'Không';

    // Tách thành các nhóm 3 chữ số từ phải sang trái
    const groups = [];
    while (n > 0) {
      groups.unshift(n % 1000);
      n = Math.floor(n / 1000);
    }

    const parts = [];
    groups.forEach((g, i) => {
      const isFirst = i === 0;
      if (g === 0) return;
      parts.push(readTriple(g, !isFirst) + DON_VI[groups.length - 1 - i]);
    });

    const text = parts.join(' ').replace(/\s+/g, ' ').trim();
    return text.charAt(0).toUpperCase() + text.slice(1);
  };

  window.docTienVN = function (n) {
    return window.docSoVN(n) + ' đồng';
  };
})();
