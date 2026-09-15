import { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [pesan, setPesan] = useState('Memuat...');

  useEffect(() => {
    axios.get('http://127.0.0.1:8000/api/test')
      .then(response => {
        setPesan(response.data.message);
      })
      .catch(error => {
        setPesan('Gagal mengambil data dari Laravel');
        console.error(error);
      });
  }, []);

  return (
    <div>
      <h1>Test Koneksi ke Laravel</h1>
      <p>{pesan}</p>
    </div>
  );
}

export default App;