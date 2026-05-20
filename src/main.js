import './index.css';
import { Router } from './utils/router.js';
import { renderHome } from './pages/Home.js';
import { renderGameHome } from './pages/GameHome.js';
import { renderCategoryList } from './pages/CategoryList.js';
import { renderArticle } from './pages/Article.js';

const routes = [
  { path: '/', handler: renderHome },
  { path: '/:slug', handler: renderGameHome },
  { path: '/:slug/article/:articleId', handler: renderArticle },
  { path: '/:slug/:cat/:subcat', handler: renderCategoryList }
];

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  window.appRouter = new Router(routes);
});
