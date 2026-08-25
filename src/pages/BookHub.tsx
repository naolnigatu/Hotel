import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Calendar, Users, ArrowRight, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

export default function BookHub() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="bg-neutral-50 min-h-screen py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center text-neutral-500 hover:text-neutral-900 mb-8 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back
        </button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-neutral-900 mb-4">Make a Reservation</h1>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            What would you like to book today? We offer luxurious rooms for your stay and spacious halls for your events.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Room Booking Card */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
            <Link 
              to="/book-room"
              className="block group bg-white rounded-2xl border-2 border-neutral-200 hover:border-neutral-900 transition-all p-8 shadow-sm hover:shadow-md h-full flex flex-col"
            >
              <div className="w-14 h-14 bg-neutral-100 group-hover:bg-neutral-900 rounded-2xl flex items-center justify-center mb-6 transition-colors">
                <Building2 className="w-7 h-7 text-neutral-600 group-hover:text-white transition-colors" />
              </div>
              <h2 className="text-2xl font-bold text-neutral-900 mb-3">Book a Room</h2>
              <p className="text-neutral-600 mb-8 flex-1">
                Reserve a comfortable room or suite for your stay. Choose from our various categories tailored to your needs.
              </p>
              <div className="flex items-center text-neutral-900 font-semibold group-hover:underline">
                Continue to Room Reservation
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </motion.div>

          {/* Hall Booking Card */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <Link 
              to="/halls"
              className="block group bg-white rounded-2xl border-2 border-neutral-200 hover:border-neutral-900 transition-all p-8 shadow-sm hover:shadow-md h-full flex flex-col"
            >
              <div className="w-14 h-14 bg-neutral-100 group-hover:bg-neutral-900 rounded-2xl flex items-center justify-center mb-6 transition-colors">
                <Users className="w-7 h-7 text-neutral-600 group-hover:text-white transition-colors" />
              </div>
              <h2 className="text-2xl font-bold text-neutral-900 mb-3">Book a Hall</h2>
              <p className="text-neutral-600 mb-8 flex-1">
                Reserve a venue for your wedding, conference, or special event. View our halls and submit a reservation request.
              </p>
              <div className="flex items-center text-neutral-900 font-semibold group-hover:underline">
                View Halls & Request Reservation
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
