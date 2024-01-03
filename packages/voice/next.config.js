/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/agent',
        destination: '/',
        permanent: false,
      },
    ];
  },
  experimental: {
    serverComponentsExternalPackages: ['playht', '@deepgram/sdk', '@soniox/soniox-node'],
  },
};

module.exports = nextConfig;
