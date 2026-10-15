import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Next.js is the Node/Vercel target; Vite keeps the native Workers binding.
  webpack(config, { webpack }) {
    config.plugins.push(new webpack.NormalModuleReplacementPlugin(
      /^@\/lib\/runtime-env$/,
      path.resolve("lib/runtime-vercel.ts"),
    ));
    return config;
  },
};

export default nextConfig;
