
// assets/js/ui-bootstrap.js
// Aplica classes do Bootstrap de forma progressiva, sem precisar reescrever o HTML.
// Ajuste os seletores se tiver IDs/classes diferentes no seu projeto.
(function () {
  function add(el, ...cls) { if (el) el.classList.add(...cls.filter(Boolean)); }
  function q(sel, root=document){ return root.querySelector(sel); }
  function qa(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }

  document.addEventListener("DOMContentLoaded", () => {
    // Layout gerais
    add(document.body, "bg-light");
    const app = q("#app");
    const login = q("#login");
    add(app, "container-fluid", "py-3");
    add(login, "container", "py-5", "d-flex", "justify-content-center", "align-items-center");

    // Cards e seções
    qa(".card").forEach(c => add(c, "card", "shadow-sm", "rounded-3", "mb-3"));
    qa(".card .card-header").forEach(h => add(h, "card-header", "bg-white", "fw-semibold"));
    qa(".section, section").forEach(s => add(s, "mb-4"));

    // Inputs & labels
    qa("input[type='text'], input[type='date'], input[type='email'], input[type='password'], select, textarea")
      .forEach(i => add(i, "form-control"));
    qa("label").forEach(l => add(l, "form-label"));

    // Botões (tentamos detectar botões por padrão)
    qa("button").forEach(b => {
      const txt = (b.textContent || "").trim().toLowerCase();
      if (b.classList.contains("btn")) return;
      if (b.classList.contains("btn-danger") || txt.includes("exclu")) { add(b, "btn", "btn-danger", "btn-sm"); return; }
      if (txt.includes("salv") || txt.includes("cadastr") || txt.includes("enviar") || txt.includes("gravar")) { add(b, "btn", "btn-primary"); return; }
      if (txt.includes("cancel") || txt.includes("fechar")) { add(b, "btn", "btn-outline-secondary"); return; }
      if (txt.includes("editar")) { add(b, "btn", "btn-outline-primary", "btn-sm"); return; }
      // default
      add(b, "btn", "btn-outline-secondary");
    });

    // Tabela de alunos
    const table = q("#alunosTable");
    if (table) {
      add(table, "table", "table-hover", "align-middle");
      const thead = q("thead", table);
      const tbody = q("tbody", table);
      add(thead, "table-light");
      add(tbody, "table-group-divider");
    }

    // Badges de status (mapear para classes do Bootstrap via CSS custom)
    qa(".status-badge").forEach(s => add(s, "badge", "rounded-pill"));

    // Navbar/Sidebar (se existirem)
    qa("header, .topbar").forEach(h => add(h, "navbar", "navbar-expand-lg", "bg-white", "border-bottom", "mb-3"));
    qa("header .brand, .logo").forEach(b => add(b, "navbar-brand", "fw-bold"));
    qa("nav ul").forEach(ul => add(ul, "nav", "nav-pills", "flex-column", "gap-2"));
    qa("nav a, .sidebar a").forEach(a => add(a, "nav-link"));

    // Formularios compostos em grid
    qa(".form-row, .row").forEach(r => add(r, "row", "g-3"));
    qa(".col, .col-6, .col-4, .col-3").forEach(c => add(c, "col"));

    // Modal edição (se não usar Bootstrap JS, apenas estiliza)
    const modal = q("#editModal");
    if (modal) {
      add(modal, "modal", "fade", "show");
      // Evita interferir na lógica atual: só aplica visual.
      // Se quiser usar Bootstrap modal de verdade, migramos para estrutura .modal-dialog/.modal-content.
    }

    // Toast simples
    const toast = q("#toast");
    if (toast) add(toast, "position-fixed", "bottom-0", "end-0", "m-3", "alert", "alert-info", "shadow");

    // Gráficos: deixa canvas responsivo
    qa("canvas").forEach(c => add(c, "img-fluid"));

    // Campos de busca/filtro em uma barra
    const filterBar = q(".filter-bar");
    if (filterBar) add(filterBar, "d-flex", "flex-wrap", "gap-2", "align-items-end");
  });
})();
