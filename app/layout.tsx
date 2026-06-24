import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Referent",
  description: "Минимальное приложение на Next.js",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
