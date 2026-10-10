import React, { useEffect, useState } from 'react';
import { MessageSquare, Star, User } from 'lucide-react';

function ListKomentar({ refreshTrigger }) {
  const [komentarList, setKomentarList] = useState([]);
  const [avgRating, setAvgRating] = useState(5.0);
  const [loading, setLoading] = useState(true);

  const fetchKomentar = () => {
    fetch('http://127.0.0.1:8000/api/komentar', {
      headers: { 'Accept': 'application/json' }
    })
      .then(res => res.json())
      .then(result => {
        setKomentarList(result.data || []);
        setAvgRating(result.avg_rating || 5.0);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching komentar:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchKomentar();
  }, [refreshTrigger]);

  return (
    <div className="komentar-list shadow-card">
      <h3>
        Komentar & Ulasan Pengguna ({avgRating} ⭐)
      </h3>

      {loading ? (
        <p className="no-comments">Memuat ulasan pengguna...</p>
      ) : komentarList.length === 0 ? (
        <p className="no-comments">Belum ada komentar atau ulasan pengguna.</p>
      ) : (
        <div className="reviews-scroll">
          {komentarList.map(item => (
            <div key={item.id} className="review-card">
              <div className="review-header">
                <div className="user-info">
                  <div className="small-avatar">
                    <User size={16} />
                  </div>
                  <div>
                    <span className="user-name">{item.nama_pengguna || 'Pengguna App'}</span>
                    <span className="review-date">
                      {item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID') : 'Terbaru'}
                    </span>
                  </div>
                </div>

                <div className="stars-badge">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star
                      key={star}
                      size={14}
                      className={item.rating >= star ? 'star-filled' : 'star-empty'}
                    />
                  ))}
                </div>
              </div>
              <p className="review-text">"{item.komentar}"</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ListKomentar;
