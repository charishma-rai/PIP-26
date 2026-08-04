import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface RoomOption {
  id: string;
  name: string;
}

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (roomId: string) => void;
  rooms: RoomOption[];
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  rooms,
}) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [selectedFallback, setSelectedFallback] = useState<string>('help_desk');

  useEffect(() => {
    if (!isOpen) return;

    const qrRegionId = 'qr-reader';
    const html5Qrcode = new Html5Qrcode(qrRegionId);
    scannerRef.current = html5Qrcode;

    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          const cameraId = devices[0].id;
          return html5Qrcode.start(
            cameraId,
            {
              fps: 10,
              qrbox: { width: 220, height: 220 },
            },
            (decodedText) => {
              let roomId = decodedText;
              try {
                const url = new URL(decodedText);
                const locParam = url.searchParams.get('loc');
                if (locParam) roomId = locParam;
              } catch (e) {
                // Not a full URL, use decoded string directly
              }

              html5Qrcode.stop().then(() => {
                onScan(roomId);
                onClose();
              });
            },
            () => {
              // Ignore per-frame errors
            }
          );
        } else {
          setScanError('No camera device detected.');
        }
      })
      .catch((err) => {
        setScanError('Camera permission denied or camera not available.');
      });

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="lock-modal show" onClick={onClose}>
      <div className="lock-box" style={{ maxWidth: '440px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 12px', fontSize: '20px' }}>📷 Scan QR Code</h3>
        <p style={{ margin: '0 0 16px', fontSize: '13.5px' }}>
          Point your camera at a printed location QR code to auto-detect where you are standing.
        </p>

        <div
          id="qr-reader"
          style={{
            width: '100%',
            minHeight: '220px',
            background: '#f8f5fc',
            borderRadius: '14px',
            overflow: 'hidden',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        />

        {scanError && (
          <div style={{ color: '#c53030', fontSize: '12px', marginBottom: '14px', fontWeight: 600 }}>
            {scanError}
          </div>
        )}

        <div style={{ borderTop: '1px dashed #E0D6EB', paddingTop: '14px', marginTop: '10px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#8A8296', marginBottom: '8px' }}>
            Simulate scanning (select location):
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <select
              value={selectedFallback}
              onChange={(e) => setSelectedFallback(e.target.value)}
              className="search-input"
              style={{ padding: '8px 10px', fontSize: '13px' }}
            >
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                onScan(selectedFallback);
                onClose();
              }}
              style={{
                background: 'linear-gradient(135deg, var(--sky), #BFE0F5)',
                color: '#2b4f66',
                border: 'none',
                borderRadius: '12px',
                padding: '8px 14px',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Set Location
            </button>
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            marginTop: '18px',
            background: '#EAE5F2',
            color: '#4A4258',
            border: 'none',
            borderRadius: '12px',
            padding: '8px 20px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
