import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import Menu from "./Menu";
import HomePage from "./pages/home/HomePage";
import WaterCausticCanvas from "./pages/water/water-caustic/WaterCausticCanvas";
import WaterPage from "./pages/water/home/WaterPage";
import OceanWavesCanvas from "./pages/water/ocean-waves/OceanWavesCanvas";
import TestsPage from "./pages/tests/home/TestsPage";
import QuadTreeCanvas from "./pages/tests/quadtree/QuadTreeCanvas";
import SpacePage from "./pages/space/home/HomePage";
import GalaxyCanvas from "./pages/space/galaxy/GalaxyCanvas";
import WaterCausticExCanvas from "./pages/water/water-caustic-ex/WaterCausticEx";
import RenderingPage from "./pages/rendering/home/HomePage";
import PathTracingCanvas from "./pages/rendering/path-tracing/PathTracingCanvas";

export default function AppRouter() {

  return (
    <BrowserRouter basename={import.meta.env.VITE_PUBLIC_BASE_URL + '/'}>
      <Routes>
        <Route path="/" element={<Menu />}>
          <Route index element={<HomePage />} />
          <Route path="water">
            <Route index element={<WaterPage />} />
            <Route path="water-caustic" element={<WaterCausticCanvas />} />
            <Route path="water-caustic-ex" element={<WaterCausticExCanvas />} />
            <Route path="ocean-waves" element={<OceanWavesCanvas />} />
          </Route>
          <Route path="space">
            <Route index element={<SpacePage /> } />
            <Route path="galaxy" element={<GalaxyCanvas />} />
          </Route>
          <Route path="rendering">
            <Route index element={<RenderingPage /> } />
            <Route path="path-tracing" element={<PathTracingCanvas />} />
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