import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Exclude ChromaDB and its dependencies from webpack bundling
  serverExternalPackages: [
    'chromadb',
    '@chroma-core/default-embed',
    'onnxruntime-node',
    '@huggingface/transformers'
  ],
  
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Mark these packages as external for server-side rendering
      config.externals = config.externals || [];
      config.externals.push({
        'onnxruntime-node': 'commonjs onnxruntime-node',
        '@chroma-core/default-embed': 'commonjs @chroma-core/default-embed',
        'chromadb': 'commonjs chromadb'
      });
    }
    
    // Ignore binary .node files that webpack can't handle
    config.module.rules.push({
      test: /\.node$/,
      use: 'raw-loader'
    });
    
    // Ignore specific problematic files
    config.resolve.alias = {
      ...config.resolve.alias,
      'onnxruntime-node': false,
    };
    
    return config;
  }
};

export default nextConfig;
