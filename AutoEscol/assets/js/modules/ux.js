// assets/js/modules/ux.js
export function showToast(message, type='info'){
  const el = document.getElementById('toast'); if (!el) return;
  el.textContent = message;
  el.className = 'toast show ' + (type||'');
  setTimeout(()=>{ el.classList.remove('show'); }, 2000);
}
// expose for simple require from auth
window.__ux = { showToast };

export function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function calculateMonthlyTrend(currentValue, previousValue, elementId, unit = '') {
  const trendEl = document.getElementById(elementId);
  if (!trendEl) return;

  let percentageChange = 0;
  let trendClass = '';
  let trendIcon = '';

  if (previousValue === 0) {
    if (currentValue > 0) {
      percentageChange = 100; // Aumento infinito ou de 0 para um valor
      trendClass = 'positive';
      trendIcon = 'fa-arrow-up';
    } else if (currentValue < 0) {
      percentageChange = 100; // Diminuição infinita
      trendClass = 'negative';
      trendIcon = 'fa-arrow-down';
    } else {
      trendEl.innerHTML = `<span>—</span>`; // Sem mudança
      return;
    }
  } else {
    percentageChange = ((currentValue - previousValue) / previousValue) * 100;
    if (percentageChange > 0) {
      trendClass = 'positive';
      trendIcon = 'fa-arrow-up';
    } else if (percentageChange < 0) {
      trendClass = 'negative';
      trendIcon = 'fa-arrow-down';
    } else {
      trendEl.innerHTML = `<span>—</span>`; // Sem mudança
      return;
    }
  }

  const formattedChange = Math.abs(percentageChange).toFixed(2);
  trendEl.innerHTML = `<span class="${trendClass}"><i class="fas ${trendIcon}"></i> ${formattedChange}% ${unit}</span>`;
}

// Função para validação de formulários
export function validateForm(form) {
  let isValid = true;
  form.querySelectorAll('[required]').forEach(input => {
    if (!input.checkValidity()) {
      input.classList.add('is-invalid');
      input.classList.remove('is-valid');
      isValid = false;
    } else {
      input.classList.remove('is-invalid');
      input.classList.add('is-valid');
    }

    // Validação específica para o select de vendedor em colaboradores
    if (input.id === 'colaborador-seller' && document.getElementById('colaborador-role')?.value === 'colaborador' && !input.value) {
      input.classList.add('is-invalid');
      input.classList.remove('is-valid');
      isValid = false;
    }
  });
  return isValid;
}

// Adiciona event listeners para validação em tempo real
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('form').forEach(form => {
    form.setAttribute('novalidate', ''); // Desabilita validação HTML padrão
    form.querySelectorAll('[required]').forEach(input => {
      input.addEventListener('input', () => {
        if (input.checkValidity()) {
          input.classList.remove('is-invalid');
          input.classList.add('is-valid');
        } else {
          input.classList.add('is-invalid');
          input.classList.remove('is-valid');
        }

        // Validação específica para o select de vendedor em colaboradores
        if (input.id === 'colaborador-seller' && document.getElementById('colaborador-role')?.value === 'colaborador') {
          if (!input.value) {
            input.classList.add('is-invalid');
            input.classList.remove('is-valid');
          } else {
            input.classList.remove('is-invalid');
            input.classList.add('is-valid');
          }
        }
      });
    });
  });
});
