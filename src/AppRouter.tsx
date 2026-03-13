import { BrowserRouter, Route, Routes } from "react-router";
import Menu from "./Menu";
import HomePage from "./home/HomePage";
import WaterCanvas from "./water/water-caustic/WaterCanvas";
import WaterPage from "./water/home/WaterPage";

export default function AppRouter() {

  return (
    <BrowserRouter basename="/Creative-Coding">
      <Routes>
        <Route path="/" element={<Menu />}>
          <Route index element={<HomePage />} />
          <Route path="water">
            <Route index element={<WaterPage />} />
            <Route path="water-caustic" element={<WaterCanvas />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}