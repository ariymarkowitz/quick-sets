import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';
import { getStoredTheme } from './lib/storage.js';

document.body.className = getStoredTheme();

const target = document.getElementById('app');
if (!target) throw new Error('#app element not found');

const app = mount(App, { target });
export default app;
