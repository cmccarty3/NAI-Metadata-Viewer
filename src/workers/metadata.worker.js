import pako from 'pako';

/**
 * Parse PNG chunks to extract standard tEXt metadata
 * This handles V4.5 format which uses standard PNG chunks
 */
async function parseStandardPNGMetadata(file) {
  const buffer = await file.arrayBuffer();
  const data = new Uint8Array(buffer);
  
  // Verify PNG signature
  if (data[0] !== 0x89 || data[1] !== 0x50 || data[2] !== 0x4E || data[3] !== 0x47) {
    return null;
  }
  
  let pos = 8; // Skip PNG signature
  
  while (pos < data.length - 12) {
    // Read chunk length (4 bytes, big-endian)
    const length = (data[pos] << 24) | (data[pos+1] << 16) | (data[pos+2] << 8) | data[pos+3];
    
    // Read chunk type (4 bytes)
    const chunkType = String.fromCharCode(data[pos+4], data[pos+5], data[pos+6], data[pos+7]);
    
    // Check for tEXt chunk
    if (chunkType === 'tEXt') {
      const chunkData = data.subarray(pos + 8, pos + 8 + length);
      
      // Find null terminator separating keyword from text
      let nullPos = -1;
      for (let i = 0; i < chunkData.length; i++) {
        if (chunkData[i] === 0) {
          nullPos = i;
          break;
        }
      }
      
      if (nullPos !== -1) {
        const keyword = new TextDecoder().decode(chunkData.subarray(0, nullPos));
        
        // NovelAI V4.5 stores metadata in "Comment" chunk
        if (keyword === 'Comment') {
          const text = new TextDecoder().decode(chunkData.subarray(nullPos + 1));
          try {
            return JSON.parse(text);
          } catch (e) {
            // Not valid JSON, continue searching
          }
        }
      }
    }
    
    // Move to next chunk (length + 4 bytes type + 4 bytes length + 4 bytes CRC)
    pos += length + 12;
  }
  
  return null;
}

self.onmessage = async (e) => {
  const file = e.data;

  try {
    // 1. File Integrity Check: Validate Magic Bytes
    const headerBuffer = await file.slice(0, 8).arrayBuffer();
    const header = new Uint8Array(headerBuffer);
    const isPng = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47;
    
    if (!isPng) {
      throw new Error("Invalid file format. Only original NovelAI .png files contain metadata. JPEGs/WebPs are not supported.");
    }

    // 2. Try Standard PNG Metadata First (V4.5 format)
    const standardMetadata = await parseStandardPNGMetadata(file);
    if (standardMetadata) {
      self.postMessage({ 
        success: true, 
        data: standardMetadata, 
        fileName: file.name,
        fileSize: file.size,
        format: 'standard'
      });
      return;
    }

    // 3. Fall back to LSB Stealth Extraction (V3/V4 format)
    // Create Bitmap with RAW Pixel Mode
    // We disable color correction to preserve the LSB noise
    const bitmap = await createImageBitmap(file, { 
      premultiplyAlpha: 'none', 
      colorSpaceConversion: 'none' 
    });
    
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d', { 
      willReadFrequently: true,
      alpha: true
    });
    
    ctx.drawImage(bitmap, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // 4. LSB Extraction Loop
    // Extract the Least Significant Bit from the Alpha channel (Every 4th byte)
    const bytes = [];
    let currentByte = 0;
    let bitCount = 0;

    for (let i = 3; i < data.length; i += 4) {
      const bit = data[i] & 1;
      currentByte = (currentByte << 1) | bit;
      bitCount++;

      if (bitCount === 8) {
        bytes.push(currentByte);
        currentByte = 0;
        bitCount = 0;
      }
    }

    const byteArray = new Uint8Array(bytes);

    // 5. Robust Signature Search
    // We look for common Zlib headers OR the NovelAI text signature
    let startIndices = [];
    
    // Convert a chunk to string to check for text signature "stealth_pnginfo"
    // We only check the first 2KB for speed
    const checkLength = Math.min(2048, byteArray.length);
    let textHeader = "";
    for(let k=0; k<checkLength; k++) textHeader += String.fromCharCode(byteArray[k]);

    const textSigIndex = textHeader.indexOf("stealth_pnginfo");
    
    if (textSigIndex !== -1) {
        // If we found "stealth_pnginfo", the Zlib stream usually follows closely after
        // We start scanning for Zlib headers starting from where the text signature ends
        startIndices.push(textSigIndex); 
    }

    // Scan for standard Zlib headers: 0x78 followed by 0x01, 0x9C, or 0xDA
    for(let i = 0; i < byteArray.length - 1; i++) {
        // 0x78 is the Zlib CMF byte (Deflate, 32k window)
        if (byteArray[i] === 0x78) {
            const flag = byteArray[i+1];
            // 0x01: No/Low Compression
            // 0x9C: Default Compression
            // 0xDA: Best Compression
            // 0x5E: Fast Compression (Level 1-9 mapping variants)
            if (flag === 0x01 || flag === 0x9C || flag === 0xDA || flag === 0x5E) {
                startIndices.push(i);
                // If we found a valid header, we can try to break early, 
                // If we found a valid header, we can try to break early, 
                // but sometimes false positives exist, so we collect a few candidates.
                if (startIndices.length > 5) break; 
            }
        }
    }

    if (startIndices.length === 0) {
        throw new Error("No stealth metadata found. This image may be V4.5+ format without stealth encoding, or the alpha channel data was stripped during re-save.");
    }

    // 6. Attempt Decompression
    let extractedData = null;
    let error = null;

    // Try inflating from every candidate index until one works
    for (const startIndex of startIndices) {
        try {
            // If the text signature "stealth_pnginfo" was found, we might need to skip it
            // usually it is followed by a null byte or just the stream. 
            // We try the index itself, and a few offsets just in case.
            const attempts = [startIndex, startIndex + 1, startIndex + 15, startIndex + 16]; 
            
            for (const offset of attempts) {
                if (offset >= byteArray.length) continue;
                try {
                     const compressed = byteArray.subarray(offset);
                     const inflated = pako.inflate(compressed, { to: 'string' });
                     extractedData = JSON.parse(inflated);
                     if (extractedData) break;
                } catch (e) { /* Continue to next offset */ }
            }
            if (extractedData) break;
        } catch (err) {
            error = err;
        }
    }

    if (!extractedData) {
        throw new Error("Found potential signatures but failed to decompress. The file might be corrupted or use a non-standard format.");
    }

    // Success
    self.postMessage({ 
      success: true, 
      data: extractedData, 
      fileName: file.name,
      fileSize: file.size,
      format: 'stealth'
    });

  } catch (err) {
    self.postMessage({ 
      success: false, 
      error: err.message, 
      fileName: file.name 
    });
  }
};
