import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import api from "../services/api";
import Pembimbing from "./Pembimbing";

function RiwayatList({ isStaff }) {
    const [data, setData] = useState([]);
    const [clock, setClock] = useState(new Date());

    useEffect(() => {
        api.get(isStaff ? "/absensi" : "/absensi-saya")
            .then((response) => {
                const responseData = response.data?.data || response.data || [];
                const dataArray = Array.isArray(responseData) ? responseData : [];
                setData(dataArray);
            })
            .catch(() => setData([]));
            
        const timer = setInterval(() => setClock(new Date()), 1000);
        return () => clearInterval(timer);
    }, [isStaff]);

    const dateLabel = clock.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    const formatDate = (dateStr) => {
        if (!dateStr) return "-";
        const date = new Date(dateStr);
        return date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
    };

    return <div className="layout"><Sidebar /><div className="content"><Navbar /><main className="main">
        <div className="page-heading">
            <div><p className="eyebrow">ARSIP KEHADIRAN</p><h1>Riwayat absensi</h1><p className="subtitle">{isStaff ? "Rekap kehadiran seluruh peserta magang." : "Rekap kehadiran Anda selama magang."}</p></div>
            <div className="live-clock"><strong>{clock.toLocaleTimeString("id-ID")}</strong><span>{dateLabel}</span></div>
        </div>
        <div className="table-card"><table><thead><tr><th>No</th><th>Tanggal</th><th>Nama</th><th>Masuk</th><th>Pulang</th><th>Status</th><th>Keterangan</th></tr></thead><tbody>{data.length ? data.map((item, index) => <tr key={item.id}><td>{index + 1}</td><td>{formatDate(item.tanggal)}</td><td>{item.participant_name}</td><td>{item.jam_masuk || "-"}</td><td>{item.jam_pulang || "-"}</td><td><span className="badge hadir">{item.status}</span></td><td><small>{item.keterangan || "-"}</small></td></tr>) : <tr><td colSpan="7" className="empty">Belum ada data absensi.</td></tr>}</tbody></table></div>
    </main></div></div>;
}

function Riwayat() {
    const currentUser = (() => {
        try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
    })();

    if (String(currentUser?.role || "").trim().toLowerCase() === "pembimbing") {
        return <Pembimbing />;
    }

    const isStaff = ["admin", "pembimbing"].includes(String(currentUser?.role || "").trim().toLowerCase());

    return <RiwayatList isStaff={isStaff} />;
}

export default Riwayat;
