import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { useT } from '../i18n';

interface Props {
  value: string | null;
  onClose: () => void;
}

export function QrCodeModal({ value, onClose }: Props) {
  const t = useT();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!value || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, value, {
      width: 280,
      margin: 2,
      color: {
        dark: '#111827',
        light: '#ffffff',
      },
    }).catch(() => {
      // noop
    });
  }, [value]);

  if (!value) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.65)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1200,
      padding: '1rem'
    }}>
      <div className="card" style={{ width: 'min(92vw, 420px)', padding: '1rem', background: 'var(--card-bg)', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
          <strong>{t.show_qr}</strong>
          <button className="btn" onClick={onClose} style={{ padding: '0.2rem 0.45rem', fontSize: '0.78rem' }}>{t.close}</button>
        </div>
        <canvas ref={canvasRef} style={{ width: '100%', maxWidth: 280, borderRadius: 8, border: '1px solid var(--border-color)' }} />
        <div style={{ marginTop: '0.6rem', color: 'var(--text-muted)', fontSize: '0.72rem', wordBreak: 'break-all' }}>{value}</div>
      </div>
    </div>
  );
}
