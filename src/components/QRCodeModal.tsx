import React from 'react';
import QRCode from 'react-qr-code';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Download, Copy } from 'lucide-react';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  inviteUrl: string;
  title?: string;
}

const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  inviteUrl,
  title = 'Your Invite QR Code'
}) => {
  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      // Could add a toast here
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  };

  const handleDownloadQR = () => {
    // Create a canvas from the QR code and download it
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = 'loom-invite-qr.png';
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
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
            <div className="flex justify-center p-4 bg-[hsl(var(--loom-surface))] rounded-lg border border-[hsl(var(--loom-border))]">
              <QRCode
                value={inviteUrl}
                size={200}
                level="M"
                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
              />
            </div>

            <div className="text-center text-sm text-[hsl(var(--loom-text-muted))]">
              Scan this QR code to receive an invitation to connect
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleCopyUrl}
                className="flex-1"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Link
              </Button>
              <Button
                variant="outline"
                onClick={handleDownloadQR}
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default QRCodeModal;
