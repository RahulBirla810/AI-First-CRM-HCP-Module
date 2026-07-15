import React, { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { fetchMetadata } from './store';
import Layout from './components/Layout';
import StructuredForm from './components/StructuredForm';
import AIAssistant from './components/AIAssistant';
import InteractionHistory from './components/InteractionHistory';
import MaterialModal from './components/MaterialModal';
import SampleModal from './components/SampleModal';

export default function App() {
  const dispatch = useDispatch();

  // Load catalogs on load
  useEffect(() => {
    dispatch(fetchMetadata());
  }, [dispatch]);

  // Catalog Add Modals
  const [materialModalOpen, setMaterialModalOpen] = useState(false);
  const [sampleModalOpen, setSampleModalOpen] = useState(false);

  return (
    <Layout
      onAddMaterial={() => setMaterialModalOpen(true)}
      onAddSample={() => setSampleModalOpen(true)}
    >
      <Routes>
        <Route
          path="/"
          element={
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-160px)]">
              {/* Left Side: Structured Form */}
              <div className="h-full">
                <StructuredForm />
              </div>
              {/* Right Side: AI Assistant */}
              <div className="h-full">
                <AIAssistant />
              </div>
            </div>
          }
        />
        <Route path="/history" element={<InteractionHistory />} />
      </Routes>

      {/* Catalog Addition Modals */}
      <MaterialModal
        isOpen={materialModalOpen}
        onClose={() => setMaterialModalOpen(false)}
      />
      <SampleModal
        isOpen={sampleModalOpen}
        onClose={() => setSampleModalOpen(false)}
      />
    </Layout>
  );
}
