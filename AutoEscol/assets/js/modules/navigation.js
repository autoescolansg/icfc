export function initNavigation(){
  document.querySelectorAll('.sidebar-nav .nav-link').forEach(a => {
    a.addEventListener('click', (e) => {
      // Se for um item com submenu, não previne o default imediatamente
      if (a.closest('.has-submenu')) {
        e.preventDefault();
        const parentItem = a.closest('.has-submenu');
        const submenu = parentItem.querySelector('.submenu');
        
        // Toggle a classe 'active' no item pai para controlar o submenu
        parentItem.classList.toggle('active');
        if (submenu) {
          // Animação simples de altura para o submenu
          if (parentItem.classList.contains('active')) {
            submenu.style.maxHeight = submenu.scrollHeight + "px";
          } else {
            submenu.style.maxHeight = "0";
          }
        }
        // Se o link do submenu for clicado, ele ainda deve ativar a seção
        if (!a.classList.contains('sub-nav-link')) {
          // Se for o link principal do submenu, não ativa a seção ainda
          // A ativação da seção ocorrerá se um sub-link for clicado
          return;
        }
      }

      // Remove a classe 'active' de todos os links da sidebar
      document.querySelectorAll('.sidebar-nav .nav-link').forEach(x => x.classList.remove('active'));
      // Adiciona a classe 'active' ao link clicado
      a.classList.add('active');
      
      const sectionId = a.getAttribute('data-section');
      
      // Oculta todas as seções de conteúdo
      document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
      // Mostra a seção correspondente ao link clicado
      const targetSection = document.getElementById(sectionId);
      if (targetSection) {
        targetSection.classList.add('active');
      }

      // Se a seção clicada for 'financeiro-entradas' ou 'financeiro-saidas',
      // garante que o link 'financeiro' principal também esteja ativo visualmente
      if (sectionId.startsWith('financeiro') && sectionId !== 'financeiro') {
        document.querySelector('.sidebar-nav .nav-link[data-section="financeiro"]')?.classList.add('active');
        // Garante que o submenu financeiro esteja aberto
        const financeiroParent = document.querySelector('.sidebar-nav .nav-item.has-submenu a[data-section="financeiro"]')?.closest('.has-submenu');
        if (financeiroParent && !financeiroParent.classList.contains('active')) {
          financeiroParent.classList.add('active');
          const submenu = financeiroParent.querySelector('.submenu');
          if (submenu) submenu.style.maxHeight = submenu.scrollHeight + "px";
        }
      }

      // Fecha a sidebar em telas pequenas após clicar em um item
      const sidebar = document.getElementById('sidebar');
      if (window.innerWidth <= 768 && sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
        // Altera o ícone do botão de abrir para 'bars'
        const btnToggleOpen = document.getElementById('btnToggleSidebarOpen');
        if (btnToggleOpen) btnToggleOpen.querySelector('i').className = 'fas fa-bars';
      }
    });
  });

  // Ativa a seção inicial (Dashboard) ao carregar a página
  const initialLink = document.querySelector('.sidebar-nav .nav-link[data-section="dashboard"]');
  if (initialLink) {
    initialLink.click();
  } else {
    // Fallback caso o dashboard não seja encontrado
    document.querySelector('.content-section.active')?.classList.remove('active');
    document.getElementById('dashboard')?.classList.add('active');
  }

  // Lógica para o botão de toggle da sidebar (hambúrguer)
  const btnToggleSidebarOpen = document.getElementById('btnToggleSidebarOpen');
  const btnToggleSidebarClose = document.getElementById('btnToggleSidebarClose');
  const sidebar = document.getElementById('sidebar');

  if (btnToggleSidebarOpen && sidebar) {
    btnToggleSidebarOpen.addEventListener('click', () => {
      sidebar.classList.add('active'); // Abre a sidebar
      // Altera o ícone do botão de abrir para 'times' (se visível)
      btnToggleSidebarOpen.querySelector('i').className = 'fas fa-times';
    });
  }

  if (btnToggleSidebarClose && sidebar) {
    btnToggleSidebarClose.addEventListener('click', () => {
      sidebar.classList.remove('active'); // Fecha a sidebar
      // Altera o ícone do botão de abrir para 'bars'
      const btnToggleOpen = document.getElementById('btnToggleSidebarOpen');
      if (btnToggleOpen) btnToggleOpen.querySelector('i').className = 'fas fa-bars';
    });
  }

  // Lógica para fechar a sidebar ao clicar fora dela em mobile
  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768 && sidebar.classList.contains('active')) {
      if (!sidebar.contains(e.target) && !btnToggleSidebarOpen.contains(e.target)) {
        sidebar.classList.remove('active');
        const btnToggleOpen = document.getElementById('btnToggleSidebarOpen');
        if (btnToggleOpen) btnToggleOpen.querySelector('i').className = 'fas fa-bars';
      }
    }
  });

  // Ajusta o submenu ao redimensionar a janela
  window.addEventListener('resize', () => {
    document.querySelectorAll('.has-submenu').forEach(parentItem => {
      const submenu = parentItem.querySelector('.submenu');
      if (submenu) {
        if (parentItem.classList.contains('active') && window.innerWidth > 1024) { // Se estiver ativo e em desktop
          submenu.style.maxHeight = submenu.scrollHeight + "px";
        } else if (window.innerWidth <= 1024) { // Se for mobile/tablet, esconde
          submenu.style.maxHeight = "0";
        }
      }
    });
  });
}
