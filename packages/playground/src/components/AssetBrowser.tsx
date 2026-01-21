
/**
 * Asset Browser Component
 * Displays the HoloScript Standard Library and allows insertion into the editor.
 */

import React, { useEffect, useState } from 'react';
import { usePlaygroundStore } from '@hooks/usePlaygroundStore';
import { LibraryService, LibraryManifest, LibraryComponent } from '@services/LibraryService';

const AssetBrowser: React.FC = () => {
  const { editor, setCode } = usePlaygroundStore();
  const [manifest, setManifest] = useState<LibraryManifest | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    loadLibrary();
  }, []);
  
  const loadLibrary = async () => {
    setLoading(true);
    try {
      const data = await LibraryService.getManifest();
      setManifest(data);
    } catch (e) {
      console.error("Failed to load library", e);
    } finally {
      setLoading(false);
    }
  };
  
  const handleInsert = async (component: LibraryComponent) => {
    const code = await LibraryService.getComponentCode(component.id);
    // Append to current code
    // Ideally we insert at cursor, but for now we append
    const newCode = editor.code + "\n\n" + code;
    setCode(newCode);
  };
  
  const categories = manifest 
    ? ['All', ...Array.from(new Set(manifest.components.map(c => c.category)))]
    : [];
    
  const filteredComponents = manifest?.components.filter(c => 
    selectedCategory === 'All' || c.category === selectedCategory
  );

  return (
    <div className="h-full w-full flex flex-col bg-gray-900 border-l border-gray-700">
      <div className="p-3 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
        <h3 className="text-sm font-semibold text-gray-200">📚 Asset Library</h3>
        <button 
          onClick={loadLibrary}
          className="text-xs text-gray-400 hover:text-white"
          title="Refresh Library"
        >
          ↻
        </button>
      </div>
      
      {/* Category Filter */}
      <div className="flex gap-2 p-2 overflow-x-auto border-b border-gray-700 bg-gray-800/50 scrollbar-hide">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-2 py-1 text-xs rounded whitespace-nowrap transition-colors ${
              selectedCategory === cat 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
      
      {/* Content List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {loading && <div className="text-center text-gray-500 py-4">Loading Library...</div>}
        
        {!loading && filteredComponents?.map(component => (
          <div key={component.id} className="bg-gray-800 border border-gray-700 rounded p-3 hover:border-blue-500 transition-colors group">
            <div className="flex justify-between items-start mb-1">
              <h4 className="text-sm font-medium text-blue-400">{component.name}</h4>
              <span className="text-[10px] px-1.5 py-0.5 bg-gray-700 rounded text-gray-400">
                {component.category}
              </span>
            </div>
            <p className="text-xs text-gray-400 mb-2 line-clamp-2">{component.description}</p>
            <div className="flex justify-between items-center">
              <div className="flex gap-1">
                {component.tags.slice(0, 3).map(tag => (
                   <span key={tag} className="text-[10px] text-gray-500">#{tag}</span>
                ))}
              </div>
              <button
                onClick={() => handleInsert(component)}
                className="text-xs bg-gray-700 hover:bg-blue-600 text-white px-2 py-1 rounded transition-colors flex items-center gap-1 opacity-0 group-hover:opacity-100"
              >
                Insert +
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AssetBrowser;
