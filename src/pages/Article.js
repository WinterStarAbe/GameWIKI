import { DataLoader } from '../utils/dataLoader.js';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

export async function renderArticle({ slug, articleId }) {
  const container = document.createElement('div');
  container.className = 'py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col lg:flex-row gap-8';
  
  try {
    const [game, article] = await Promise.all([
      DataLoader.getGameData(slug),
      DataLoader.getArticle(slug, articleId)
    ]);

    const catInfo = game.categories[article.category];
    const subcatInfo = catInfo?.subcategories.find(s => s.slug === article.subcategory);

    // Setup Marked.js
    marked.setOptions({
      breaks: true,
      gfm: true
    });

    let mainContentHtml = '';
    
    // Process sections
    article.sections.forEach(section => {
      let content = section.content;
      
      // Basic replacement for image placeholders if any, though standard markdown ![]() works.
      
      mainContentHtml += `
        <section id="${section.id}" class="scroll-mt-24">
          ${section.title !== article.title ? `<h2 class="text-2xl font-bold mt-10 mb-4 pb-2 border-b border-gray-800 text-purple-200">${section.title}</h2>` : ''}
          <div class="markdown-body">
            ${DOMPurify.sanitize(marked.parse(content))}
          </div>
        </section>
      `;
    });

    // Render TOC
    const tocHtml = article.toc.map(item => `
      <li>
        <a href="#/${slug}/article/${articleId}#${item.id}" class="block py-1.5 text-sm text-gray-400 hover:text-purple-400 transition-colors">
          ${item.title}
        </a>
      </li>
    `).join('');

    container.innerHTML = `
      <!-- Main Content Column -->
      <div class="flex-grow min-w-0 lg:max-w-4xl">
        <!-- Breadcrumbs with Back Button -->
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
              ${catInfo ? `
              <li>
                <div class="flex items-center">
                  <svg class="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path></svg>
                  <a href="#/${slug}#${article.category}" class="ml-1 md:ml-2 hover:text-purple-400 transition-colors">${catInfo.label}</a>
                </div>
              </li>
              ` : ''}
              ${subcatInfo ? `
              <li>
                <div class="flex items-center">
                  <svg class="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path></svg>
                  <a href="#/${slug}/${article.category}/${article.subcategory}" class="ml-1 md:ml-2 hover:text-purple-400 transition-colors">${subcatInfo.label}</a>
                </div>
              </li>
              ` : ''}
              <li>
                <div class="flex items-center">
                  <svg class="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path></svg>
                  <span class="ml-1 md:ml-2 text-gray-200 truncate max-w-[200px]">${article.title}</span>
                </div>
              </li>
            </ol>
          </nav>
        </div>

        <!-- Article Header -->
        <header class="mb-10">
          <h1 class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4 leading-tight">${article.title}</h1>
          
          <div class="flex flex-wrap items-center gap-4 text-sm text-gray-400 bg-gray-800/30 p-4 rounded-xl border border-gray-800">
            <div class="flex items-center gap-1.5">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              <span>作者: <span class="text-gray-200">${article.author}</span></span>
            </div>
            <div class="flex items-center gap-1.5">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              <span>日期: <span class="text-gray-200">${article.date}</span></span>
            </div>
            ${article.gameVersion ? `
            <div class="flex items-center gap-1.5">
               <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" /></svg>
               <span>版本: <span class="text-purple-300 bg-purple-900/30 px-2 py-0.5 rounded border border-purple-800/50">${article.gameVersion}</span></span>
            </div>
            ` : ''}
            <div class="flex items-center gap-1.5 ml-auto">
              <a href="${article.source}" target="_blank" rel="noopener noreferrer" class="text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1">
                查看原文
                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
              </a>
            </div>
          </div>
        </header>

        <!-- Article Body -->
        <article class="prose prose-invert prose-purple max-w-none">
          ${mainContentHtml}
        </article>

        <!-- Comments Section if any -->
        ${article.comments && article.comments.length > 0 ? `
        <div class="mt-16 pt-8 border-t border-gray-800">
          <h3 class="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <svg class="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg>
            精選留言補充
          </h3>
          <div class="space-y-4">
            ${article.comments.map(comment => `
              <div class="bg-gray-800/40 border border-gray-700/50 rounded-xl p-5">
                <div class="flex items-center gap-2 mb-3">
                  <div class="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm">
                    ${comment.author.charAt(0)}
                  </div>
                  <span class="font-bold text-gray-200">${comment.author}</span>
                  ${comment.tags ? `
                    <div class="ml-auto flex gap-1">
                      ${comment.tags.map(t => `<span class="px-2 py-0.5 text-xs bg-gray-900 border border-gray-700 rounded text-gray-400">${t}</span>`).join('')}
                    </div>
                  ` : ''}
                </div>
                <div class="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">${comment.content}</div>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}
      </div>

      <!-- Sidebar TOC -->
      <aside class="hidden lg:block w-64 flex-shrink-0">
        <div class="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto pr-4 custom-scrollbar">
          <h4 class="text-sm font-bold tracking-wider text-gray-500 uppercase mb-4">章節目錄</h4>
          <ul class="space-y-1">
            ${tocHtml}
          </ul>
        </div>
      </aside>
    `;

    // Handle internal anchor jumps if the URL has a hash
    setTimeout(() => {
      const hash = window.location.hash.split('#')[2];
      if (hash) {
        const el = document.getElementById(hash);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }
      
      // Image Lightbox setup
      const images = container.querySelectorAll('.markdown-body img');
      const modal = document.getElementById('image-modal');
      const modalImg = document.getElementById('modal-image');
      const closeModal = document.getElementById('close-modal');

      images.forEach(img => {
        img.addEventListener('click', () => {
          modalImg.src = img.src;
          modal.classList.remove('hidden');
          // small delay to allow display:block to apply before animating opacity
          setTimeout(() => {
            modal.classList.remove('opacity-0');
            modalImg.classList.remove('scale-95');
            modalImg.classList.add('scale-100');
          }, 10);
        });
      });

      const hideModal = () => {
        modal.classList.add('opacity-0');
        modalImg.classList.remove('scale-100');
        modalImg.classList.add('scale-95');
        setTimeout(() => {
          modal.classList.add('hidden');
        }, 300); // match transition duration
      };

      if(closeModal) closeModal.addEventListener('click', hideModal);
      if(modal) modal.addEventListener('click', (e) => {
        if (e.target === modal) hideModal();
      });

      // Back Button click handler
      const backBtn = container.querySelector('#back-btn');
      if (backBtn) {
        backBtn.addEventListener('click', () => {
          if (window.appRouter) {
            window.appRouter.safeBack(slug, article.category, article.subcategory);
          } else {
            window.location.hash = `#/${slug}/${article.category}/${article.subcategory}`;
          }
        });
      }

    }, 100);

  } catch (error) {
    container.innerHTML = `
      <div class="text-center py-12 w-full">
        <h2 class="text-2xl font-bold text-red-400 mb-2">載入文章失敗</h2>
        <p class="text-gray-500">${error.message}</p>
        <a href="#/${slug}" class="inline-block mt-4 text-purple-400 hover:underline">返回遊戲主頁</a>
      </div>
    `;
  }
  
  return container;
}
