
import { initTheme } from './modules/theme.js';
import { initAuth } from './modules/auth.js';
import { initNavigation } from './modules/navigation.js';
import { initAlunos } from './modules/alunos.js';
import { initIO } from './modules/io.js';
import { initSellerCfg } from './modules/seller.js';

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initAuth();
  initNavigation();
  initAlunos();
  initIO();
  initSellerCfg();
});
