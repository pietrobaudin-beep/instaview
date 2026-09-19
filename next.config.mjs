/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Farejo's own vocabulary: "rastros" and "pistas". Old paths still resolve.
  async redirects() {
    return [
      { source: "/rastreios", destination: "/rastros", permanent: true },
      { source: "/rastreios/:username", destination: "/rastros/:username", permanent: true },
      { source: "/notificacoes", destination: "/pistas", permanent: true },
      // The old Vercel address now points to the real domain, so search engines
      // see one site. Only this exact host: preview deployments keep working.
      {
        source: "/:path*",
        has: [{ type: "host", value: "instaview-sigma.vercel.app" }],
        destination: "https://farejoapp.com/:path*",
        permanent: true,
      },
    ];
  },
  images: {
    // Instagram / provider avatar CDNs are remote and change often.
    // We proxy/allow common hosts; unknown hosts fall back to initials avatars.
    remotePatterns: [
      { protocol: "https", hostname: "**.cdninstagram.com" },
      { protocol: "https", hostname: "**.fbcdn.net" },
      { protocol: "https", hostname: "i.pravatar.cc" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;
