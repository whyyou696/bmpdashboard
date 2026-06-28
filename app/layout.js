import "./globals.css";
import ClientLayout from "@/components/ClientLayout";

export const metadata = {
  title: "Best Multi Payment - Transaction Dashboard",
  description: "Premium real-time transaction monitoring and dashboard for Best Multi Payment.",
  icons: {
    icon: "/assets/logo_best.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {/* Animated Background Blobs */}
        <div className="bg-bubbles">
          <div className="bubble bubble-1"></div>
          <div className="bubble bubble-2"></div>
          <div className="bubble bubble-3"></div>
        </div>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
