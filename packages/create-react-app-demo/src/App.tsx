import './App.css';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import RootLayout from './layout.tsx';
import BasicCompletion from './basic-completion/index.tsx';
import { ChooseYourOwnAdventure } from './choose-your-adventure/index.tsx';
import RecipeWrapper from './recipe/page.tsx';
import { BasicChat } from './basic-chat/index.tsx';
import { DocsChat } from './docs-chat/index.tsx';

const router = createBrowserRouter([
  {
    path: '',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/basic-completion" replace />,
      },
      {
        path: '/basic-completion',
        element: <BasicCompletion />,
      },
      {
        path: '/basic-chat',
        element: <BasicChat />,
      },
      {
        path: '/docs-chat',
        element: <DocsChat />,
      },
      {
        path: '/choose-your-own-adventure',
        element: <ChooseYourOwnAdventure />,
      },
      {
        path: '/recipe',
        element: <RecipeWrapper />,
      },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
