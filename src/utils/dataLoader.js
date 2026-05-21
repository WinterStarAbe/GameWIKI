export class DataLoader {
  static async fetchJson(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Could not fetch data from ${url}:`, error);
      throw error;
    }
  }

  static async getGamesList() {
    return this.fetchJson('/data/games.json');
  }

  static async getGameData(slug) {
    return this.fetchJson(`/data/${slug}/game.json`);
  }

  static async getGameIndex(slug) {
    return this.fetchJson(`/data/${slug}/index.json`);
  }

  static async getArticle(gameSlug, articleId) {
    return this.fetchJson(`/data/${gameSlug}/articles/${articleId}.json`);
  }

  static async getSearchIndex(gameSlug) {
    return this.fetchJson(`/data/${gameSlug}/search_index.json`);
  }

  static async getGlobalSearchIndex() {
    return this.fetchJson('/data/global_search_index.json');
  }
}
