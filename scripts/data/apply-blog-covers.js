const fs = require('fs');
const path = require('path');
const { blogCoverPath } = require('./blog-cover-path');

const files = ['blog-articles-v2.js', 'blog-articles-seo-batch.js'];

for (const file of files) {
  const filePath = path.join(__dirname, file);
  let src = fs.readFileSync(filePath, 'utf8');
  const articles = require(filePath);

  for (const article of articles) {
    const cover = blogCoverPath(article.slug);
    const slugMarker = `slug: '${article.slug}'`;
    const slugIndex = src.indexOf(slugMarker);
    if (slugIndex < 0) {
      console.warn('slug not found:', article.slug, file);
      continue;
    }

    const coverKey = 'coverImageUrl:';
    const coverIndex = src.indexOf(coverKey, slugIndex);
    const coverValueStart = src.indexOf("'", coverIndex + coverKey.length) + 1;
    const coverValueEnd = src.indexOf("'", coverValueStart);
    src = src.slice(0, coverValueStart) + cover + src.slice(coverValueEnd);

    const contentKey = 'content: `';
    const contentStart = src.indexOf(contentKey, slugIndex);
    const contentBodyStart = contentStart + contentKey.length;
    const contentEnd = src.indexOf('`,', contentBodyStart);
    let content = src.slice(contentBodyStart, contentEnd);
    content = content.replace(/\[image([^\]]*)src="[^"]*"/g, `[image$1src="${cover}"`);
    src = src.slice(0, contentBodyStart) + content + src.slice(contentEnd);
  }

  fs.writeFileSync(filePath, src, 'utf8');
  console.log('updated', file, `(${articles.length} articles)`);
}
