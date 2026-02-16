import React, { useState } from 'react';
import { Copy, Save, Download, Sliders, Image as ImageIcon, Trash2, User } from 'lucide-react';

export default function MetadataGrid({ items, onSave, onDelete, isFavoriteMode }) {
  if (items.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {items.map((item) => (
        <MetadataCard 
            key={item.id} 
            item={item} 
            onSave={onSave} 
            onDelete={onDelete} 
            isFavoriteMode={isFavoriteMode} 
        />
      ))}
    </div>
  );
}

function MetadataCard({ item, onSave, onDelete, isFavoriteMode }) {
  const [showRaw, setShowRaw] = useState(false);

  // Helper to handle Blob URLs for favorites vs Object URLs for session
  const imgSrc = isFavoriteMode && item.thumbnail instanceof Blob 
    ? URL.createObjectURL(item.thumbnail) 
    : item.thumbnailSrc;

  // Vibe Transfer Download Logic 
  const downloadVibe = () => {
    if (!item.raw.vibe_transfer) return;
    const blob = new Blob([JSON.stringify(item.raw.vibe_transfer)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${item.seed}.naiv4vibe`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(item.prompt);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-600 transition-all flex flex-col shadow-lg shadow-black/20">
      {/* Header / Preview - Full View */}
      <div className="h-64 bg-slate-950 relative group flex items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 to-slate-950">
        {imgSrc ? (
            <img 
                src={imgSrc} 
                alt="Thumbnail" 
                className="w-full h-full object-contain transition-opacity" 
            />
        ) : (
            <div className="flex items-center justify-center h-full text-slate-600"><ImageIcon /></div>
        )}
        
        {/* Action Buttons Overlay */}
        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
                onClick={(e) => { e.stopPropagation(); onDelete(item.id); }} 
                className="p-2 bg-slate-900/90 rounded-full hover:bg-red-600 hover:text-white text-slate-400 transition-colors border border-slate-700" 
                title={isFavoriteMode ? "Remove from Favorites" : "Remove from Session"}
            >
                <Trash2 size={16} />
            </button>

            {!isFavoriteMode && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onSave(item); }} 
                    className="p-2 bg-slate-900/90 rounded-full hover:bg-indigo-600 hover:text-white text-indigo-400 transition-colors border border-slate-700" 
                    title="Save to Favorites"
                >
                    <Save size={16} />
                </button>
            )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent p-2 pt-8">
            <span className="text-xs font-mono bg-black/60 border border-white/10 px-2 py-1 rounded text-slate-300 backdrop-blur-sm">
                {item.model}
            </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col gap-3">
        {/* Main Prompt */}
        <div className="relative group/prompt">
            <p className="text-sm text-slate-300 line-clamp-3 font-medium leading-relaxed bg-slate-800/50 p-2 rounded border border-slate-800 hover:border-slate-600 transition-colors cursor-text select-all">
                {item.prompt}
            </p>
            <button onClick={copyPrompt} className="absolute bottom-1 right-1 p-1 hover:text-indigo-400 text-slate-500 opacity-0 group-hover/prompt:opacity-100 transition-opacity bg-slate-800 rounded">
                <Copy size={14} />
            </button>
        </div>

        {/* Character Prompts Section */}
        {item.characters && item.characters.length > 0 && (
            <div className="space-y-2 mt-1">
                {item.characters.map((char, idx) => (
                    <div key={idx} className="text-xs bg-indigo-950/20 border border-indigo-500/20 p-2 rounded relative">
                        <div className="flex items-center gap-2 text-indigo-300 font-bold mb-1 border-b border-indigo-500/10 pb-1">
                            <User size={12} />
                            <span>Character {idx + 1}</span>
                            {char.centers?.[0] && (
                                <span className="text-[9px] text-slate-500 font-mono ml-auto tracking-wider">
                                    X:{char.centers[0].x} Y:{char.centers[0].y}
                                </span>
                            )}
                        </div>
                        <p className="text-slate-300 leading-relaxed">{char.prompt}</p>
                        {char.negative && (
                            <p className="text-red-300/70 mt-1 pt-1 text-[10px]">
                                <span className="font-bold uppercase text-red-500/40 mr-1">Neg:</span>
                                {char.negative}
                            </p>
                        )}
                    </div>
                ))}
            </div>
        )}

        {/* Negative Prompt */}
        {item.negative_prompt && (
             <div className="text-xs text-red-300/80 line-clamp-2">
                <span className="font-bold uppercase text-[10px] tracking-wider text-red-500/50 mr-2">Negative</span>
                {item.negative_prompt}
             </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 mt-auto pt-4 border-t border-slate-800">
            <div className="flex justify-between"><span>Seed:</span> <span className="font-mono text-slate-300 select-all">{item.seed}</span></div>
            <div className="flex justify-between"><span>Steps:</span> <span className="text-slate-300">{item.steps}</span></div>
            <div className="flex justify-between"><span>Sampler:</span> <span className="text-slate-300">{item.sampler}</span></div>
            <div className="flex justify-between"><span>CFG:</span> <span className="text-slate-300">{item.cfg_scale}</span></div>
            
            {item.fidelity !== null && (
                <div className="col-span-2 text-indigo-400 flex justify-between font-medium bg-indigo-950/30 px-2 py-1 rounded mt-1">
                    <span>Fidelity:</span> <span>{item.fidelity}</span>
                </div>
            )}
        </div>

        {/* Vibe Transfer Section */}
        {item.vibe_transfer && (
            <div className="mt-2 p-3 bg-indigo-950/20 border border-indigo-500/30 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-indigo-400 flex items-center gap-1">
                        <Sliders size={12} /> Vibe Transfer
                    </span>
                    <button onClick={downloadVibe} className="text-[10px] flex items-center gap-1 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white px-2 py-1 rounded transition-colors">
                        <Download size={10} /> .naiv4vibe
                    </button>
                </div>
                <div className="space-y-2">
                    <div>
                        <div className="flex justify-between text-[10px] text-slate-400">
                            <span>Info Extracted</span>
                            <span>{item.raw.vibe_transfer.information_extracted?.toFixed(2) ?? "N/A"}</span>
                        </div>
                        <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500" style={{ width: `${(item.raw.vibe_transfer.information_extracted || 0) * 100}%` }} />
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between text-[10px] text-slate-400">
                            <span>Ref Strength</span>
                            <span>{item.raw.vibe_transfer.reference_strength?.toFixed(2) ?? "N/A"}</span>
                        </div>
                        <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-pink-500" style={{ width: `${(item.raw.vibe_transfer.reference_strength || 0) * 100}%` }} />
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Debug Toggle */}
        <button onClick={() => setShowRaw(!showRaw)} className="text-[10px] text-slate-600 hover:text-slate-400 text-left mt-2">
            {showRaw ? "Hide Raw JSON" : "Show Raw JSON"}
        </button>
        {showRaw && (
            <pre className="text-[9px] bg-black p-2 rounded overflow-auto max-h-40 text-green-400 font-mono mt-2 border border-slate-800">
                {JSON.stringify(item.raw, null, 2)}
            </pre>
        )}
      </div>
    </div>
  );
}