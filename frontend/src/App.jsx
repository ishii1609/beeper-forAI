import { Routes, Route, useLocation } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
 import LandingPage from "./pages/Landingpage.jsx";
import ChatPage from "./pages/ChatPage.jsx";
import RunPage from "./pages/RunCode.jsx";
import ComparePage from "./pages/ComparePage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import SignupPage from "./pages/SignupPage.jsx";

const protect = (page) => <ProtectedRoute>{page}</ProtectedRoute>;

export default function App() {
  const { pathname } = useLocation();
  const wide = pathname.startsWith("/chat");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <main className={`mx-auto px-4 py-8 ${wide ? "max-w-6xl" : "max-w-3xl"}`}>
        <Routes>
          {<Route path="/" element={<LandingPage />} /> }
          <Route path="/chat/:id?" element={protect(<ChatPage />)} />
          <Route path="/review" element={protect(<RunPage />)} />
          <Route path="/compare" element={protect(<ComparePage />)} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
        </Routes>
      </main>
    </div>
  );
}