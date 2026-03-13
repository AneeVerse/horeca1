'use client';

import React, { useState } from 'react';
import { ChevronLeft, Pencil } from 'lucide-react';

interface EditProfileOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    userData: {
        fullName: string;
        phone: string;
        businessName: string;
        address: string;
        address2: string;
        pincode: string;
        city: string;
    };
    onSave: (data: EditProfileOverlayProps['userData']) => void;
}

export function EditProfileOverlay({ isOpen, onClose, userData, onSave }: EditProfileOverlayProps) {
    const [fullName, setFullName] = useState(userData.fullName);
    const [businessName, setBusinessName] = useState(userData.businessName);
    const [phone] = useState(userData.phone);
    const [address, setAddress] = useState(userData.address);
    const [address2, setAddress2] = useState(userData.address2);
    const [pincode, setPincode] = useState(userData.pincode);
    const [city, setCity] = useState(userData.city);

    if (!isOpen) return null;

    const handleSave = () => {
        onSave({ fullName, phone, businessName, address, address2, pincode, city });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[13500] bg-white flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex items-center px-4 py-3 shrink-0 relative border-b border-gray-50">
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-gray-50 rounded-full transition-colors absolute left-4 z-10"
                >
                    <ChevronLeft size={22} className="text-[#181725]" />
                </button>
                <h2 className="w-full text-center text-[16px] font-[800] text-[#181725]">Edit Profile</h2>
            </div>

            {/* Avatar Section */}
            <div className="flex flex-col items-center pt-6 pb-4">
                <div className="relative mb-2">
                    <div className="w-[85px] h-[85px] rounded-full overflow-hidden border-[2.5px] border-[#53B175]">
                        <img
                            src="/images/profile/sample-profile.png"
                            alt="Profile"
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <button className="absolute bottom-0 right-0 w-7 h-7 bg-white rounded-full flex items-center justify-center border border-gray-100 shadow-sm">
                        <Pencil size={14} className="text-gray-400" />
                    </button>
                </div>
                <h3 className="text-[16px] font-[800] text-[#181725] mb-0.5">{fullName || 'User'}</h3>
                <p className="text-[12px] text-gray-400 font-medium">+91 {phone}</p>
            </div>

            {/* Form Fields */}
            <div className="flex-1 overflow-y-auto px-5 pb-28">
                <div className="space-y-4">
                    {/* Full Name */}
                    <div>
                        <label className="text-[12px] font-semibold text-[#181725] ml-0.5 mb-1 block">Full name</label>
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-[13px] font-medium text-gray-500 outline-none focus:border-[#53B175] transition-colors"
                        />
                    </div>

                    {/* Business Name */}
                    <div>
                        <label className="text-[12px] font-semibold text-[#181725] ml-0.5 mb-1 block">Business Name</label>
                        <input
                            type="text"
                            value={businessName}
                            onChange={(e) => setBusinessName(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-[13px] font-medium text-gray-500 outline-none focus:border-[#53B175] transition-colors"
                        />
                    </div>

                    {/* Phone Number */}
                    <div>
                        <label className="text-[12px] font-semibold text-[#181725] ml-0.5 mb-1 block">Phone number</label>
                        <input
                            type="tel"
                            value={`+91 ${phone}`}
                            readOnly
                            className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-[13px] font-medium text-gray-400 outline-none cursor-not-allowed"
                        />
                    </div>

                    {/* Address */}
                    <div>
                        <label className="text-[12px] font-semibold text-[#181725] ml-0.5 mb-1 block">Address</label>
                        <input
                            type="text"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-[13px] font-medium text-gray-500 outline-none focus:border-[#53B175] transition-colors mb-2"
                        />
                        <input
                            type="text"
                            value={address2}
                            onChange={(e) => setAddress2(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-[13px] font-medium text-gray-500 outline-none focus:border-[#53B175] transition-colors"
                        />
                    </div>

                    {/* Pincode & City */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[12px] font-semibold text-[#181725] ml-0.5 mb-1 block">Pincode</label>
                            <input
                                type="text"
                                value={pincode}
                                onChange={(e) => setPincode(e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-[13px] font-medium text-gray-500 outline-none focus:border-[#53B175] transition-colors"
                            />
                        </div>
                        <div>
                            <label className="text-[12px] font-semibold text-[#181725] ml-0.5 mb-1 block">&nbsp;</label>
                            <input
                                type="text"
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-[13px] font-medium text-gray-500 outline-none focus:border-[#53B175] transition-colors"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Save Button - Fixed Bottom */}
            <div className="fixed bottom-0 left-0 right-0 px-5 pt-3 pb-5 bg-white">
                <button
                    onClick={handleSave}
                    className="w-full bg-[#53B175] hover:bg-[#48a068] text-white font-bold py-3.5 rounded-xl active:scale-[0.98] transition-all text-[14px]"
                >
                    Save
                </button>
            </div>
        </div>
    );
}
