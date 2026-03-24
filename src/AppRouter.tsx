import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import Menu from "./Menu";
import HomePage from "./home/HomePage";
import WaterCausticCanvas from "./water/water-caustic/WaterCausticCanvas";
import WaterPage from "./water/home/WaterPage";
import OceanWavesCanvas from "./water/ocean-waves/OceanWavesCanvas";
import TestsPage from "./tests/home/TestsPage";
import QuadTreeCanvas from "./tests/quadtree/QuadTreeCanvas";

export default function AppRouter() {

  return (
    <BrowserRouter basename={import.meta.env.VITE_PUBLIC_BASE_URL + '/'}>
      <Routes>
        <Route path="/" element={<Menu />}>
          <Route index element={<HomePage />} />
          <Route path="water">
            <Route index element={<WaterPage />} />
            <Route path="water-caustic" element={<WaterCausticCanvas />} />
            <Route path="ocean-waves" element={<OceanWavesCanvas />} />
          </Route>
          <Route path="tests">
            <Route index element={<TestsPage /> } />
            <Route path="quadtree" element={<QuadTreeCanvas />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate replace to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}