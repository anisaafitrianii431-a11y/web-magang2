import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Star } from "lucide-react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import FormKomentar from "../components/landing/FormKomentar";
import ListKomentar from "../components/landing/ListKomentar";
import "./ParticipantDashboard.css";

function Ulasan() {
    const [refreshKomentar, setRefreshKomentar] = useState(0);

    return (
        <div className="layout participant-panel">
            <Sidebar />
            <div className="content">
                <Navbar />
                <main className="main participant-dashboard ulasan-page">
                    <div className="ulasan-topbar">
                        <Link to="/dashboard" className="ulasan-back-btn">
                            <ArrowLeft size={15} />
                            <span>Kembali ke Dashboard</span>
                        </Link>
                        <span className="ulasan-badge-pill">
                            <Star size={13} fill="#f59e0b" color="#f59e0b" />
                            <span>Ulasan &amp; Rating Peserta</span>
                        </span>
                    </div>

                    <section className="pd-review-section ulasan-section" id="ulasan-peserta">
                        <div className="pd-review-heading">
                            <h2>Ulasan &amp; Rating</h2>
                            <p>Bagikan pengalaman Anda selama menggunakan portal magang.</p>
                        </div>
                        <div className="komentar-wrapper">
                            <FormKomentar onCommentAdded={() => setRefreshKomentar((value) => value + 1)} />
                            <ListKomentar refreshTrigger={refreshKomentar} />
                        </div>
                    </section>
                </main>
            </div>
        </div>
    );
}

export default Ulasan;
