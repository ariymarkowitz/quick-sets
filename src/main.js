import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';
import { initTheme } from './lib/storage.js';

initTheme();

const app = mount(App, { target: document.getElementById('app') });
export default app;
