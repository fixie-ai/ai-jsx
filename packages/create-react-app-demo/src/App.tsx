import './App.css';
import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import RootLayout from './layout.tsx';
import { ChooseYourOwnAdventure } from './choose-your-adventure/index.tsx';
import RecipeWrapper from './recipe/page.tsx';

const router = createBrowserRouter([
  {
    path: '',
    element: <RootLayout />,
    children: [
      {
        path: '',
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
