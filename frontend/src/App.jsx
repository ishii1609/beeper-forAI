
import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./Components/ProtectedRoute";
import RunPage from './pages/RunCode'
import Signup from './pages/SignupPage'
import Login from './pages/LoginPage'
import Compare from './pages/ComparePage'

export default function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
    
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <RunPage />
              </ProtectedRoute>
            }
          />

           <Route
            path="/compare"
            element={
              <ProtectedRoute>
                <Compare />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
        </Routes>
      </main>
    </div>
  );
}