import './globals.css';
import Navbar from './components/Navbar';
import Providers from './providers';

export const metadata = {
  title: 'StudyStack',
  description: 'Share, categorize, and rank learning resources',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Navbar />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
