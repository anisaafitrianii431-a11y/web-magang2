import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import RekapitulasiPage from './RekapitulasiPage';

export default function Rekapitulasi() {
  return (
    <div className="layout">
      <Sidebar />
      <div className="content">
        <Navbar />
        <main className="main">
          <RekapitulasiPage />
        </main>
      </div>
    </div>
  );
}
