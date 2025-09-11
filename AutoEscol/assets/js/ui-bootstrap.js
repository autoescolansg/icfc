// assets/js/ui-bootstrap-safe.js
// Aplica classes do Bootstrap de forma CONSERVADORA:
// - NÃO altera body/container/header/sidebar
// - Só estiliza inputs, selects, botões e a tabela de alunos

(function () {
  function add(el, ...cls) { if (el) el.classList.add(...cls.filter(Boolean)); }
  function q(sel, root=document){ return root.querySelector(sel); }
  function qa(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }

  document.addEventListener("DOMContentLoaded", () => {
    // Inputs e selects
    qa("input[type='text'], input[type='date'], input[type='email'], input[type='password'], input[type='number'], select, textarea")
      .forEach(i => {
        if (!i.classList.contains("form-control")) add(i, "form-control");
      });
    qa("label").forEach(l => add(l, "form-label"));

    // Botões (não sobrescreve se já tem classes próprias)
    qa("button").forEach(b => {
      if (b.classList.contains("btn")) return;
      const txt = (b.textContent || "").trim().toLowerCase();
      if (b.dataset.action === "excluir" || txt.includes("exclu")) { add(b, "btn", "btn-danger", "btn-sm"); return; }
      if (txt.includes("salv") || txt.includes("cadastr") || txt.includes("enviar") || txt.includes("gravar")) { add(b, "btn", "btn-primary"); return; }
      if (txt.includes("cancel") || txt.includes("fechar")) { add(b, "btn", "btn-outline-secondary"); return; }
      if (txt.includes("editar")) { add(b, "btn", "btn-outline-primary", "btn-sm"); return; }
      // default
      add(b, "btn", "btn-outline-secondary", "btn-sm");
    });

    // Tabela de alunos (se existir)
    const table = q("#alunosTable");
    if (table) {
      add(table, "table", "table-hover", "align-middle");
      const thead = q("thead", table);
      const tbody = q("tbody", table);
      if (thead) add(thead, "table-light");
      if (tbody) add(tbody, "table-group-divider");
    }

    // Badges de status → já mapeadas via CSS (apenas garante badge shape)
    qa(".status-badge").forEach(s => add(s, "badge", "rounded-pill"));

    // Filtros, se houver barra com esta classe
    const filterBar = q(".filter-bar");
    if (filterBar) add(filterBar, "d-flex", "flex-wrap", "gap-2", "align-items-end");
  });
})();
