import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
// Import này CHỈ tồn tại trong project build app thật (không có trong bản xem trước Claude).
// Tác dụng: đăng ký plugin thông báo với Capacitor để window.Capacitor.Plugins.LocalNotifications
// có sẵn khi App.jsx gọi tới (App.jsx không import trực tiếp để không phá bản xem trước trong Claude).
import "@capacitor/local-notifications";
import "@capacitor/app";
import "@capacitor-community/admob";
import "@codetrix-studio/capacitor-google-auth";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
