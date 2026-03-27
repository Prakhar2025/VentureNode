import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_APP_NAME: "VentureNode",
    NEXT_PUBLIC_APP_VERSION: "1.0.0",
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_dW5iaWFzZWQtc3RhcmZpc2gtODUuY2xlcmsuYWNjb3VudHMuZGV2JA",
    CLERK_SECRET_KEY: "sk_test_FO6P0hQym4HexbrRrNWjNeKTgquqMSJxMB9XvgsRCP"
  },
};

export default nextConfig;
