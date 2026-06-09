/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production'

const nextConfig = {
  output: 'export',
  basePath: isProd ? '/sgo' : '',
  assetPrefix: isProd ? '/sgo/' : '',
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,   // MVP: ignora erros de TS no build
  },
  eslint: {
    ignoreDuringBuilds: true,  // MVP: ignora erros de ESLint no build
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
  trailingSlash: true,
}
module.exports = nextConfig
