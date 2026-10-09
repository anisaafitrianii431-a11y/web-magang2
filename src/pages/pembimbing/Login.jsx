import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const response = await api.post('/login', { email, password });
            const { data, access_token } = response.data;
            
            // Simpan token dan data user
            localStorage.setItem('token', access_token);
            localStorage.setItem('user', JSON.stringify(data));
            
            // Routing berdasarkan role asli dari database
            if (data.role === 'Admin') {
                navigate('/admin');
            } else if (data.role === 'Pembimbing') {
                navigate('/pembimbing');
            } else {
                navigate('/pemagang/daftar');
            }
        } catch (error) {
            alert(error.response?.data?.message || 'Login gagal. Periksa kembali email dan password Anda.');
        }
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif", background: '#f8fafc', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
            <div style={{ width: '100%', maxWidth: '420px', background: 'white', padding: '40px', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}>
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <div style={{ width: '60px', height: '60px', background: '#3b82f6', borderRadius: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '30px', margin: '0 auto 15px', boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.5)' }}>🎓</div>
                    <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 5px 0' }}>Selamat Datang</h2>
                    <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Masuk ke panel MagangAdmin Enterprise</p>
                </div>
                
                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#334155', marginBottom: '8px' }}>Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="nama@email.com"
                            style={{ width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', boxSizing: 'border-box' }}
                            required
                        />
                    </div>
                    
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <label style={{ fontSize: '14px', fontWeight: '500', color: '#334155' }}>Password</label>
                            <a href="#" style={{ fontSize: '12px', color: '#4f46e5', textDecoration: 'none', fontWeight: '500' }}>Lupa password?</a>
                        </div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            style={{ width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', boxSizing: 'border-box' }}
                            required
                        />
                    </div>

                    <button 
                        type="submit" 
                        style={{ background: '#4f46e5', color: 'white', padding: '14px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px', marginTop: '10px', boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.4)' }}
                    >
                        Masuk
                    </button>
                </form>

                <div style={{ marginTop: '30px', textAlign: 'center', fontSize: '14px', color: '#64748b' }}>
                    Belum memiliki akun?{' '}
                    <Link to="/register" style={{ color: '#4f46e5', fontWeight: 'bold', textDecoration: 'none' }}>
                        Daftar di sini
                    </Link>
                </div>
            </div>
        </div>
    );
}