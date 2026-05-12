import { Route, Routes } from 'react-router-dom';
import { CardPage, LandingPage, NotFoundPage } from '@presentation/pages';

export const AppRouter = () => (
  <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/card/:month/:day" element={<CardPage />} />
    <Route path="*" element={<NotFoundPage />} />
  </Routes>
);
