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
    <div className="qr-modal-overlay">
      <div className="card qr-modal qr-modal--code">
        <div className="qr-modal__header">
          <strong>{t.show_qr}</strong>
          <button className="btn qr-modal__close-btn" onClick={onClose}>{t.close}</button>
        </div>
        <canvas ref={canvasRef} className="qr-modal__canvas" />
        <div className="qr-modal__value">{value}</div>
      </div>
    </div>
  );
}
