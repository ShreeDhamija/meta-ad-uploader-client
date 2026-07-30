import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { AuthProvider, useAuth } from "./lib/AuthContext";
import { AppProvider } from "./lib/AppContext";
import { TikTokAuthProvider, useTikTokAuth } from "./lib/TikTokAuthContext";
import { PostHogProvider } from 'posthog-js/react'

import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
  useLocation,
} from "react-router-dom";

import App from "./App.jsx";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Login.jsx";
import Settings from "./pages/Settings.jsx";
import Analytics from "./pages/Analytics.jsx";
import CreativeStrategy from "./pages/CreativeStrategy.jsx";
import NotFound from "./pages/NotFound.jsx";
import TermsOfService from "./pages/Landing/TermsOfService.jsx";
import PrivacyPolicy from "./pages/Landing/PrivacyPolicy.jsx";
import TikTokAds from "./pages/TikTokAds.jsx";
import TikTokCallback from "./pages/TikTokCallback.jsx";
import TikTokLogin from "./pages/TikTokLogin.jsx";
import QaReview from "./pages/QaReview.jsx";

function TikTokRoute({ children, requireConnection = false }) {
  const location = useLocation()
  const { isLoggedIn, features } = useAuth()
  const { isTikTokLoggedIn, isLoading } = useTikTokAuth()

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  if (features.tiktokLauncher !== true) {
    return <Navigate to="/" replace />
  }
  if (requireConnection && isLoading) return null
  if (requireConnection && !isTikTokLoggedIn) {
    return <Navigate to="/tiktok-login" replace />
  }
  return children
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: "login", element: <Login /> },
      { path: "signup", element: <Signup /> },
      { path: "settings", element: <Settings /> },
      { path: "analytics", element: <Analytics /> },
      {
        path: "tiktok-settings",
        element: <TikTokRoute requireConnection><Settings platform="tiktok" /></TikTokRoute>,
      },
      {
        path: "tiktok-login",
        element: <TikTokRoute><TikTokLogin /></TikTokRoute>,
      },
      {
        path: "tiktok-ads",
        element: <TikTokRoute requireConnection><TikTokAds /></TikTokRoute>,
      },
      {
        path: "tiktok-callback",
        element: <TikTokRoute><TikTokCallback /></TikTokRoute>,
      },
      { path: "creative-strategy", element: <CreativeStrategy /> },
      { path: "terms-of-service", element: <TermsOfService /> },
      { path: "privacy-policy", element: <PrivacyPolicy /> },
      { path: "qa/:token", element: <QaReview /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);


const options = {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
  defaults: '2025-05-24',
}


createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <TikTokAuthProvider>
        <AppProvider>
          <PostHogProvider apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_KEY} options={options}>
            <RouterProvider router={router} />
          </PostHogProvider>
        </AppProvider>
      </TikTokAuthProvider>
    </AuthProvider>
  </StrictMode>
);
