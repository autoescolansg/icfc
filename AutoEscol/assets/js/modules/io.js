
function currentFilterSuffix(){
  const dS = document.getElementById('dateStart')?.value || '';
  const dE = document.getElementById('dateEnd')?.value || '';
  if (!dS && !dE) return 'todos';
  return `${dS||'inicio'}_a_${dE||'hoje'}`;
}

export function initIO(){
  document.getElementById('btnExport')?.addEventListener('click', async ()=>{
    const { getFiltered } = await import('./alunos.js');
    const data = getFiltered();
    const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `alunos_${currentFilterSuffix()}.json` });
    a.click(); URL.revokeObjectURL(a.href);
  });

  document.getElementById('btnExportCSV')?.addEventListener('click', async ()=>{
    const { getFiltered } = await import('./alunos.js');
    const data = getFiltered();
    const header = ['nome','cpf','telefone','dataCadastro','categoria','vendedor','statusGeral'];
    const rows = [header.join(',')].concat(data.map(a=>[a.nome,a.cpf,a.telefone,a.dataCadastro,a.categoria,a.vendedor,a.statusGeral].map(v=>`"${String(v||'').replaceAll('"','""')}"`).join(',')));
    const blob = new Blob([rows.join('\n')], {type:'text/csv;charset=utf-8;'});
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `alunos_${currentFilterSuffix()}.csv` });
    a.click(); URL.revokeObjectURL(a.href);
  });

  document.getElementById('btnPDF')?.addEventListener('click', async ()=>{
    const { getFiltered } = await import('./alunos.js');
    const data = getFiltered();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit:'pt', format:'a4' });
    const W = doc.internal.pageSize.getWidth();
    let y = 60;
    doc.setFillColor(18,20,26); doc.rect(0,0,W,40,'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(18);
    doc.text('Relatório de Alunos - AutoEscola', 40, 70);
    doc.setFont('helvetica','normal'); doc.setFontSize(11);
    const dS = document.getElementById('dateStart')?.value || '—';
    const dE = document.getElementById('dateEnd')?.value || '—';
    doc.text(`Período: ${dS} a ${dE}   |   Gerado em: ${new Date().toLocaleString('pt-BR')}`, 40, 88);
    y = 120;
    // head
    doc.setFont('helvetica','bold'); doc.text('Nome', 40, y); doc.text('CPF', 220, y); doc.text('Telefone', 320, y); doc.text('Vendedor', 420, y); doc.text('Status', 520, y);
    y += 8; doc.setLineWidth(0.5); doc.line(40, y, W-40, y); y += 14;
    doc.setFont('helvetica','normal'); doc.setFontSize(10);
    for (const a of data.slice(0, 400)){
      if (y > 780){ doc.addPage(); y = 60; }
      doc.text(String(a.nome||''), 40, y, {maxWidth:160});
      doc.text(String(a.cpf||''), 220, y);
      doc.text(String(a.telefone||''), 320, y);
      doc.text(String(a.vendedor||''), 420, y);
      doc.text(String(a.statusGeral||''), 520, y);
      y += 16;
    }
    doc.save(`relatorio_alunos_${currentFilterSuffix()}.pdf`);
  });
}
