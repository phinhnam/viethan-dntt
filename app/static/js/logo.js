// Chọn logo Việt Hàn / Việt Hàn CNC, ghi nhớ bằng localStorage.
(function () {
  const LOGOS = {
    'viet-han': { img: '/static/img/viet-han.svg', name: 'CÔNG TY VIỆT HÀN' },
    'viet-han-cnc': { img: '/static/img/viet-han-cnc.svg', name: 'CÔNG TY VIỆT HÀN CNC' },
  };
  const KEY = 'vh_logo';

  function apply(choice) {
    const cfg = LOGOS[choice] || LOGOS['viet-han'];
    const img = document.getElementById('logo-img');
    const name = document.getElementById('company-name');
    const topbar = document.getElementById('topbar-logo');
    if (img) img.src = cfg.img;
    if (name) name.textContent = cfg.name;
    if (topbar) topbar.src = cfg.img;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const select = document.getElementById('logo-select');
    const saved = localStorage.getItem(KEY) || 'viet-han';
    if (select) {
      select.value = saved;
      select.addEventListener('change', () => {
        localStorage.setItem(KEY, select.value);
        apply(select.value);
      });
    }
    apply(saved);
  });
})();
