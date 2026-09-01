import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import QuizList from './pages/QuizList.jsx';
import QuizEditor from './pages/QuizEditor.jsx';
import HostGame from './pages/HostGame.jsx';
import Join from './pages/Join.jsx';
import Play from './pages/Play.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<QuizList />} />
        <Route path="/quiz/:id" element={<QuizEditor />} />
        <Route path="/host/:code" element={<HostGame />} />
        <Route path="/join" element={<Join />} />
        <Route path="/join/:code" element={<Join />} />
        <Route path="/play/:code" element={<Play />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
