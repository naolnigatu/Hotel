import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-neutral-50 px-4">
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-9xl font-bold text-neutral-200">404</h1>
        </motion.div>
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h2 className="text-3xl font-bold text-neutral-900 mt-4 mb-2">Page Not Found</h2>
          <p className="text-neutral-600 mb-8 max-w-md mx-auto">
            We're sorry, the page you're looking for doesn't exist or has been moved.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={() => window.history.back()}
              className="flex items-center gap-2 px-6 py-3 bg-white border border-neutral-200 text-neutral-700 rounded-lg font-medium hover:bg-neutral-50 transition-colors w-full sm:w-auto justify-center"
            >
              <ArrowLeft className="w-5 h-5" />
              Go Back
            </button>
            <Link 
              to="/" 
              className="flex items-center gap-2 px-6 py-3 bg-neutral-900 text-white rounded-lg font-medium hover:bg-neutral-800 transition-colors w-full sm:w-auto justify-center"
            >
              <Home className="w-5 h-5" />
              Back to Home
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
