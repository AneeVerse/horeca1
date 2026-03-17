'use client';

import React, { useState } from 'react';
import { ChevronLeft, Pencil, X } from 'lucide-react';

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
        <div className="fixed inset-0 z-[14000] flex items-start justify-center animate-in fade-in duration-200">
            {/* Desktop backdrop */}
            <div className="hidden md:block fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            {/* Panel */}
            <div className="w-full h-full md:h-auto md:max-h-[90vh] md:w-[560px] md:mt-[5vh] md:rounded-2xl md:shadow-2xl md:border md:border-gray-200 bg-white flex flex-col animate-in slide-in-from-right md:slide-in-from-bottom md:zoom-in-95 duration-300 relative z-10 overflow-hidden">
                {/* Header */}
                <div className="flex items-center px-4 md:px-6 py-3 md:py-4 shrink-0 relative border-b border-gray-100">
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-50 rounded-full transition-colors absolute left-4 md:hidden z-10"
                    >
                        <ChevronLeft size={22} className="text-[#181725]" />
                    </button>
                    <h2 className="w-full text-center md:text-left text-[16px] md:text-[20px] font-[800] text-[#181725]">Edit Profile</h2>
                    <button
                        onClick={onClose}
                        className="hidden md:flex p-2 hover:bg-gray-100 rounded-full transition-colors absolute right-4 z-10"
                    >
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Avatar Section */}
                <div className="flex flex-col items-center pt-6 pb-4 md:pt-8 md:pb-6">
                    <div className="relative mb-2">
                        <div className="w-[85px] h-[85px] md:w-[100px] md:h-[100px] rounded-full overflow-hidden border-[2.5px] border-[#53B175]">
                            <img
                                src="/images/profile/sample-profile.png"
                                alt="Profile"
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <button className="absolute bottom-0 right-0 w-7 h-7 md:w-8 md:h-8 bg-white rounded-full flex items-center justify-center border border-gray-100 shadow-sm hover:bg-gray-50 transition-colors">
                            <Pencil size={14} className="text-gray-400" />
                        </button>
                    </div>
                    <h3 className="text-[16px] md:text-[18px] font-[800] text-[#181725] mb-0.5">{fullName || 'User'}</h3>
                    <p className="text-[12px] md:text-[13px] text-gray-400 font-medium">+91 {phone}</p>
                </div>

                {/* Form Fields */}
                <div className="flex-1 overflow-y-auto px-5 md:px-8 pb-28 md:pb-6">
                    <div className="space-y-4 md:space-y-5">
                        <div>
                            <label className="text-[12px] md:text-[13px] font-semibold text-[#181725] ml-0.5 mb-1.5 block">Full name</label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full px-3.5 py-2.5 md:px-4 md:py-3 bg-white border border-gray-200 rounded-lg md:rounded-xl text-[13px] md:text-[14px] font-medium text-gray-500 outline-none focus:border-[#53B175] focus:ring-2 focus:ring-[#53B175]/10 transition-all"
                            />
                        </div>
                        <div>
                            <label className="text-[12px] md:text-[13px] font-semibold text-[#181725] ml-0.5 mb-1.5 block">Business Name</label>
                            <input
                                type="text"
                                value={businessName}
                                onChange={(e) => setBusinessName(e.target.value)}
                                className="w-full px-3.5 py-2.5 md:px-4 md:py-3 bg-white border border-gray-200 rounded-lg md:rounded-xl text-[13px] md:text-[14px] font-medium text-gray-500 outline-none focus:border-[#53B175] focus:ring-2 focus:ring-[#53B175]/10 transition-all"
                            />
                        </div>
                        <div>
                            <label className="text-[12px] md:text-[13px] font-semibold text-[#181725] ml-0.5 mb-1.5 block">Phone number</label>
                            <input
                                type="tel"
                                value={`+91 ${phone}`}
                                readOnly
                                className="w-full px-3.5 py-2.5 md:px-4 md:py-3 bg-gray-50 border border-gray-200 rounded-lg md:rounded-xl text-[13px] md:text-[14px] font-medium text-gray-400 outline-none cursor-not-allowed"
                            />
                        </div>
                        <div>
                            <label className="text-[12px] md:text-[13px] font-semibold text-[#181725] ml-0.5 mb-1.5 block">Address</label>
                            <input
                                type="text"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                className="w-full px-3.5 py-2.5 md:px-4 md:py-3 bg-white border border-gray-200 rounded-lg md:rounded-xl text-[13px] md:text-[14px] font-medium text-gray-500 outline-none focus:border-[#53B175] focus:ring-2 focus:ring-[#53B175]/10 transition-all mb-2"
                            />
                            <input
                                type="text"
                                value={address2}
                                onChange={(e) => setAddress2(e.target.value)}
                                className="w-full px-3.5 py-2.5 md:px-4 md:py-3 bg-white border border-gray-200 rounded-lg md:rounded-xl text-[13px] md:text-[14px] font-medium text-gray-500 outline-none focus:border-[#53B175] focus:ring-2 focus:ring-[#53B175]/10 transition-all"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3 md:gap-4">
                            <div>
                                <label className="text-[12px] md:text-[13px] font-semibold text-[#181725] ml-0.5 mb-1.5 block">Pincode</label>
                                <input
                                    type="text"
                                    value={pincode}
                                    onChange={(e) => setPincode(e.target.value)}
                                    className="w-full px-3.5 py-2.5 md:px-4 md:py-3 bg-white border border-gray-200 rounded-lg md:rounded-xl text-[13px] md:text-[14px] font-medium text-gray-500 outline-none focus:border-[#53B175] focus:ring-2 focus:ring-[#53B175]/10 transition-all"
                                />
                            </div>
                            <div>
                                <label className="text-[12px] md:text-[13px] font-semibold text-[#181725] ml-0.5 mb-1.5 block">City</label>
                                <input
                                    type="text"
                                    value={city}
                                    onChange={(e) => setCity(e.target.value)}
                                    className="w-full px-3.5 py-2.5 md:px-4 md:py-3 bg-white border border-gray-200 rounded-lg md:rounded-xl text-[13px] md:text-[14px] font-medium text-gray-500 outline-none focus:border-[#53B175] focus:ring-2 focus:ring-[#53B175]/10 transition-all"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div className="fixed md:static bottom-0 left-0 right-0 px-5 md:px-8 pt-3 pb-5 md:pb-6 bg-white md:border-t md:border-gray-100">
                    <button
                        onClick={handleSave}
                        className="w-full bg-[#53B175] hover:bg-[#48a068] text-white font-bold py-3.5 md:py-4 rounded-xl md:rounded-2xl active:scale-[0.98] transition-all text-[14px] md:text-[16px] shadow-lg shadow-green-100"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}
