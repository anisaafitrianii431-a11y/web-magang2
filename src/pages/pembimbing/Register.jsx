import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';

export default function RegisterPage() {
    const [formData, setFormData] = useState({ nama: '', email: '', password: '', role: 'Pemagang', no_hp: '' });
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            await api.post('/register', formData);
            alert(`Akun untuk ${formData.nama} berhasil didaftarkan! Silakan login.`);
            navigate('/login');
        } catch (error) {
            alert(error.response?.data?.message || 'Terjadi kesalahan saat mendaftar');
        }
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif", background: '#f8fafc', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
            <div style={{ width: '100%', maxWidth: '420px', background: 'white', padding: '40px', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}>
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <div style={{ width: '60px', height: '60px', background: '#3b82f6', borderRadius: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '30px', margin: '0 auto 15px', boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.5)' }}>🚀</div>
                    <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 5px 0' }}>Buat Akun Baru</h2>
                    <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Bergabunglah dengan MagangAdmin</p>
                </div>
                
                <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#334155', marginBottom: '6px' }}>Nama Lengkap</label>
                        <input
                            type="text"
                            value={formData.nama}
                            onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                            placeholder="John Doe"
                            style={{ width: '100%', padding: '10px 15px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', boxSizing: 'border-box' }}
                            required
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#334155', marginBottom: '6px' }}>Email Address</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="nama@email.com"
                            style={{ width: '100%', padding: '10px 15px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', boxSizing: 'border-box' }}
                            required
                        />
                    </div>
                    
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#334155', marginBottom: '6px' }}>Password</label>
                        <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            placeholder="Minimal 8 karakter"
                            style={{ width: '100%', padding: '10px 15px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', boxSizing: 'border-box' }}
                            required
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#334155', marginBottom: '6px' }}>No. HP / WhatsApp (Opsional)</label>
                        <input
                            type="text"
                            value={formData.no_hp}
                            onChange={(e) => setFormData({ ...formData, no_hp: e.target.value })}
                            placeholder="08123456789"
                            style={{ width: '100%', padding: '10px 15px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', boxSizing: 'border-box' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#334155', marginBottom: '8px' }}>Role / Level Akses</label>
                        <div style={{ display: 'flex', gap: '15px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '14px', cursor: 'pointer' }}>
                                <input 
                                    type="radio" 
                                    name="role" 
                                    value="Pemagang" 
                                    checked={formData.role === 'Pemagang'} 
                                    onChange={(e) => setFormData({...formData, role: e.target.value})} 
                                /> 
                                Pemagang
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '14px', cursor: 'pointer' }}>
                                <input 
                                    type="radio" 
                                    name="role" 
                                    value="Pembimbing" 
                                    checked={formData.role === 'Pembimbing'} 
                                    onChange={(e) => setFormData({...formData, role: e.target.value})} 
                                /> 
                                Pembimbing
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '14px', cursor: 'pointer' }}>
                                <input 
                                    type="radio" 
                                    name="role" 
                                    value="Admin" 
                                    checked={formData.role === 'Admin'} 
                                    onChange={(e) => setFormData({...formData, role: e.target.value})} 
                                /> 
                                Admin
                            </label>
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        style={{ background: '#4f46e5', color: 'white', padding: '14px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px', marginTop: '10px', boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.4)' }}
                    >
                        Daftar Sekarang
                    </button>
                </form>

                <div style={{ marginTop: '25px', textAlign: 'center', fontSize: '14px', color: '#64748b' }}>
                    Sudah memiliki akun?{' '}
                    <Link to="/login" style={{ color: '#4f46e5', fontWeight: 'bold', textDecoration: 'none' }}>
                        Login di sini
                    </Link>
                </div>
            </div>
        </div>
    );
}