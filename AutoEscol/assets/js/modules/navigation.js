
export function initNavigation(){
  document.querySelectorAll('.sidebar-menu a').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const section = a.getAttribute('data-section');
      document.querySelectorAll('.sidebar-menu a').forEach(x=>x.classList.remove('active'));
      a.classList.add('active');
      document.querySelectorAll('.section').forEach(s=> s.classList.remove('active'));
      document.getElementById(section)?.classList.add('active');
    });
  });
}
