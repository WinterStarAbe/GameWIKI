const fs = require('fs/promises');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

// Utility to download image
async function downloadImage(url, destDir, prefix) {
  const ext = path.extname(url).split('?')[0] || '.png';
  const hash = crypto.createHash('md5').update(url).digest('hex').substring(0, 8);
  const filename = `${prefix}_${hash}${ext}`;
  const destPath = path.join(destDir, filename);

  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to download image: ${res.statusCode}`));
        return;
      }
      
      let data = [];
      res.on('data', chunk => data.push(chunk));
      res.on('end', async () => {
        try {
          await fs.writeFile(destPath, Buffer.concat(data));
          resolve(`/images/stoneshard/${prefix}/${filename}`);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// Ingest logic for processing pending files
async function ingestAll() {
  const pendingDir = path.join(__dirname, '../inbox/pending');
  const processedDir = path.join(__dirname, '../inbox/processed');
  const imgDir = path.join(__dirname, '../public/images/stoneshard');
  
  try {
    const files = await fs.readdir(pendingDir);
    for (const file of files) {
      if (file.endsWith('.md')) {
        console.log(`[Ingest] Processing ${file}...`);
        // We'll read it, but real AI processing happens externally or via an API call here.
        // For now, this script acts as the entry point you would trigger after placing files.
        // In the real flow, you prompt the AI: "Please process inbox/pending/new_guide.md"
        
        console.log(`[Ingest] Ready for AI review. Tell the AI to process this file.`);
      }
    }
  } catch (e) {
    console.error('Ingest error', e);
  }
}

// CLI
if (require.main === module) {
  ingestAll();
}
