/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/',
        destination: '/basic-completion',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
