import React, { useState } from 'react';
import { FileText, Upload, Download, X, FileSpreadsheet, Check, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const CsvImportForm = () => {
  // CSV Import States
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState([]);
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting] = useState(false);

  // Export CSV
  const handleExportCSV = async () => {
    try {
      toast.loading('Génération de l\'export...');
      const res = await api.get('/transactions/export', { responseType: 'blob' });
      toast.dismiss();

      // Download trigger
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `transactions_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Fichier CSV téléchargé');
    } catch (error) {
      toast.dismiss();
      toast.error('Erreur lors de l\'exportation');
    }
  };

  // CSV Selection & Preview
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImportFile(file);
    setImportResult(null);

    // Read preview lines
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split('\n').slice(0, 6).map(l => l.trim()).filter(Boolean);
      const rows = lines.map(line => {
        // Simple splitter
        let insideQuote = false;
        let entry = '';
        const result = [];
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') insideQuote = !insideQuote;
          else if ((char === ',' || char === ';') && !insideQuote) {
            result.push(entry.replace(/^"|"$/g, ''));
            entry = '';
          } else {
            entry += char;
          }
        }
        result.push(entry.replace(/^"|"$/g, ''));
        return result;
      });
      setImportPreview(rows);
    };
    reader.readAsText(file);
  };

  // CSV Upload Trigger
  const handleImportSubmit = async () => {
    if (!importFile) return;

    try {
      setImporting(true);
      const formData = new FormData();
      formData.append('file', importFile);

      const res = await api.post('/transactions/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setImportResult(res.data);
      toast.success('Importation finalisée !');
      setImportFile(null);
      setImportPreview([]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de l\'importation');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-extrabold text-secondary uppercase tracking-wider px-1 flex items-center gap-1.5">
        <FileText size={14} className="text-accent" /> Portabilité des données
      </h3>

      <div className="bg-surface-2 p-5 rounded-[28px] border border-border/40 space-y-4">
        <div>
          <h4 className="text-xs font-bold text-primary">Gestion des transactions</h4>
          <p className="text-[10px] text-muted">Sauvegardez vos données ou importez un extrait de compte bancaire.</p>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button 
            onClick={() => setIsImportOpen(true)}
            className="bg-accent/10 border border-accent/20 text-accent p-4 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-accent/15 active:scale-97 transition-all"
          >
            <Upload size={20} />
            <span className="text-xs font-bold">Importer CSV</span>
          </button>
          
          <button 
            onClick={handleExportCSV}
            className="bg-surface border border-border/40 text-primary p-4 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-border/20 active:scale-97 transition-all"
          >
            <Download size={20} />
            <span className="text-xs font-bold">Exporter CSV</span>
          </button>
        </div>
      </div>

      {/* Slide up CSV Import Modal */}
      {isImportOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col justify-end">
          <div className="flex-1" onClick={() => !importing && setIsImportOpen(false)} />
          <div className="bg-surface rounded-t-[32px] max-h-[85vh] overflow-y-auto w-full max-w-md mx-auto p-6 shadow-2xl border-t border-border flex flex-col space-y-4 no-scrollbar">
            
            {/* Header */}
            <div className="flex justify-between items-center pb-2 border-b border-border/40">
              <div>
                <h3 className="text-sm font-extrabold text-primary">Importer des transactions</h3>
                <p className="text-[10px] text-muted">Format requis : date, description, amount, type, category, account</p>
              </div>
              <button 
                onClick={() => !importing && setIsImportOpen(false)} 
                className="p-1 rounded-full bg-surface-2 hover:bg-border/60 transition-colors"
                disabled={importing}
              >
                <X size={20} className="text-secondary" />
              </button>
            </div>

            {/* Dropzone field */}
            <div className="border-2 border-dashed border-border/50 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-accent/60 transition-colors relative bg-surface-2/40">
              <input 
                type="file" 
                accept=".csv"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
                disabled={importing}
              />
              <FileSpreadsheet size={32} className="text-muted mb-2" />
              <p className="text-xs font-bold text-primary">
                {importFile ? importFile.name : 'Sélectionnez un fichier .csv'}
              </p>
              <p className="text-[9px] text-muted mt-1">Glissez-déposez ou cliquez pour parcourir</p>
            </div>

            {/* Preview table */}
            {importPreview.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[10px] font-extrabold uppercase text-muted tracking-wider">Aperçu avant importation</h4>
                <div className="overflow-x-auto border border-border/40 rounded-xl max-h-40">
                  <table className="w-full text-left border-collapse text-[10px]">
                    <thead>
                      <tr className="bg-surface-2 text-secondary font-extrabold border-b border-border/40">
                        {importPreview[0].map((h, i) => (
                          <th key={i} className="p-2 truncate">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.slice(1).map((row, i) => (
                        <tr key={i} className="border-b border-border/20 text-primary">
                          {row.map((cell, j) => (
                            <td key={j} className="p-2 truncate max-w-[80px]">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Import report outcome */}
            {importResult && (
              <div className="p-4 rounded-2xl border bg-surface-2 border-border/40 space-y-2">
                <div className="flex items-center gap-2">
                  {importResult.failedCount === 0 ? (
                    <Check className="text-accent" size={16} />
                  ) : (
                    <AlertCircle className="text-warning" size={16} />
                  )}
                  <h4 className="text-xs font-bold text-primary">Bilan de l'importation</h4>
                </div>
                
                <p className="text-[10px] text-secondary">
                  ✓ <strong className="text-accent">{importResult.importedCount}</strong> lignes insérées avec succès.
                  {importResult.failedCount > 0 && (
                    <span> / ⚠️ <strong className="text-danger">{importResult.failedCount}</strong> lignes ignorées.</span>
                  )}
                </p>

                {importResult.errors?.length > 0 && (
                  <div className="max-h-24 overflow-y-auto text-[9px] text-danger/80 space-y-1 bg-danger-dim/5 p-2 rounded-lg border border-danger/10">
                    {importResult.errors.map((err, idx) => (
                      <p key={idx}>{err}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Submission button */}
            <button
              onClick={handleImportSubmit}
              disabled={!importFile || importing}
              className={`w-full py-3 rounded-2xl text-xs font-bold text-white shadow-md transition-all ${
                importFile && !importing 
                  ? 'bg-accent shadow-accent/20 hover:scale-101 active:scale-98' 
                  : 'bg-border/60 text-muted shadow-none cursor-not-allowed'
              }`}
            >
              {importing ? 'Importation en cours...' : 'Lancer l\'importation'}
            </button>

          </div>
        </div>
      )}
    </div>
  );
};

export default CsvImportForm;
