import { PostHogProvider } from 'posthog-js/react';
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { AppProvider } from "./lib/AppContext";
import { AuthProvider } from "./lib/AuthContext";
import { TikTokAuthProvider } from "./lib/TikTokAuthContext";

import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";

import App from "./App.jsx";
import Analytics from "./pages/Analytics.jsx";
import Home from "./pages/Home.jsx";
import PrivacyPolicy from "./pages/Landing/PrivacyPolicy.jsx";
import TermsOfService from "./pages/Landing/TermsOfService.jsx";
import { default as Login, default as Signup } from "./pages/Login.jsx";
import NotFound from "./pages/NotFound.jsx";
import Settings from "./pages/Settings.jsx";
import TikTokAds from "./pages/TikTokAds.jsx";
import TikTokCallback from "./pages/TikTokCallback.jsx";
import TikTokLogin from "./pages/TikTokLogin.jsx";

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
      { path: "tiktok-login", element: <TikTokLogin /> },
      { path: "tiktok-signup", element: <TikTokLogin /> },
      { path: "tiktok-ads", element: <TikTokAds /> },
      { path: "tiktok-callback", element: <TikTokCallback /> },
      { path: "terms-of-service", element: <TermsOfService /> },
      { path: "privacy-policy", element: <PrivacyPolicy /> },
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
