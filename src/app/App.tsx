import { RouterProvider } from 'react-router';
import { router } from './routes';
import Mitra from './components/Mitra';

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Mitra />
    </>
  );
}
