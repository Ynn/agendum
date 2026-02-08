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
    <div className="qr-modal-overlay">
      <div className="card qr-modal qr-modal--scanner">
        <div className="qr-modal__header">
          <strong>{t.scan_qr}</strong>
          <button className="btn qr-modal__close-btn" onClick={onClose}>{t.close}</button>
        </div>
        <p className="qr-modal__hint">{t.qr_scan_hint}</p>
        {error ? (
          <div className="qr-modal__error">{error}</div>
        ) : (
          <video
            ref={videoRef}
            playsInline
            muted
            className="qr-modal__video"
          />
        )}
      </div>
    </div>
  );
}
