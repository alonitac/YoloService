import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "YOLO Detection",
  description: "Object detection powered by YOLOv8",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
