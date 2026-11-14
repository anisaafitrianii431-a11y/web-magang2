export default function StatusBadge({ status }) {
  let badgeClass = 'badge-draft';
  if (status === 'Menunggu Review') badgeClass = 'badge-review';
  if (status === 'Revisi') badgeClass = 'badge-revisi';
  if (status === 'Disetujui') badgeClass = 'badge-disetujui';

  return (
    <span className={`badge ${badgeClass}`}>
      ● {status}
    </span>
  );
}
