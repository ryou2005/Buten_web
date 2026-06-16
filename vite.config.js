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

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: getHtmlInputs()
    }
  },
  server: {
    host: true,
  },
});

