import { startCrawler } from './crawler';

export function injectUI() {
  const btn = document.createElement('button');
  btn.textContent = 'Export to MD';
  btn.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 999999;
    padding: 10px 20px;
    background: #1976d2;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-family: Arial, sans-serif;
    box-shadow: 0 4px 6px rgba(0,0,0,0.3);
  `;
  
  btn.addEventListener('click', () => {
    btn.textContent = 'Crawling...';
    btn.disabled = true;
    startCrawler().then(() => {
      btn.textContent = 'Export to MD';
      btn.disabled = false;
    }).catch(e => {
      console.error(e);
      btn.textContent = 'Error!';
    });
  });

  document.body.appendChild(btn);
}
