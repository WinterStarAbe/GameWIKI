import { DataLoader } from '../utils/dataLoader.js';

export async function renderGameHome({ slug }) {
  const container = document.createElement('div');
  container.className = 'py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto';
  
  try {
    const game = await DataLoader.getGameData(slug);
    
    // Breadcrumbs with Back Button
    let html = `
      <div class="flex items-center gap-4 mb-8">
        <button id="back-btn" class="back-btn" aria-label="返回上一頁">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <nav class="text-sm" aria-label="Breadcrumb">
          <ol class="inline-flex items-center space-x-1 md:space-x-3 text-gray-400">
            <li class="inline-flex items-center">
              <a href="#/" class="inline-flex items-center hover:text-purple-400 transition-colors">首頁</a>
            </li>
            <li>
              <div class="flex items-center">
                <svg class="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path></svg>
                <span class="ml-1 md:ml-2 text-gray-200">${game.title}</span>
              </div>
            </li>
          </ol>
        </nav>
      </div>

      <div class="mb-12 border-b border-gray-800 pb-8">
        <h1 class="text-4xl font-extrabold text-white tracking-tight mb-4">${game.title}</h1>
        <p class="text-xl text-gray-400">選擇你想查看的攻略分類</p>
      </div>

      <div class="space-y-12">
    `;

    // Categories with anchor scroll support
    for (const [catSlug, category] of Object.entries(game.categories)) {
      html += `
        <section id="${catSlug}" class="scroll-mt-24">
          <div class="flex items-center gap-3 mb-6">
            <span class="text-3xl">${category.icon}</span>
            <div>
              <h2 class="text-2xl font-bold text-gray-100">${category.label}</h2>
              <p class="text-sm text-gray-400 mt-1">${category.description}</p>
            </div>
          </div>
          
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      `;
      
      for (const subcat of category.subcategories) {
        html += `
            <a href="#/${slug}/${catSlug}/${subcat.slug}" class="flex items-center p-4 bg-gray-800/40 rounded-xl border border-gray-700/50 hover:border-purple-500/50 hover:bg-gray-800 transition-all group">
              <div class="w-1.5 h-1.5 rounded-full bg-gray-600 mr-3 group-hover:bg-purple-400 transition-colors"></div>
              <span class="font-medium text-gray-300 group-hover:text-purple-300 transition-colors">${subcat.label}</span>
              <svg class="w-4 h-4 ml-auto text-gray-600 group-hover:text-purple-400 transform group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </a>
        `;
      }
      
      html += `
          </div>
        </section>
      `;
    }

    html += `</div>`;
    container.innerHTML = html;
    
    // Attach Back Button click event
    setTimeout(() => {
      const backBtn = container.querySelector('#back-btn');
      if (backBtn) {
        backBtn.addEventListener('click', () => {
          if (window.appRouter) {
            window.appRouter.safeBack(slug);
          } else {
            window.location.hash = '#/';
          }
        });
      }
    }, 50);
    
  } catch (error) {
    container.innerHTML = `
      <div class="text-center py-12">
        <h2 class="text-2xl font-bold text-red-400 mb-2">載入失敗</h2>
        <p class="text-gray-500">找不到遊戲資料，或設定檔格式錯誤</p>
        <a href="#/" class="inline-block mt-4 text-purple-400 hover:underline">返回首頁</a>
      </div>
    `;
  }
  
  return container;
}
