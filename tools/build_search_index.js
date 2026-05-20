const fs = require('fs/promises');
const path = require('path');

async function buildIndex() {
  console.log('[Search Index Builder] Starting...');
  const gamesFilePath = path.join(__dirname, '../data/games.json');
  
  try {
    const gamesDataRaw = await fs.readFile(gamesFilePath, 'utf8');
    const { games } = JSON.parse(gamesDataRaw);
    
    for (const game of games) {
      const slug = game.slug;
      console.log(`[Search Index Builder] Building index for game: ${slug}...`);
      
      const articlesDir = path.join(__dirname, `../data/${slug}/articles`);
      const outputFilePath = path.join(__dirname, `../data/${slug}/search_index.json`);
      
      let articlesList;
      try {
        articlesList = await fs.readdir(articlesDir);
      } catch (err) {
        console.warn(`[Search Index Builder] Directory not found or empty: ${articlesDir}. Skipping.`);
        continue;
      }
      
      const searchIndex = [];
      
      for (const file of articlesList) {
        if (file.endsWith('.json')) {
          const filePath = path.join(articlesDir, file);
          const contentRaw = await fs.readFile(filePath, 'utf8');
          const article = JSON.parse(contentRaw);
          
          if (!article.sections || !Array.isArray(article.sections)) {
            continue;
          }
          
          article.sections.forEach(section => {
            searchIndex.push({
              gameSlug: slug,
              articleId: article.id,
              articleTitle: article.title,
              category: article.category,
              subcategory: article.subcategory,
              tags: article.tags || [],
              sectionId: section.id,
              sectionTitle: section.title,
              content: section.content || ''
            });
          });
        }
      }
      
      await fs.writeFile(outputFilePath, JSON.stringify(searchIndex, null, 2), 'utf8');
      console.log(`[Search Index Builder] Generated ${searchIndex.length} index items for ${slug} -> ${outputFilePath}`);
    }
    
    console.log('[Search Index Builder] All indexes generated successfully.');
  } catch (e) {
    console.error('[Search Index Builder] Failed to build search indexes:', e);
    process.exit(1);
  }
}

if (require.main === module) {
  buildIndex();
}

