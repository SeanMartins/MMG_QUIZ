import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './index.css';
import { AuthProvider, useAuth } from './AuthContext.jsx';
import QuizList from './pages/QuizList.jsx';
import QuizEditor from './pages/QuizEditor.jsx';
import HostGame from './pages/HostGame.jsx';
import Join from './pages/Join.jsx';
import Play from './pages/Play.jsx';
import Login from './pages/Login.jsx';

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return children;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <QuizList />
              </RequireAuth>
            }
          />
          <Route
            path="/quiz/:id"
            element={
              <RequireAuth>
                <QuizEditor />
              </RequireAuth>
            }
          />
          <Route path="/host/:code" element={<HostGame />} />
          <Route path="/join" element={<Join />} />
          <Route path="/join/:code" element={<Join />} />
          <Route path="/play/:code" element={<Play />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
