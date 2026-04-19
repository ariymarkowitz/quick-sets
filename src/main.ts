import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';
import { initTheme } from './lib/storage.js';

initTheme();

const target = document.getElementById('app');
if (!target) throw new Error('#app element not found');

const app = mount(App, { target });
export default app;
