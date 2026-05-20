import { DataLoader } from '../utils/dataLoader.js';

export async function renderCategoryList({ slug, cat, subcat }) {
  const container = document.createElement('div');
  container.className = 'py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto';
  
  try {
    const game = await DataLoader.getGameData(slug);
    
    // Find category and subcategory info
    const categoryInfo = game.categories[cat];
    if (!categoryInfo) throw new Error('Category not found');
    
    const subcategoryInfo = categoryInfo.subcategories.find(s => s.slug === subcat);
    if (!subcategoryInfo) throw new Error('Subcategory not found');

    // Breadcrumbs with Back Button
    let html = `
      <div class="flex items-center gap-4 mb-8">
        <button id="back-btn" class="back-btn" aria-label="返回上一頁">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <nav class="text-sm" aria-label="Breadcrumb">
          <ol class="inline-flex items-center space-x-1 md:space-x-3 text-gray-400 flex-wrap">
            <li class="inline-flex items-center">
              <a href="#/" class="inline-flex items-center hover:text-purple-400 transition-colors">首頁</a>
            </li>
            <li>
              <div class="flex items-center">
                <svg class="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path></svg>
                <a href="#/${slug}" class="ml-1 md:ml-2 hover:text-purple-400 transition-colors">${game.title}</a>
              </div>
            </li>
            <li>
              <div class="flex items-center">
                <svg class="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path></svg>
                <a href="#/${slug}#${cat}" class="ml-1 md:ml-2 hover:text-purple-400 transition-colors">${categoryInfo.label}</a>
              </div>
            </li>
            <li>
              <div class="flex items-center">
                <svg class="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path></svg>
                <span class="ml-1 md:ml-2 text-gray-200">${subcategoryInfo.label}</span>
              </div>
            </li>
          </ol>
        </nav>
      </div>

      <div class="mb-10">
        <div class="flex items-center gap-3 mb-2">
          <span class="text-3xl">${categoryInfo.icon}</span>
          <h1 class="text-3xl font-extrabold text-white tracking-tight">${subcategoryInfo.label}</h1>
        </div>
        <p class="text-gray-400 mt-2">${categoryInfo.label} / 相關攻略文章</p>
      </div>

      <!-- Article List (Placeholder for now until we have an index of articles for each subcat) -->
      <div class="space-y-4" id="article-list-container">
        <!-- Will be populated by JS -->
      </div>
    `;

    container.innerHTML = html;

    // Fetch the articles index (since we are static, we need an index file per game or global)
    // For now, let's assume we have an articles.json or we hardcode a demo one
    const articleContainer = container.querySelector('#article-list-container');
    
    try {
      const allArticles = await DataLoader.getGameIndex(slug);
      const filteredArticles = allArticles.filter(a => a.category === cat && a.subcategory === subcat);

      if (filteredArticles.length === 0) {
        articleContainer.innerHTML = `
          <div class="p-8 text-center bg-gray-800/20 rounded-2xl border border-gray-800 border-dashed">
            <p class="text-gray-500">此分類下暫無文章。</p>
          </div>
        `;
      } else {
        articleContainer.innerHTML = filteredArticles.map(article => `
          <a href="#/${slug}/article/${article.id}" class="block p-6 bg-gray-800/40 rounded-2xl border border-gray-700/50 hover:border-purple-500/50 hover:bg-gray-800 transition-all group">
            <h3 class="text-xl font-bold text-gray-100 group-hover:text-purple-300 transition-colors mb-2">${article.title}</h3>
            <div class="flex flex-wrap gap-2 mb-4">
              ${article.tags.map(tag => `<span class="px-2 py-1 text-xs rounded-md bg-gray-900 text-gray-400 border border-gray-700">${tag}</span>`).join('')}
            </div>
            <div class="flex items-center text-sm text-gray-500 gap-4">
              <span class="flex items-center gap-1"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> ${article.author}</span>
              <span class="flex items-center gap-1"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> ${article.date}</span>
            </div>
          </a>
        `).join('');
      }
    } catch (e) {
        console.error(e);
    }

    // Attach Back Button click event
    setTimeout(() => {
      const backBtn = container.querySelector('#back-btn');
      if (backBtn) {
        backBtn.addEventListener('click', () => {
          if (window.appRouter) {
            window.appRouter.safeBack(slug, cat);
          } else {
            window.location.hash = `#/${slug}`;
          }
        });
      }
    }, 50);

  } catch (error) {
    container.innerHTML = `
      <div class="text-center py-12">
        <h2 class="text-2xl font-bold text-red-400 mb-2">載入失敗</h2>
        <p class="text-gray-500">${error.message}</p>
        <a href="#/${slug}" class="inline-block mt-4 text-purple-400 hover:underline">返回遊戲主頁</a>
      </div>
    `;
  }
  
  return container;
}
