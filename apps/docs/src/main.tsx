import { createRoot } from 'react-dom/client';
import '@fontsource-variable/plus-jakarta-sans';
import '@fontsource-variable/jetbrains-mono';
import '@unipo/ui/scss';
import './docs.scss';
import { App } from './App';

createRoot(document.getElementById('root')!).render(<App />);
