# NovelAI Image Metadata Viewer

A high-performance, privacy-focused web application designed to extract, visualize, and manage generation metadata from images created with NovelAI. This tool supports both the modern V4.5 standard metadata and the legacy "Stealth" steganography used in V3/V4 models.

![License](https://img.shields.io/badge/license-MIT-blue.svg) ![React](https://img.shields.io/badge/React-18-61DAFB.svg) ![Vite](https://img.shields.io/badge/Vite-Fast-646CFF.svg)

## 🚀 Key Features

* **Universal Parsing:** Seamlessly reads metadata from all NovelAI model versions.
    * **Stealth Mode:** Decodes data hidden in the Alpha channel LSB (Least Significant Bit) for V3 and V4 images.
    * **Standard Mode:** Reads standard PNG `tEXt` chunks used by V4.5 and newer generations.
* **100% Client-Side Privacy:** All processing is performed locally in your browser using Web Workers. No images are ever uploaded to a remote server.
* **Local Persistence:** "Favorite" images and their prompt data are stored in your browser's **IndexedDB** (via Dexie.js), persisting across reloads without filling up your RAM.
* **Vibe Transfer Support:** Automatically detects Vibe Transfer settings, displaying "Reference Strength" and "Info Extracted" sliders. Includes a one-click download for the `.naiv4vibe` file to easily recreate styles.
* **Character Prompt Visualization:** Parses nested V4 schemas to display character-specific prompts, their screen coordinates, and their unique negative prompts.
* **High Performance:** Capable of batch-processing 50+ images simultaneously at 60fps by offloading binary parsing to background threads.

## 🛠️ Technology Stack

* **Frontend Framework:** React.js
* **Build Tool:** Vite 
* **Styling:** Tailwind CSS 
* **Database:** Dexie.js (IndexedDB wrapper) 
* **Binary Processing:** Pako (zlib inflation) 
* **Icons:** Lucide React

## 📦 Installation & Setup

Ensure you have **Node.js** (v16 or higher) installed on your machine.

1.  **Clone the repository**
    ```bash
    git clone [https://github.com/cmccarty3/NAI-Metadata-Viewer.git] (https://github.com/cmccarty3/NAI-Metadata-Viewer.git)
    cd nai-metadata-viewer
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```
    *Note: This will install critical packages like `pako` for decompression and `dexie` for database management.*

3.  **Start the development server**
    ```bash
    npm run dev
    ```

4.  **Open the App**
    Click the URL shown in your terminal (usually `http://localhost:5173`).

## 📖 Usage Guide

### Importing Images
* **Drag & Drop:** Simply drag a selection of PNG files directly onto the drop zone.
* **Manual Upload:** Click the **"Upload Images"** button to open the system file picker.
* *Note: Only original `.png` files contain the hidden metadata. Images converted to `.jpg` or downloaded from social media (Twitter/Discord) often have this data stripped.*

### Managing Your Session
* **Session Tab:** Shows all images currently loaded in memory. These vanish if you refresh the page.
* **Favorites Tab:** Click the **Save (Floppy Disk)** icon to persist an image. These are saved to the local database and will remain available even after you close the browser.
* **Deleting:** Click the **Trash** icon to remove an image from the current view. Deleting from "Favorites" permanently removes it from the local database.

### Advanced Tools
* **Copy Prompts:** Click the copy icon inside any prompt box to copy the text to your clipboard.
* **Raw JSON:** Click "Show Raw JSON" on any card to inspect the raw data structure for debugging or curiosity.
* **Download Vibe:** If an image used Vibe Transfer, a download button will appear to save the reconstruction data.

## 📂 Project Structure

* `src/workers/metadata.worker.js`: The core engine. Handles the heavy lifting of reading binary data, LSB extraction, and zlib decompression.
* `src/lib/db.js`: Manages the IndexedDB schema and the `normalizeMetadata` function that maps different NAI versions to a unified format.
* `src/components/MetadataGrid.jsx`: The main UI component for rendering image cards, including the logic for character prompts and Vibe sliders.

## 🤝 Contributing

Contributions are welcome! If you find a new NovelAI schema version that isn't parsing correctly:
1.  Fork the repository.
2.  Open an issue with the "Raw JSON" of the problematic image.
3.  Submit a Pull Request with the updated normalization logic.

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).