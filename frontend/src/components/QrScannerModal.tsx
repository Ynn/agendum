import { useEffect, useRef, useState } from 'react';
import { useT } from '../i18n';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onDetected: (value: string) => void;
}

type DetectedBarcode = { rawValue?: string };
type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<DetectedBarcode[]>;
};

export function QrScannerModal({ isOpen, onClose, onDetected }: Props) {
  const t = useT();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    const BarcodeDetectorCtor = (window as any).BarcodeDetector as
      | (new (opts?: { formats?: string[] }) => BarcodeDetectorLike)
      | undefined;

    const stopAll = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };

    const run = async () => {
      try {
        if (!BarcodeDetectorCtor) {
          setError(t.camera_not_supported);
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });

        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();

        const detector = new BarcodeDetectorCtor({ formats: ['qr_code'] });
        const tick = async () => {
          if (!mounted) return;
          try {
            const found = await detector.detect(video);
            const raw = found[0]?.rawValue?.trim();
            if (raw) {
              onDetected(raw);
              stopAll();
              return;
            }
          } catch {
            // ignore transient detection errors
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch {
        setError(t.camera_permission_denied);
      }
    };

    void run();

    return () => {
      mounted = false;
      stopAll();
    };
  }, [isOpen, onDetected, t.camera_not_supported, t.camera_permission_denied]);

  if (!isOpen) return null;

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
      <div className="card" style={{ width: 'min(94vw, 560px)', padding: '0.8rem', background: 'var(--card-bg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
          <strong>{t.scan_qr}</strong>
          <button className="btn" onClick={onClose} style={{ padding: '0.2rem 0.45rem', fontSize: '0.78rem' }}>{t.close}</button>
        </div>
        <p style={{ marginTop: 0, color: 'var(--text-muted)', fontSize: '0.82rem' }}>{t.qr_scan_hint}</p>
        {error ? (
          <div style={{ color: '#ef4444', fontSize: '0.84rem' }}>{error}</div>
        ) : (
          <video
            ref={videoRef}
            playsInline
            muted
            style={{ width: '100%', borderRadius: '10px', border: '1px solid var(--border-color)', background: '#000' }}
          />
        )}
      </div>
    </div>
  );
}
