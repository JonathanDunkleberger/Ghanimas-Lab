/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Sources already serve CDN-sized variants (TMDB w300/w780, IGDB
    // cover_big, OL -L); Vercel's optimizer quota 402s once exhausted,
    // which breaks every uncached image site-wide.
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "image.tmdb.org" },
      { protocol: "https", hostname: "images.igdb.com" },
      { protocol: "https", hostname: "cdn.myanimelist.net" },
      { protocol: "https", hostname: "books.google.com" },
      { protocol: "https", hostname: "books.googleusercontent.com" },
      { protocol: "https", hostname: "covers.openlibrary.org" },
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "img.youtube.com" },
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "s4.anilist.co" },
      { protocol: "https", hostname: "media.kitsu.app" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "img.clerk.com" },
    ],
  },
  async redirects() {
    return [
      {
        source: "/discover",
        destination: "/",
        permanent: true,
      },
      {
        source: "/favorites",
        destination: "/collection",
        permanent: true,
      },
      {
        source: "/library",
        destination: "/collection",
        permanent: true,
      },
      {
        source: "/watchlist",
        destination: "/collection",
        permanent: true,
      },
    ];
  },
};
module.exports = nextConfig;
