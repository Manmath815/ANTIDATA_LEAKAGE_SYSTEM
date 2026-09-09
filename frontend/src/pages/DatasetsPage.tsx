import React, { useEffect, useState } from 'react';
import { Database, Upload, Trash2, Eye, Shield, FileText, CheckCircle } from 'lucide-react';
import { datasetApi } from '../services/api';
import { Dataset, DataObject } from '../types';

export const DatasetsPage: React.FC = () => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [records, setRecords] = useState<DataObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [sensitiveFields, setSensitiveFields] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const fetchDatasets = async () => {
    setLoading(true);
    try {
      const list = await datasetApi.list();
      setDatasets(list);
      if (list.length > 0 && !selectedDataset) {
        setSelectedDataset(list[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  useEffect(() => {
    if (selectedDataset) {
      datasetApi.getRecords(selectedDataset.id, 50).then(setRecords).catch(console.error);
    }
  }, [selectedDataset]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !name) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    formData.append('file', file);
    if (sensitiveFields) formData.append('sensitive_fields', sensitiveFields);

    try {
      const newDs = await datasetApi.upload(formData);
      setDatasets([newDs, ...datasets]);
      setSelectedDataset(newDs);
      setName('');
      setDescription('');
      setFile(null);
      setSensitiveFields('');
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to upload dataset');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this dataset?')) return;
    try {
      await datasetApi.delete(id);
      const remaining = datasets.filter((d) => d.id !== id);
      setDatasets(remaining);
      if (selectedDataset?.id === id) {
        setSelectedDataset(remaining[0] || null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight">
            Sensitive Datasets Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Upload CSV/JSON files, inspect sensitive column schemas, and manage master distributor data.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Dataset Form */}
        <div className="bg-[#131B29] border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Upload className="w-4 h-4 text-sky-400" />
            <h2 className="text-sm font-bold text-slate-100">Upload Dataset</h2>
          </div>

          {uploadSuccess && (
            <div className="mb-4 p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>Dataset uploaded and indexed!</span>
            </div>
          )}

          <form onSubmit={handleUpload} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">
                Dataset Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Master Customer Registry"
                required
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of data objects..."
                rows={2}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">
                Sensitive Field Names (comma separated)
              </label>
              <input
                type="text"
                value={sensitiveFields}
                onChange={(e) => setSensitiveFields(e.target.value)}
                placeholder="email, salary, ssn, phone"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">
                File (CSV or JSON) *
              </label>
              <input
                type="file"
                accept=".csv,.json"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                required
                className="w-full text-slate-400 file:mr-4 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-sky-400 hover:file:bg-slate-700"
              />
            </div>

            <button
              type="submit"
              disabled={uploading || !file || !name}
              className="w-full py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-lg transition-all disabled:opacity-50 mt-2"
            >
              {uploading ? 'Processing...' : 'Upload & Create Dataset'}
            </button>
          </form>
        </div>

        {/* Datasets List */}
        <div className="lg:col-span-2 bg-[#131B29] border border-slate-800 rounded-xl p-5">
          <h2 className="text-sm font-bold text-slate-100 mb-4">Master Datasets Repository</h2>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-500 font-mono">Loading datasets...</div>
          ) : datasets.length > 0 ? (
            <div className="space-y-3">
              {datasets.map((ds) => {
                const isSelected = selectedDataset?.id === ds.id;
                return (
                  <div
                    key={ds.id}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-slate-900 border-sky-500/50 shadow-md shadow-sky-500/5'
                        : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700'
                    }`}
                    onClick={() => setSelectedDataset(ds)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-sky-500/10 text-sky-400 rounded-lg border border-sky-500/20">
                        <Database className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-100">{ds.name}</h3>
                          <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                            ID: #{ds.id}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{ds.description || 'No description'}</p>
                        <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500">
                          <span className="font-mono text-sky-400 font-medium">{ds.record_count} Records</span>
                          <span>•</span>
                          <span>{ds.schema_info.length} Columns</span>
                          <span>•</span>
                          <span>Created {new Date(ds.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDataset(ds);
                        }}
                        className="p-2 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded-lg"
                        title="Preview Records"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(ds.id);
                        }}
                        className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg"
                        title="Delete Dataset"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-xs text-slate-500">
              No datasets uploaded yet. Click "Run One-Click Demo" or upload a file.
            </div>
          )}
        </div>
      </div>

      {/* Dataset Record Preview */}
      {selectedDataset && (
        <div className="bg-[#131B29] border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-sky-400" />
                <span>Dataset Records Preview: {selectedDataset.name}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Showing first {records.length} records. Sensitive fields highlighted in red.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Sensitive Columns:</span>
              {selectedDataset.sensitive_fields.map((f) => (
                <span key={f} className="text-[10px] font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded">
                  {f}
                </span>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-800 rounded-lg">
            <table className="w-full text-xs text-left text-slate-300">
              <thead className="bg-slate-900 uppercase font-mono text-[10px] text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3">Object Key</th>
                  {selectedDataset.schema_info.map((col) => (
                    <th key={col.name} className="p-3">
                      {col.name} {col.sensitive && <Shield className="w-3 h-3 inline text-rose-400 ml-1" />}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {records.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-900/40">
                    <td className="p-3 text-sky-400 font-semibold">{rec.object_key}</td>
                    {selectedDataset.schema_info.map((col) => {
                      const val = rec.data_payload[col.name];
                      const isSens = selectedDataset.sensitive_fields.includes(col.name);
                      return (
                        <td key={col.name} className={`p-3 ${isSens ? 'text-amber-300' : 'text-slate-300'}`}>
                          {val !== undefined && val !== null ? String(val) : '-'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
