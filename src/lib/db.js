import Dexie from 'dexie';

export const db = new Dexie('NovelAIMetadataViewer');

// Define schema
db.version(1).stores({
  favorites: '++id, timestamp, prompt, model, seed' 
});

/**
 * Normalizes NAI metadata from various versions (V3, V4, V4.5) into a single shape.
 *
 */
export const normalizeMetadata = (raw) => {
  // Newer versions wrap data in a 'parameters' object, older ones are flat.
  const params = raw.parameters || raw;
  
  // Model hash mapping (Example hashes)
  const modelMap = {
    "81274d13": "NAI Diffusion Anime V3",
    "30c1d329": "NAI Diffusion Furry V3",
    "4BDE2A90": "NAI Diffusion V4.5",
  };

  // Extract prompt - V4.5 format has it at top level, some versions in v4_prompt
  let prompt = params.prompt || raw.prompt || "";
  if (!prompt && raw.v4_prompt?.caption?.base_caption) {
    prompt = raw.v4_prompt.caption.base_caption;
  }

  // Extract negative prompt - V4.5 uses 'uc', some use v4_negative_prompt
  let negative_prompt = params.negative_prompt || params.uc || raw.uc || "";
  if (!negative_prompt && raw.v4_negative_prompt?.caption?.base_caption) {
    negative_prompt = raw.v4_negative_prompt.caption.base_caption;
  }

  // Determine model
  let model = "Unknown";
  if (raw.model) {
    model = raw.model;
  } else if (raw.source) {
    if (typeof raw.source === 'string') {
      model = raw.source;
    } else {
      const hash = String(raw.source).substr(0, 8);
      model = modelMap[hash] || hash;
    }
  }

  // --- V4 Character Prompts Extraction ---
  // The JSON structure uses parallel arrays for positive and negative character prompts
  let characters = [];
  if (raw.v4_prompt?.caption?.char_captions) {
    characters = raw.v4_prompt.caption.char_captions.map((charObj, index) => {
      // Find corresponding negative prompt for this character index
      const negCharObj = raw.v4_negative_prompt?.caption?.char_captions?.[index];
      
      return {
        prompt: charObj.char_caption || "",
        centers: charObj.centers || [], // Array of {x, y}
        negative: negCharObj?.char_caption || ""
      };
    }).filter(c => c.prompt.trim() !== ""); // Only keep characters with actual prompts
  }

  return {
    prompt,
    negative_prompt, 
    characters, // New field for UI
    seed: params.seed || raw.seed,
    steps: params.steps || raw.steps,
    sampler: params.sampler || raw.sampler || "Unknown",
    cfg_scale: params.cfg_scale || params.scale || raw.scale,
    model,
    
    // V4.5 Specifics
    vibe_transfer: raw.reference_information_extracted_multiple?.length > 0 ? {
      information_extracted: raw.reference_information_extracted_multiple[0],
      reference_strength: raw.reference_strength_multiple[0]
    } : null,
    fidelity: raw.fidelity || null,
    
    // Store original for download/debugging
    raw: raw
  };
};

/**
 * Helper to generate thumbnail blob from file
 *
 */
export const generateThumbnail = async (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 256;
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.7);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
};