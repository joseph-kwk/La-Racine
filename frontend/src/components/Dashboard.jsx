import React from 'react';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { logout, user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">La Racine</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome back!</span>
              <button
                onClick={logout}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Your Family Trees
              </h2>
              <p className="text-gray-600 mb-8">
                Start building your family history
              </p>
              <button className="bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-700">
                Create New Tree
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
