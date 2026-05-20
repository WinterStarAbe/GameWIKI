export class Router {
  constructor(routes) {
    this.routes = routes;
    this.currentView = null;
    this.navigatedCount = 0;
    
    // Listen to hash changes
    window.addEventListener('hashchange', this.handleRoute.bind(this));
    // Handle initial route
    window.addEventListener('load', this.handleRoute.bind(this));
  }

  async handleRoute() {
    const hash = window.location.hash.slice(1) || '/';
    const pathWithoutAnchor = hash.split('#')[0];
    
    if (this.lastLoadedPath === pathWithoutAnchor) {
      const anchor = hash.split('#')[1];
      if (anchor) {
        const el = document.getElementById(anchor);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
          return;
        }
      }
    }
    this.lastLoadedPath = pathWithoutAnchor;

    const pathParts = pathWithoutAnchor.split('?')[0].split('/').filter(Boolean);
    
    // Match route
    let matchedRoute = null;
    let params = {};

    for (const route of this.routes) {
      const routeParts = route.path.split('/').filter(Boolean);
      
      if (routeParts.length === pathParts.length) {
        let match = true;
        const currentParams = {};
        
        for (let i = 0; i < routeParts.length; i++) {
          if (routeParts[i].startsWith(':')) {
            currentParams[routeParts[i].slice(1)] = decodeURIComponent(pathParts[i]);
          } else if (routeParts[i] !== pathParts[i]) {
            match = false;
            break;
          }
        }
        
        if (match) {
          matchedRoute = route;
          params = currentParams;
          break;
        }
      }
    }

    const container = document.getElementById('router-view');
    
    if (matchedRoute) {
      try {
        // Show loading state
        container.innerHTML = `
          <div class="flex items-center justify-center min-h-[50vh]">
            <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        `;
        
        // Execute the handler
        const content = await matchedRoute.handler(params);
        container.innerHTML = '';
        container.appendChild(content);
        
        this.navigatedCount++;
        
        // Handle post-render anchor scroll if exists
        const anchor = hash.split('#')[1];
        if (anchor) {
          setTimeout(() => {
            const el = document.getElementById(anchor);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth' });
            } else {
              window.scrollTo(0, 0);
            }
          }, 100);
        } else {
          window.scrollTo(0, 0);
        }
      } catch (error) {
        console.error('Route error:', error);
        container.innerHTML = `
          <div class="p-8 text-center">
            <h2 class="text-2xl font-bold text-red-500 mb-4">載入失敗</h2>
            <p class="text-gray-400">${error.message}</p>
            <a href="#/" class="inline-block mt-6 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">回首頁</a>
          </div>
        `;
      }
    } else {
      // 404
      container.innerHTML = `
        <div class="p-8 text-center">
          <h2 class="text-3xl font-bold text-gray-300 mb-4">404 - 找不到頁面</h2>
          <a href="#/" class="inline-block mt-6 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">回首頁</a>
        </div>
      `;
    }
  }

  navigate(path) {
    window.location.hash = path;
  }

  safeBack(slug, category, subcategory) {
    if (this.navigatedCount > 1) {
      window.history.back();
    } else {
      // Fallback hierarchy navigation
      if (slug && category && subcategory) {
        // From Article back to CategoryList
        this.navigate(`/${slug}/${category}/${subcategory}`);
      } else if (slug && category) {
        // From CategoryList back to GameHome
        this.navigate(`/${slug}`);
      } else if (slug) {
        // From GameHome back to Home
        this.navigate('/');
      } else {
        this.navigate('/');
      }
    }
  }
}
