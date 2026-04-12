import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import "@fontsource/cairo/400.css";
import "@fontsource/cairo/700.css";
import './styles/index.css';
import './styles/print.css';
import './styles/style.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { WorkspaceProvider } from '@/contexts/WorkspaceContext';
import { CaseProvider } from '@/contexts/CaseContext';

const container = document.getElementById('root');
const root = createRoot(container);

if ('serviceWorker' in navigator) {
	window.addEventListener('load', () => {
		navigator.serviceWorker.register('/sw.js')
			.then(() => console.log('SW registered'))
			.catch((err) => console.warn('SW failed:', err));
	});
}

root.render(
	<AuthProvider>
		<WorkspaceProvider>
			<CaseProvider>
				<App />
			</CaseProvider>
		</WorkspaceProvider>
	</AuthProvider>
);
