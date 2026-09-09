import React from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail } from 'lucide-react';

const Profile = () => {
    const { user } = useAuth();
    return (
        <div className="p-6 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2 mb-6"><User className="w-6 h-6 text-primary" /> Profile</h1>
            <div className="glass-card p-6">
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-3xl text-primary font-bold">{user?.name?.charAt(0)}</div>
                    <div><h2 className="text-xl font-semibold text-white">{user?.name}</h2><p className="text-gray-400 text-sm">{user?.role}</p></div>
                </div>
                <div className="space-y-3">
                    <div className="flex items-center gap-3 text-gray-300"><User className="w-4 h-4 text-gray-500" /> {user?.name}</div>
                    <div className="flex items-center gap-3 text-gray-300"><Mail className="w-4 h-4 text-gray-500" /> {user?.email}</div>
                </div>
            </div>
        </div>
    );
};

export default Profile;