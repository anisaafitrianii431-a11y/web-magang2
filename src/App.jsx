import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Absensi from "./pages/Absensi";
import Dashboard from "./pages/Dashboard";
import Pembimbing from "./pages/Pembimbing";
import Periode from "./pages/Periode";
import Peserta from "./pages/Peserta";
import Riwayat from "./pages/Riwayat";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/absensi" element={<Absensi />} />
                <Route path="/peserta" element={<Peserta />} />
                <Route path="/pembimbing" element={<Pembimbing />} />
                <Route path="/periode" element={<Periode />} />

                <Route path="/riwayat" element={<Riwayat />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;