// src/App.js
import React from "react";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from 'react-hot-toast';

// Components
import AppNavbar from "./components/layout/Navbar";
import AppRoute from "./routes/AppRoute";

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" reverseOrder={false} />
      <AppNavbar />
      <AppRoute />
    </BrowserRouter>
  );
}

export default App;
