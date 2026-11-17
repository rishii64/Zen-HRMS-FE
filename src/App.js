// src/App.js
import React from "react";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from 'react-hot-toast';

// Components
import AppNavbar from "./components/layout/Navbar";
import AppRoute from "./routes/AppRoute";
import RoleUpdatedModal from "./components/common/RoleUpdatedModal";

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" reverseOrder={false} containerStyle={{fontSize: "12px"}} />
      <RoleUpdatedModal />
      <AppNavbar />
      <AppRoute />
    </BrowserRouter>
  );
}

export default App;
