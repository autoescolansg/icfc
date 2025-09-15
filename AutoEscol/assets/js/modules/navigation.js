export function initNavigation(){
  document.querySelectorAll('.sidebar-menu a').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const sectionId = a.getAttribute('data-section');
      
      // Remove a classe 'active' de todos os links da sidebar
      document.querySelectorAll('.sidebar-menu a').forEach(x => x.classList.remove('active'));
      // Adiciona a classe 'active' ao link clicado
      a.classList.add('active');
      
      // Oculta todas as seções de conteúdo
      document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
      // Mostra a seção correspondente ao link clicado
      const targetSection = document.getElementById(sectionId);
      if (targetSection) {
        targetSection.classList.add('active');
      }

      // Se a seção clicada for 'financeiro', 'financeiro-entradas' ou 'financeiro-saidas',
      // garante que o link 'financeiro' principal também esteja ativo visualmente
      if (sectionId.startsWith('financeiro') && sectionId !== 'financeiro') {
        document.querySelector('.sidebar-menu a[data-section="financeiro"]')?.classList.add('active');
      }

      // Fecha a sidebar em telas pequenas após clicar em um item
      const sidebar = document.getElementById('sidebar');
      if (window.innerWidth <= 768 && sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
      }
    });
  });

  // Ativa a seção inicial (Dashboard) ao carregar a página
  document.querySelector('.sidebar-menu a[data-section="dashboard"]')?.click();

  // Lógica para o botão de toggle da sidebar (hambúrguer)
  const btnToggleSidebar = document.getElementById('btnToggleSidebar');
  const sidebar = document.getElementById('sidebar');
  if (btnToggleSidebar && sidebar) {
    btnToggleSidebar.addEventListener('click', () => {
      sidebar.classList.toggle('active');
      // Altera o ícone do botão
      const icon = btnToggleSidebar.querySelector('i');
      if (icon) {
        icon.className = sidebar.classList.contains('active') ? 'fas fa-times' : 'fas fa-bars';
      }
    });
  }
}
