import React from 'react';
import { CloseIcon } from '../Icons';

interface PdfViewerModalProps {
  showPdfModal: boolean;
  pdfViewerName: string;
  pdfViewerUrl: string;
  setShowPdfModal: (val: boolean) => void;
  setPdfViewerUrl: (val: string) => void;
  t: (key: string) => string;
}

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({
  showPdfModal,
  pdfViewerName,
  pdfViewerUrl,
  setShowPdfModal,
  setPdfViewerUrl,
  t,
}) => {
  if (!showPdfModal) return null;

  return (
    <div className="modal active" id="modalPdfViewer">
      <div className="modal-content glass" style={{ maxWidth: 850 }}>
        <div className="modal-header">
          <h2>{t('pdf_viewer_title')} - {pdfViewerName}</h2>
          <span 
            className="close-btn icon-svg" 
            onClick={() => { setShowPdfModal(false); setPdfViewerUrl(''); }}
          >
            <CloseIcon size={18} />
          </span>
        </div>
        <div className="pdf-container">
          <iframe 
            src={pdfViewerUrl} 
            width="100%" 
            height="600px" 
            style={{ border: 'none', borderRadius: 'var(--border-radius-md)', background: '#121620' }}
          ></iframe>
        </div>
      </div>
    </div>
  );
};
