import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, Database, LayoutGrid, Plus, Loader2 } from 'lucide-react';
import { db, normalizeMetadata, generateThumbnail } from './lib/db';
import MetadataGrid from './components/MetadataGrid';
import { cn } from './lib/utils';

export default function App() {
  const [activeTab, setActiveTab] = useState('session'); 
  const [sessionImages, setSessionImages] = useState([]);
  const [favorites, setFavorites] = useState([]);
  
  const [processingCount, setProcessingCount] = useState(0);
  
  const workerRef = useRef(null);
  const fileInputRef = useRef(null); 
  const thumbnailMapRef = useRef(new Map()); 

  useEffect(() => {
    try {
      workerRef.current = new Worker(new URL('./workers/metadata.worker.js', import.meta.url), { type: 'module' });
      
      workerRef.current.onmessage = (e) => {
        const { success, data, fileName, error } = e.data;
        
        if (success) {
          const normalized = normalizeMetadata(data);
          const thumbnailSrc = thumbnailMapRef.current.get(fileName);
          
          setSessionImages(prev => [...prev, { 
            id: `sess-${Date.now()}-${Math.random()}`, 
            ...normalized, 
            fileName,
            thumbnailSrc, 
          }]);
          
          thumbnailMapRef.current.delete(fileName);
        } else {
          console.error(`Failed to parse ${fileName}:`, error);
        }
        setProcessingCount(prev => Math.max(0, prev - 1));
      };

      workerRef.current.onerror = (err) => {
        console.error("Worker Error:", err);
        alert("Metadata Worker failed to start. \nEnsure 'npm install pako' is run.");
        setProcessingCount(0);
      };

    } catch (e) {
      console.error("Worker Initialization Failed:", e);
    }

    return () => workerRef.current?.terminate();
  }, []);

  useEffect(() => {
    loadFavorites();
  }, [activeTab]);

  const loadFavorites = async () => {
    const favs = await db.favorites.orderBy('timestamp').reverse().toArray();
    setFavorites(favs);
  };

  const processFiles = useCallback((fileList) => {
    const files = Array.from(fileList);
    const pngs = files.filter(f => f.type === "image/png" || f.name.toLowerCase().endsWith('.png'));
    const jpgs = files.filter(f => f.type === "image/jpeg" || f.name.toLowerCase().endsWith('.jpg') || f.name.toLowerCase().endsWith('.jpeg'));

    if (jpgs.length > 0) {
      alert(`Skipped ${jpgs.length} JPG file(s).\n\nNovelAI metadata is only preserved in original PNG files.`);
    }

    if (pngs.length === 0) {
      if (jpgs.length === 0) alert("No valid PNG images found.");
      return;
    }

    setProcessingCount(prev => prev + pngs.length);
    
    pngs.forEach(file => {
      generateThumbnail(file).then(thumbBlob => {
        const thumbUrl = URL.createObjectURL(thumbBlob);
        thumbnailMapRef.current.set(file.name, thumbUrl);
        
        if (workerRef.current) {
            workerRef.current.postMessage(file);
        } else {
             alert("Worker is not ready.");
             setProcessingCount(0);
        }
      });
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleManualSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleSaveFavorite = async (item) => {
    const thumbnailBlob = await fetch(item.thumbnailSrc).then(r => r.blob());
    await db.favorites.add({
      timestamp: Date.now(),
      prompt: item.prompt,
      model: item.model,
      seed: item.seed,
      raw: item.raw,
      thumbnail: thumbnailBlob,
      ...item
    });
    alert("Saved to Favorites!");
  };

  // --- DELETE HANDLERS ---
  const handleDeleteSession = (id) => {
    setSessionImages(prev => prev.filter(img => img.id !== id));
  };

  const handleDeleteFavorite = async (id) => {
    if (confirm("Are you sure you want to delete this favorite?")) {
        await db.favorites.delete(id);
        loadFavorites(); // Refresh list
    }
  };

  return (
    <div 
      className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleManualSelect} 
        className="hidden" 
        multiple 
        accept="image/png" 
      />

      <header className="mb-8 flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            NovelAI Metadata Viewer
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Stealth Info Extractor (V3 / V4 / V4.5)
          </p>
        </div>
        
        <div className="flex gap-2">
		  <button 
            onClick={triggerFileUpload}
            className="px-4 py-2 rounded-lg flex items-center gap-2 bg-indigo-600 text-white hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20"
          >
            <Plus size={18} /> Upload Images
          </button>
		  
          <button 
            onClick={() => setActiveTab('session')}
            className={cn("px-4 py-2 rounded-lg flex items-center gap-2 transition-colors", 
              activeTab === 'session' ? "bg-slate-800 text-white border border-slate-700" : "text-slate-400 hover:bg-slate-800/50")}
          >
            <LayoutGrid size={18} /> Session ({sessionImages.length})
          </button>
          <button 
            onClick={() => setActiveTab('favorites')}
            className={cn("px-4 py-2 rounded-lg flex items-center gap-2 transition-colors", 
              activeTab === 'favorites' ? "bg-slate-800 text-white border border-slate-700" : "text-slate-400 hover:bg-slate-800/50")}
          >
            <Database size={18} /> Favorites
          </button>
        </div>
      </header>

      {sessionImages.length === 0 && activeTab === 'session' && (
        <div 
          onClick={triggerFileUpload}
          className="border-2 border-dashed border-slate-700 rounded-xl p-20 text-center text-slate-500 hover:border-indigo-500 hover:text-indigo-400 hover:bg-indigo-950/10 transition-all cursor-pointer group"
        >
          <Upload className="mx-auto h-16 w-16 mb-4 opacity-50 group-hover:scale-110 transition-transform" />
          <p className="text-xl font-medium">Click to Upload or Drag & Drop</p>
          <p className="text-sm mt-2 opacity-70">Supports NovelAI PNGs (V3, V4, V4.5)</p>
        </div>
      )}

      <main>
        {activeTab === 'session' && (
          <MetadataGrid 
            items={sessionImages} 
            onSave={handleSaveFavorite} 
            onDelete={handleDeleteSession}
            isFavoriteMode={false}
          />
        )}
        {activeTab === 'favorites' && (
          <MetadataGrid 
            items={favorites} 
            onDelete={handleDeleteFavorite}
            isFavoriteMode={true} 
          />
        )}
      </main>

      {processingCount > 0 && (
        <div className="fixed bottom-4 right-4 bg-indigo-600 px-6 py-3 rounded-lg shadow-xl flex items-center gap-3 z-50">
           <Loader2 className="animate-spin w-5 h-5 text-white" />
           <span className="font-medium">Processing {processingCount} left...</span>
        </div>
      )}
    </div>
  );
}