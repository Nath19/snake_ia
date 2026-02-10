export const metadata = {
  title: "Neon Snake | Next.js",
  description: "Modern Snake game built with Next.js, Canvas and vanilla game logic."
};

import "./globals.css";

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
