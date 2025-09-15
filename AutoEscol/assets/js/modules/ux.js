// assets/js/modules/ux.js
export function showToast(message, type='info'){
  const el = document.getElementById('toast'); if (!el) return;
  el.textContent = message;
  el.className = 'toast show ' + (type||'');
  setTimeout(()=>{ el.classList.remove('show'); }, 2000);
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function calculateMonthlyTrend(currentValue, previousValue, elementId, type = 'number', invert = false) {
  const el = document.getElementById(elementId);
  if (!el) return;

  let percentageChange = 0;
  let trendClass = '';
  let icon = '';
  let displayValue = '';

  if (previousValue === 0) {
    if (currentValue > 0) {
      percentageChange = 100; // Aumento infinito ou de 100% se antes era zero
      trendClass = 'positive';
      icon = '<i class="fas fa-arrow-up"></i>';
    } else if (currentValue < 0) {
      percentageChange = -100; // Diminuição infinita ou de 100% se antes era zero
      trendClass = 'negative';
      icon = '<i class="fas fa-arrow-down"></i>';
    } else {
      displayValue = '—'; // Sem mudança
    }
  } else {
    percentageChange = ((currentValue - previousValue) / previousValue) * 100;
    if (invert) { // Para saídas, um aumento é negativo, uma diminuição é positiva
      if (percentageChange < 0) {
        trendClass = 'positive';
        icon = '<i class="fas fa-arrow-down"></i>'; // Saída diminuiu = bom
      } else if (percentageChange > 0) {
        trendClass = 'negative';
        icon = '<i class="fas fa-arrow-up"></i>'; // Saída aumentou = ruim
      }
    } else { // Para entradas/alunos, um aumento é positivo, uma diminuição é negativa
      if (percentageChange > 0) {
        trendClass = 'positive';
        icon = '<i class="fas fa-arrow-up"></i>';
      } else if (percentageChange < 0) {
        trendClass = 'negative';
        icon = '<i class="fas fa-arrow-down"></i>';
      }
    }
  }

  if (displayValue === '—') {
    el.innerHTML = displayValue;
    el.className = 'trend-indicator';
  } else {
    const formattedPercentage = Math.abs(percentageChange).toFixed(1);
    displayValue = `${icon} ${formattedPercentage}% desde o mês passado`;
    el.innerHTML = displayValue;
    el.className = `trend-indicator ${trendClass}`;
  }
}

// expose for simple require from auth
window.__ux = { showToast, formatCurrency, calculateMonthlyTrend };
