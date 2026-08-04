/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.BACKEND_URL
          ? `${process.env.BACKEND_URL}/api/:path*`
          : 'http://200.141.1.187/api/:path*',
      },
      {
        source: '/uploads/:path*',
        destination: process.env.BACKEND_URL
          ? `${process.env.BACKEND_URL}/uploads/:path*`
          : 'http://200.141.1.187/uploads/:path*',
      },
    ];
  },
};

export default nextConfig;
