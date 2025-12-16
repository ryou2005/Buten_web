import { defineConfig } from "vite";

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        class: 'class.html',
        instructors: 'instructors.html',
        access: 'access.html',
        contact: 'contact.html',
        admission: 'admission.html',
        schedule: 'schedule.html'
      }
    }
  },
  server: {
    host: true,
  },
});
