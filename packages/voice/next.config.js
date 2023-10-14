/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/',
        destination: '/agent',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
