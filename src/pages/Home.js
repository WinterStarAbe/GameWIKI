import { DataLoader } from '../utils/dataLoader.js';

export async function renderHome() {
  const container = document.createElement('div');
  container.className = 'py-8 px-4 sm:px-6 lg:px-8';
  
  try {
    const data = await DataLoader.getGamesList();
    
    container.innerHTML = `
      <div class="mb-12 text-center">
        <h1 class="text-4xl font-extrabold tracking-tight text-white sm:text-5xl mb-4">
          探索遊戲世界
        </h1>
        <p class="text-xl text-gray-400 max-w-2xl mx-auto">
          個人專屬的本地遊戲攻略知識庫
        </p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        ${data.games.map(game => `
          <a href="#/${game.slug}" class="group relative flex flex-col items-start justify-between rounded-2xl bg-gray-800/50 p-6 transition-all hover:bg-gray-800 border border-gray-700/50 hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/10 h-full overflow-hidden">
            <div class="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            
            <div class="relative z-10 w-full flex-grow flex flex-col">
              <div class="w-full aspect-[16/9] mb-4 bg-gray-900 rounded-xl overflow-hidden border border-gray-700/50 relative">
                 <!-- 暫時代替圖片的背景 -->
                 <div class="absolute inset-0 bg-gradient-to-br from-indigo-900 to-purple-900 flex items-center justify-center text-4xl opacity-80">
                   🎮
                 </div>
                 <img src="${game.cover}" alt="${game.title}" class="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-0" onerror="this.style.opacity='0'" onload="this.style.opacity='1'">
              </div>
              
              <h3 class="mt-2 text-xl font-bold text-white group-hover:text-purple-300 transition-colors">
                ${game.title}
              </h3>
              <p class="mt-2 text-sm leading-6 text-gray-400 line-clamp-2">
                ${game.description}
              </p>
              
              <div class="mt-auto pt-4 flex items-center gap-x-4">
                <div class="flex items-center gap-1.5 text-xs text-gray-500">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                  </svg>
                  ${game.articleCount} 篇文章
                </div>
                <div class="flex items-center gap-1.5 text-xs text-gray-500 ml-auto">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  ${game.lastUpdated}
                </div>
              </div>
            </div>
          </a>
        `).join('')}
      </div>
    `;
  } catch (error) {
    container.innerHTML = `
      <div class="text-center py-12">
        <h2 class="text-2xl font-bold text-red-400 mb-2">載入遊戲列表失敗</h2>
        <p class="text-gray-500">請確認 data/games.json 是否存在</p>
      </div>
    `;
  }
  
  return container;
}
