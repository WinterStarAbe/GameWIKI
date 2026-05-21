import Fuse from 'fuse.js';
import DOMPurify from 'dompurify';
import { DataLoader } from './dataLoader.js';

export class SearchController {
  constructor() {
    this.modal = document.getElementById('search-modal');
    this.input = document.getElementById('search-input');
    this.resultsContainer = document.getElementById('search-results');
    this.closeButton = document.getElementById('close-search');
    this.headerSearchInput = document.getElementById('global-search');
    
    this.fuse = null;
    this.searchIndex = [];
    this.currentSlug = null;
    this.isLoading = false;
    this.gameTitlesMap = {};

    if (!this.modal || !this.input || !this.resultsContainer) {
      console.warn('[SearchController] Search elements not found in DOM.');
      return;
    }

    this.initEvents();
  }

  initEvents() {
    // Listen to / key globally to open search (skip when in inputs)
    window.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        this.open();
      }
    });

    // Listen to ESC key to close search
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.modal.classList.contains('hidden')) {
        this.close();
      }
    });

    // Listen to header search input focus
    if (this.headerSearchInput) {
      this.headerSearchInput.addEventListener('focus', (e) => {
        e.preventDefault();
        this.headerSearchInput.blur(); // Remove focus to avoid dual inputs
        this.open();
      });
    }

    // Close button click
    if (this.closeButton) {
      this.closeButton.addEventListener('click', () => this.close());
    }

    // Modal background click close
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.close();
      }
    });

    // Input search typing
    this.input.addEventListener('input', () => this.performSearch());
  }

  getGameSlugFromHash() {
    const hash = window.location.hash.slice(1) || '/';
    const pathParts = hash.split('#')[0].split('?')[0].split('/').filter(Boolean);
    if (pathParts.length > 0) {
      return pathParts[0]; // first part is game slug (e.g. stoneshard)
    }
    return null;
  }

  async loadGlobalIndex() {
    if (this.currentSlug === 'global' && this.fuse) return true;
    
    this.isLoading = true;
    this.resultsContainer.innerHTML = `
      <div class="flex items-center justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500 mr-3"></div>
        <span class="text-gray-400 text-sm">載入全站搜尋索引中...</span>
      </div>
    `;
    
    try {
      const gamesData = await DataLoader.getGamesList();
      const games = gamesData.games || [];
      
      this.gameTitlesMap = {};
      games.forEach(g => {
        this.gameTitlesMap[g.slug] = g.title;
      });
      
      // Load the pre-aggregated global search index from a single file
      this.searchIndex = await DataLoader.getGlobalSearchIndex();
      
      this.fuse = new Fuse(this.searchIndex, {
        keys: [
          { name: 'articleTitle', weight: 0.5 },
          { name: 'sectionTitle', weight: 0.4 },
          { name: 'tags', weight: 0.4 },
          { name: 'content', weight: 0.2 }
        ],
        threshold: 0.4,
        includeMatches: true
      });
      
      this.currentSlug = 'global';
      this.isLoading = false;
      return true;
    } catch (e) {
      console.error('[SearchController] Failed to load global search index:', e);
      this.resultsContainer.innerHTML = `
        <div class="text-center py-8 text-red-400 text-sm">
          載入全站搜尋索引失敗，請稍後重試。
        </div>
      `;
      this.isLoading = false;
      return false;
    }
  }

  async loadIndexForGame(slug) {
    if (this.currentSlug === slug && this.fuse) return true;
    
    this.isLoading = true;
    this.resultsContainer.innerHTML = `
      <div class="flex items-center justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500 mr-3"></div>
        <span class="text-gray-400 text-sm">載入搜尋索引中...</span>
      </div>
    `;
    
    try {
      this.searchIndex = await DataLoader.getSearchIndex(slug);
      
      // Update games map even for single game to support display mapping
      try {
        const gamesData = await DataLoader.getGamesList();
        gamesData.games.forEach(g => {
          this.gameTitlesMap[g.slug] = g.title;
        });
      } catch (err) {
        console.warn('[SearchController] Failed to fetch games list for name map mapping');
      }
      
      this.fuse = new Fuse(this.searchIndex, {
        keys: [
          { name: 'articleTitle', weight: 0.5 },
          { name: 'sectionTitle', weight: 0.4 },
          { name: 'tags', weight: 0.4 },
          { name: 'content', weight: 0.2 }
        ],
        threshold: 0.4,
        includeMatches: true
      });
      this.currentSlug = slug;
      this.isLoading = false;
      return true;
    } catch (e) {
      console.error(`[SearchController] Failed to load search index for ${slug}:`, e);
      this.resultsContainer.innerHTML = `
        <div class="text-center py-8 text-red-400 text-sm">
          載入搜尋索引失敗，請確認該遊戲是否已生成搜尋資料。
        </div>
      `;
      this.isLoading = false;
      return false;
    }
  }

  async open() {
    const slug = this.getGameSlugFromHash();
    
    this.modal.classList.remove('hidden');
    // Allow display:flex to register before transition opacity
    setTimeout(() => {
      this.modal.classList.remove('opacity-0');
      this.modal.querySelector('.search-container').classList.remove('scale-95');
      this.modal.querySelector('.search-container').classList.add('scale-100');
    }, 10);
    
    this.input.value = '';
    this.input.focus();
    this.resultsContainer.innerHTML = `
      <div class="text-center py-12 text-gray-500 text-sm">
        輸入關鍵字以進行全文檢索攻略...
      </div>
    `;

    this.input.disabled = false;
    if (!slug) {
      this.input.placeholder = '搜尋全站遊戲攻略...';
      await this.loadGlobalIndex();
    } else {
      this.input.placeholder = '搜尋攻略標題、內容、標籤...';
      await this.loadIndexForGame(slug);
    }
  }

  close() {
    this.modal.classList.add('opacity-0');
    this.modal.querySelector('.search-container').classList.remove('scale-100');
    this.modal.querySelector('.search-container').classList.add('scale-95');
    setTimeout(() => {
      this.modal.classList.add('hidden');
    }, 200);
  }

  performSearch() {
    if (this.isLoading || !this.fuse) return;
    
    const query = this.input.value.trim();
    if (!query) {
      this.resultsContainer.innerHTML = `
        <div class="text-center py-12 text-gray-500 text-sm">
          輸入關鍵字以進行全文檢索攻略...
        </div>
      `;
      return;
    }

    const results = this.fuse.search(query).slice(0, 15);
    
    if (results.length === 0) {
      this.resultsContainer.innerHTML = `
        <div class="text-center py-12 text-gray-400 text-sm">
          找不到與「<span class="text-purple-300 font-medium">${DOMPurify.sanitize(query)}</span>」相關的攻略內容。
        </div>
      `;
      return;
    }

    this.resultsContainer.innerHTML = results.map(res => {
      const item = res.item;
      const snippet = this.getHighlightSnippet(item.content, query);
      const matchedTitle = this.highlightText(item.sectionTitle || item.articleTitle, query);
      
      const link = `#/${item.gameSlug}/article/${item.articleId}#${item.sectionId}`;
      
      // Determine if we need to show game badge (only on global search)
      const isGlobal = this.currentSlug === 'global';
      const gameTitle = isGlobal ? (this.gameTitlesMap[item.gameSlug] || item.gameSlug) : '';
      const gameBadge = isGlobal ? `
        <span class="px-2 py-0.5 text-xs rounded bg-purple-950/80 border border-purple-700/50 text-purple-300 font-bold shrink-0">
          ${DOMPurify.sanitize(gameTitle)}
        </span>
        <span class="text-gray-500 text-xs shrink-0">➜</span>
      ` : '';
      
      return `
        <a href="${link}" class="search-result-item block p-4 rounded-xl border border-gray-800/60 bg-gray-900/30 hover:bg-purple-900/10 hover:border-purple-500/40 transition-all duration-200 group">
          <div class="flex items-center gap-2 mb-1.5 flex-wrap">
            ${gameBadge}
            <span class="px-2 py-0.5 text-xs rounded bg-purple-950/60 border border-purple-800/40 text-purple-300 font-medium truncate max-w-[150px] sm:max-w-[200px]">
              ${DOMPurify.sanitize(item.articleTitle)}
            </span>
            <span class="text-gray-500 text-xs shrink-0">➜</span>
            <span class="text-sm font-semibold text-gray-200 group-hover:text-purple-300 transition-colors truncate">
              ${matchedTitle}
            </span>
          </div>
          ${snippet ? `
            <div class="text-xs text-gray-400 leading-relaxed font-normal bg-black/10 p-2 rounded border border-gray-900/50">
              ${snippet}
            </div>
          ` : ''}
          ${item.tags && item.tags.length > 0 ? `
            <div class="mt-2 flex flex-wrap gap-1">
              ${item.tags.map(t => `<span class="px-1.5 py-0.5 text-[10px] bg-gray-950 border border-gray-800 rounded text-gray-500">${t}</span>`).join('')}
            </div>
          ` : ''}
        </a>
      `;
    }).join('');

    // Bind click events to search result items to auto-close modal
    const resultLinks = this.resultsContainer.querySelectorAll('.search-result-item');
    resultLinks.forEach(link => {
      link.addEventListener('click', () => this.close());
    });
  }

  getHighlightSnippet(text, query) {
    if (!text || !query) return '';
    
    const cleanText = text.replace(/[#*`>_\-]/g, ' ').replace(/\s+/g, ' ').trim();
    const idx = cleanText.toLowerCase().indexOf(query.toLowerCase());
    
    if (idx === -1) {
      return cleanText.substring(0, 80) + (cleanText.length > 80 ? '...' : '');
    }
    
    const start = Math.max(0, idx - 30);
    const end = Math.min(cleanText.length, idx + query.length + 50);
    
    let snippet = cleanText.substring(start, end);
    if (start > 0) snippet = '...' + snippet;
    if (end < cleanText.length) snippet = snippet + '...';
    
    return this.highlightText(snippet, query);
  }

  highlightText(text, query) {
    const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    return DOMPurify.sanitize(text.replace(regex, '<mark class="bg-purple-500/30 text-purple-200 rounded px-1 font-medium">$1</mark>'));
  }
}
