/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || 'http://200.141.1.187';
    return [
      {
        source: '/sapi/:path*',
        destination: `${backendUrl}/sapi/:path*`,
      },
      {
        source: '/api/:path*',
        destination: `${backendUrl}/sapi/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${backendUrl}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
