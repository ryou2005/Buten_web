import { defineConfig } from "vite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dynamically scan the root directory for all HTML files
const getHtmlInputs = () => {
  const inputs = {};
  const files = fs.readdirSync(__dirname);
  files.forEach(file => {
    if (file.endsWith(".html")) {
      const name = path.basename(file, ".html");
      const key = name === "index" ? "main" : name;
      inputs[key] = path.resolve(__dirname, file);
    }
  });
  return inputs;
};

// images/ をそのまま dist/images/ にコピーする。
// トップのスライドは data-src で遅延読み込みするため、Vite が参照を検出できない。
// public/ ではなく直下に置くのは、Live Server でも同じパスで表示できるようにするため。
const copyImages = () => ({
  name: "copy-images",
  writeBundle(options) {
    fs.cpSync(path.resolve(__dirname, "images"), path.resolve(options.dir, "images"), { recursive: true });
  },
});

export default defineConfig({
  base: './',
  plugins: [copyImages()],
  build: {
    rollupOptions: {
      input: getHtmlInputs()
    }
  },
  server: {
    host: true,
  },
});

