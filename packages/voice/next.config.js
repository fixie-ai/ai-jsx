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
};

module.exports = nextConfig;
