import { defineConfig } from 'histoire'
import { HstVue } from '@histoire/plugin-vue'

export default defineConfig({
  plugins: [HstVue()],
  setupFile: '/stories/setup.ts',
  storyMatch: ['stories/**/*.story.vue'],
  outDir: '.histoire/dist',
  theme: {
    title: '@invadelol/ui',
    defaultColorScheme: 'dark',
    darkClass: 'dark',
  },
  backgroundPresets: [{ label: 'Page', color: 'transparent' }],
  responsivePresets: [
    { label: 'App window', width: 1280, height: 800 },
    { label: 'Laptop', width: 1440, height: 900 },
    { label: 'Tablet', width: 820, height: 1180 },
    { label: 'Phone', width: 390, height: 844 },
  ],
})
