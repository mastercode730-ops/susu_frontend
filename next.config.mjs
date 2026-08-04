/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || 'http://200.141.1.187';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${backendUrl}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
