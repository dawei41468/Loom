import React, { useState, useRef } from 'react';
import QrScanner from 'react-qr-scanner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Camera, CameraOff } from 'lucide-react';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (data: string) => void;
  title?: string;
}

const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  title = 'Scan QR Code'
}) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanning, setScanning] = useState(true);
  const scannerRef = useRef<any>(null);

  const handleScan = (data: any) => {
    if (data && scanning) {
      setScanning(false);
      onScanSuccess(data.text);
      onClose();
    }
  };

  const handleError = (error: any) => {
    console.error('QR Scanner error:', error);
    if (error.name === 'NotAllowedError') {
      setHasPermission(false);
    }
  };

  const toggleScanning = () => {
    setScanning(!scanning);
  };

  const previewStyle = {
    height: 240,
    width: 320,
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="max-w-md w-full mx-4">
        <Card className="relative bg-[hsl(var(--loom-surface))] border border-[hsl(var(--loom-border))] text-[hsl(var(--loom-text))]">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{title}</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {hasPermission === false ? (
              <div className="text-center py-8">
                <CameraOff className="w-12 h-12 mx-auto mb-4 text-[hsl(var(--loom-text-muted))]" />
                <h3 className="text-lg font-medium mb-2">Camera Access Denied</h3>
                <p className="text-sm text-[hsl(var(--loom-text-muted))]">
                  Please allow camera access to scan QR codes
                </p>
                <Button
                  onClick={() => window.location.reload()}
                  className="mt-4"
                >
                  Try Again
                </Button>
              </div>
            ) : (
              <>
                <div className="flex justify-center">
                  <div className="relative rounded-lg overflow-hidden border-2 border-[hsl(var(--loom-primary))]">
                    {scanning ? (
                      <QrScanner
                        ref={scannerRef}
                        delay={300}
                        style={previewStyle}
                        onError={handleError}
                        onScan={handleScan}
                        constraints={{
                          video: { facingMode: 'environment' }
                        }}
                      />
                    ) : (
                      <div
                        className="flex items-center justify-center bg-[hsl(var(--loom-surface))]"
                        style={previewStyle}
                      >
                        <div className="text-center">
                          <CameraOff className="w-8 h-8 mx-auto mb-2 text-[hsl(var(--loom-text-muted))]" />
                          <p className="text-sm text-[hsl(var(--loom-text-muted))]">
                            Scanning paused
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-center text-sm text-[hsl(var(--loom-text-muted))]">
                  Point your camera at a QR code to scan it
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={toggleScanning}
                    className="flex-1"
                  >
                    {scanning ? (
                      <>
                        <CameraOff className="w-4 h-4 mr-2" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4 mr-2" />
                        Resume
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default QRScannerModal;
