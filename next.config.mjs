/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  webpack: function (config, options) {
    config.experiments = {
      layers: true,
      asyncWebAssembly: true,
    };
    return config;
  },
};

export default nextConfig;
