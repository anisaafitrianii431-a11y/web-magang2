import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import PenilaianPage from './PenilaianPage';

export default function Penilaian() {
  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
  })();
  const currentRole = currentUser?.role || 'peserta';
  const laporanList = [];

  return (
    <div className="layout">
      <Sidebar />
      <div className="content">
        <Navbar />
        <main className="main">
          <PenilaianPage laporanList={laporanList} currentRole={currentRole} />
        </main>
      </div>
    </div>
  );
}
