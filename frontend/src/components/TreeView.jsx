import React from 'react';
import { useParams } from 'react-router-dom';

const TreeView = () => {
  const { id } = useParams();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Family Tree #{id}</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Tree Visualization Coming Soon
              </h2>
              <p className="text-gray-600">
                This is where the interactive family tree will be displayed using React Flow
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TreeView;
