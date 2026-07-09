/** Единый путь обложки блога: /images/blog/{slug}.jpg */
function blogCoverPath(slug) {
  return `/images/blog/${slug}.jpg`;
}

module.exports = { blogCoverPath };
