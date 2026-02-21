'use client';

import React from 'react';
import Link from 'next/link';
import {
    ChevronLeft,
    Star,
    MapPin,
    Mail,
    Phone,
    TrendingUp,
    Facebook,
    Instagram,
    Twitter,
    MessageCircle,
    Globe,
    Package,
    ShoppingCart,
    Users,
    UserPlus,
    Heart,
    BarChart3,
    ChevronDown,
    CheckCircle2,
    Clock,
    XCircle,
    ArrowRight,
    MoreVertical
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { motion, useInView, useSpring, useTransform, useMotionValue } from 'framer-motion';

const AnimatedCounter = ({ value, className = "" }: { value: string | number, className?: string }) => {
    const ref = React.useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-50px" });
    const motionValue = useMotionValue(0);
    const springValue = useSpring(motionValue, { damping: 30, stiffness: 60 });

    // Parse value (e.g., "+2.9k" -> 2900)
    const strValue = String(value);
    const isK = strValue.toLowerCase().includes('k');
    const isPlus = strValue.includes('+');
    const isDollar = strValue.includes('$');
    const numericValue = parseFloat(strValue.replace(/[^0-9.]/g, '')) * (isK ? 1000 : 1);

    const displayValue = useTransform(springValue, (latest) => {
        if (isK && latest >= 1000) {
            return (isPlus ? '+' : '') + (isDollar ? '$' : '') + (latest / 1000).toFixed(1) + 'k';
        }
        return (isPlus ? '+' : '') + (isDollar ? '$' : '') + Math.floor(latest).toLocaleString();
    });

    React.useEffect(() => {
        if (isInView) {
            motionValue.set(numericValue);
        }
    }, [isInView, numericValue, motionValue]);

    return <motion.span ref={ref} className={className}>{displayValue}</motion.span>;
};

const ChartWrapper = ({ data }: { data: any[] }) => {
    const ref = React.useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });

    return (
        <div ref={ref} className="w-full h-full">
            {isInView && (
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#299E60" stopOpacity={0.15} /><stop offset="95%" stopColor="#299E60" stopOpacity={0} /></linearGradient>
                            <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#F59E0B" stopOpacity={0.1} /><stop offset="95%" stopColor="#F59E0B" stopOpacity={0} /></linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#7C7C7C' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#7C7C7C' }} tickFormatter={v => `${v / 1000}k`} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                        <Area type="natural" dataKey="expenses" stroke="#299E60" fill="url(#incGrad)" strokeWidth={3} dot={false} animationDuration={1500} />
                        <Area type="natural" dataKey="income" stroke="#F59E0B" fill="url(#expGrad)" strokeWidth={3} dot={false} animationDuration={1500} />
                    </AreaChart>
                </ResponsiveContainer>
            )}
        </div>
    );
};

const MONTHLY_REVENUE_DATA = [
    { month: 'Jan', income: 17000, expenses: 12600 },
    { month: 'Feb', income: 26500, expenses: 17200 },
    { month: 'Mar', income: 19200, expenses: 17400 },
    { month: 'Apr', income: 52500, expenses: 17200 },
    { month: 'May', income: 17500, expenses: 15000 },
    { month: 'Jun', income: 16200, expenses: 45400 },
    { month: 'Jul', income: 80200, expenses: 51800 },
    { month: 'Aug', income: 16300, expenses: 16200 },
    { month: 'Sep', income: 99800, expenses: 40800 },
    { month: 'Oct', income: 17200, expenses: 16800 },
    { month: 'Nov', income: 24800, expenses: 89800 },
    { month: 'Dec', income: 18500, expenses: 17200 },
];

const STAR_RATINGS = [
    { stars: 5, percentage: 85 },
    { stars: 4, percentage: 70 },
    { stars: 3, percentage: 50 },
    { stars: 2, percentage: 25 },
    { stars: 1, percentage: 12 },
];

const LATEST_PRODUCTS = [
    {
        name: 'Black T-shirt',
        variants: 4,
        tagId: 'ID46765',
        category: 'Fashion',
        addDate: '08/05/2023',
        status: 'Published',
        image: '/images/admin/vendors/vendor-details/p-1.png',
    },
    {
        name: 'Olive Green Leather Bag',
        variants: 2,
        tagId: 'ID36192',
        category: 'Hand Bag',
        addDate: '10/05/2023',
        status: 'Pending',
        image: '/images/admin/vendors/vendor-details/p-2.png',
    },
    {
        name: 'Women Golden Dress',
        variants: 5,
        tagId: 'ID37729',
        category: 'Fashion',
        addDate: '20/05/2023',
        status: 'Published',
        image: '/images/admin/vendors/vendor-details/p-3.png',
    },
    {
        name: 'Gray Cap For Men',
        variants: 3,
        tagId: 'ID09260',
        category: 'Cap',
        addDate: '21/05/2023',
        status: 'Published',
        image: '/images/admin/vendors/vendor-details/p-4.png',
    },
    {
        name: 'Dark Green Cargo Pant',
        variants: 6,
        tagId: 'ID24109',
        category: 'Fashion',
        addDate: '23/05/2023',
        status: 'Draft',
        image: '/images/admin/vendors/vendor-details/p-5.png',
    },
];

const VENDORS: Record<string, {
    name: string;
    subtitle: string;
    category: string;
    website: string;
    rating: number;
    reviews: string;
    address: string;
    email: string;
    phone: string;
    revenue: string;
    revenueProgress: number;
    stock: string;
    sells: string;
    happyClients: string;
    followers: string;
    logo: string;
    story: string;
    mission: string;
    profitCategories: { name: string; amount: string; progress: number; color: string }[];
}> = {
    'zara-international': {
        name: 'ZARA International',
        subtitle: 'Most Selling Fashion Brand',
        category: 'Fashion',
        website: 'www.zara.com',
        rating: 4.5,
        reviews: '23.3K Review',
        address: '4604, Philli Lane Kiowa IN 47404',
        email: 'zarafashionworld@dayrep.com',
        phone: '+243 812-801-9335',
        revenue: '$200k',
        revenueProgress: 65,
        stock: '865',
        sells: '+4.5k',
        happyClients: '+2k',
        followers: '+36k',
        logo: '/images/admin/vendors/zara.svg',
        story: 'At ZARA, we believe that fashion is more than just clothing – it\'s an expression of individuality and a celebration of diversity. Founded in 2003, our journey began with a simple yet powerful vision: to create high quality, stylish, and comfortable apparel that resonates with people from all walks of life.',
        mission: 'Our mission is to redefine fashion by merging timeless elegance with contemporary design. We strive to offer clothing that not only looks good but also feels good, making everyday wear an enjoyable experience. At the heart of our brand is a commitment to quality, sustainability, and customer satisfaction.',
        profitCategories: [
            { name: "Man's Wares", amount: '$123k', progress: 85, color: '#299E60' },
            { name: "Woman's Wares", amount: '$233k', progress: 70, color: '#F59E0B' },
            { name: "Kid's Wares", amount: '$110k', progress: 55, color: '#3B82F6' },
            { name: 'Foot Wares', amount: '$51k', progress: 40, color: '#10B981' },
        ]
    },
    'rolex-watches': {
        name: 'Rolex Watches',
        subtitle: 'Premium Watch Brand',
        category: 'Watch',
        website: 'www.rolex.com',
        rating: 4.5,
        reviews: '1.2K Review',
        address: '1678 Avenue Milwaukee, WI 53202',
        email: 'rolexwatches@dayrep.com',
        phone: '+243 252-223-1454',
        revenue: '$349k',
        revenueProgress: 75,
        stock: '261',
        sells: '+2.9k',
        happyClients: '+1.4k',
        followers: '+28k',
        logo: '/images/admin/vendors/rolex.svg',
        story: 'Rolex has been synonymous with precision and luxury since its founding. Every timepiece is a masterwork of engineering and design, crafted to perfection with the finest materials.',
        mission: 'To create watches that represent the pinnacle of Swiss craftsmanship. Each Rolex is designed to be a lifelong companion, combining functionality with uncompromising elegance.',
        profitCategories: [
            { name: 'Luxury Watches', amount: '$189k', progress: 90, color: '#299E60' },
            { name: 'Sport Watches', amount: '$95k', progress: 60, color: '#F59E0B' },
            { name: 'Accessories', amount: '$42k', progress: 35, color: '#3B82F6' },
            { name: 'Limited Edition', amount: '$23k', progress: 25, color: '#10B981' },
        ]
    },
    'dyson-machinery': {
        name: 'Dyson Machinery',
        subtitle: 'Leading Electronics Brand',
        category: 'Electronics',
        website: 'www.dyson.com',
        rating: 4.1,
        reviews: '3.7K Review',
        address: '23 Cubbine Road GHOOLI WA 6426',
        email: 'dysonmachine@dayrep.com',
        phone: '+81(08) 9059 8047',
        revenue: '$545k',
        revenueProgress: 85,
        stock: '781',
        sells: '+5.3k',
        happyClients: '+3.1k',
        followers: '+42k',
        logo: '/images/admin/vendors/dyson.svg',
        story: 'Dyson is a technology company that solves problems others ignore. We engineer solutions that improve everyday life through innovative design and cutting-edge technology.',
        mission: 'To solve problems that others seem to ignore, with patented technology that works differently. Our machines are engineered to be more efficient, more effective and longer lasting.',
        profitCategories: [
            { name: 'Vacuum Cleaners', amount: '$210k', progress: 80, color: '#299E60' },
            { name: 'Air Purifiers', amount: '$165k', progress: 65, color: '#F59E0B' },
            { name: 'Hair Care', amount: '$98k', progress: 45, color: '#3B82F6' },
            { name: 'Lighting', amount: '$72k', progress: 35, color: '#10B981' },
        ]
    },
    'gopro-camera': {
        name: 'GoPro Camera',
        subtitle: 'Action Camera Pioneer',
        category: 'Electronics',
        website: 'www.gopro.com',
        rating: 4.3,
        reviews: '7.2K Review',
        address: '5 Gaffney Street MIDDLE PARK VIC 3206',
        email: 'goprocamera@dayrep.com',
        phone: '+81(08) 6727 4227',
        revenue: '$465k',
        revenueProgress: 70,
        stock: '890',
        sells: '+10.6k',
        happyClients: '+6.1k',
        followers: '+55k',
        logo: '/images/admin/vendors/gopro.svg',
        story: 'GoPro helps people capture and share their lives\' most meaningful experiences. From action-packed adventures to everyday moments, our cameras are designed to be versatile and durable.',
        mission: 'To enable people to celebrate the moment, be it an extreme adventure or a family gathering, with the world\'s most versatile cameras and accessories.',
        profitCategories: [
            { name: 'Action Cameras', amount: '$245k', progress: 85, color: '#299E60' },
            { name: 'Accessories', amount: '$120k', progress: 55, color: '#F59E0B' },
            { name: 'Mounts & Grips', amount: '$65k', progress: 40, color: '#3B82F6' },
            { name: 'Subscription', amount: '$35k', progress: 20, color: '#10B981' },
        ]
    },
};

const VENDOR_SLUGS = [
    'zara-international',
    'rolex-watches',
    'dyson-machinery',
    'gopro-camera',
];

export default function VendorDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const vendorId = params.id as string;

    const vendor = VENDORS[vendorId] || VENDORS[VENDOR_SLUGS[0]];

    if (!vendor) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <p className="text-[#7C7C7C] text-[16px] font-bold">Vendor not found</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-10">
            {/* Header / Breadcrumbs */}
            <div className="flex items-center gap-2 text-[14px] text-[#4B4B4B]">
                <button onClick={() => router.back()} className="hover:text-[#299E60] flex items-center gap-1 transition-colors">
                    <ChevronLeft size={16} />
                    Back
                </button>
                <span className="text-gray-300">|</span>
                <Link href="/admin/vendors" className="hover:text-[#299E60] transition-colors">Sellers</Link>
                <span className="text-gray-300">{'>'}</span>
                <span className="font-bold text-[#181725]">Seller Details</span>
            </div>

            {/* Top Section */}
            <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm overflow-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                    <div className="p-8 flex gap-6">
                        <div className="shrink-0">
                            <div className="w-[140px] h-[140px] rounded-[16px] bg-[#F1F4F9] flex items-center justify-center p-4">
                                <img src={vendor.logo} alt={vendor.name} className="w-[100px] h-[100px] object-contain" />
                            </div>
                            <button className="mt-4 w-full bg-[#299E60] text-white py-2.5 rounded-[10px] text-[13px] font-bold hover:bg-[#238a54] transition-all shadow-sm">
                                View Stock Detail
                            </button>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-[22px] font-extrabold text-[#181725] leading-tight">{vendor.name}</h2>
                            <p className="text-[13px] text-[#7C7C7C] font-medium mt-0.5">({vendor.subtitle})</p>
                            <Link href="#" className="text-[14px] font-bold text-[#299E60] hover:underline mt-1 block">
                                {vendor.website}
                            </Link>
                            <div className="flex items-center gap-2 mt-3">
                                <div className="flex items-center gap-0.5">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <Star key={star} size={16} fill={star <= vendor.rating ? '#F59E0B' : 'none'} className={star <= vendor.rating ? 'text-[#F59E0B]' : 'text-[#E5E7EB]'} />
                                    ))}
                                </div>
                                <span className="text-[14px] font-bold text-[#181725]">{vendor.rating}/5</span>
                                <span className="text-[13px] text-[#7C7C7C] font-medium">({vendor.reviews})</span>
                            </div>
                            <div className="space-y-3 mt-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-[30px] h-[30px] rounded-full bg-[#EEF8F1] flex items-center justify-center text-[#299E60] shrink-0">
                                        <MapPin size={14} />
                                    </div>
                                    <span className="text-[13px] font-bold text-[#4B4B4B]">{vendor.address}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-[30px] h-[30px] rounded-full bg-[#EEF8F1] flex items-center justify-center text-[#299E60] shrink-0">
                                        <Mail size={14} />
                                    </div>
                                    <span className="text-[13px] font-bold text-[#4B4B4B]">{vendor.email}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-[30px] h-[30px] rounded-full bg-[#EEF8F1] flex items-center justify-center text-[#299E60] shrink-0">
                                        <Phone size={14} />
                                    </div>
                                    <span className="text-[13px] font-bold text-[#4B4B4B]">{vendor.phone}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="p-8 border-l border-[#EEEEEE]">
                        <h3 className="text-[18px] font-extrabold text-[#181725] mb-6">Profit by Product Category</h3>
                        <div className="space-y-5">
                            {vendor.profitCategories.map((cat, idx) => (
                                <div key={idx}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[14px] font-bold text-[#181725]">{cat.name}</span>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[14px] font-bold text-[#181725]">{cat.amount}</span>
                                            <TrendingUp size={14} className="text-[#299E60]" />
                                        </div>
                                    </div>
                                    <div className="h-[8px] w-full bg-[#F5F5F5] rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            whileInView={{ width: `${cat.progress}%` }}
                                            viewport={{ once: true }}
                                            transition={{ duration: 1.2, ease: "easeOut" }}
                                            className="h-full rounded-full relative"
                                            style={{ backgroundColor: cat.color }}
                                        >
                                            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(45deg, #fff 25%, transparent 25%, transparent 50%, #fff 50%, #fff 75%, transparent 75%, transparent)', backgroundSize: '10px 10px' }}></div>
                                        </motion.div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Social Media */}
            <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm p-8">
                <h3 className="text-[16px] font-extrabold text-[#181725] mb-4">Social Media :</h3>
                <div className="flex items-center gap-3">
                    {[
                        { icon: Facebook, color: '#1877F2', bg: '#EBF3FE' },
                        { icon: Instagram, color: '#E4405F', bg: '#FDE8ED' },
                        { icon: Twitter, color: '#1DA1F2', bg: '#E8F5FE' },
                        { icon: MessageCircle, color: '#25D366', bg: '#E6F9ED' },
                        { icon: Mail, color: '#299E60', bg: '#EEF8F1' },
                    ].map((social, idx) => (
                        <button key={idx} className="w-[38px] h-[38px] rounded-full flex items-center justify-center transition-all hover:scale-110 hover:shadow-md" style={{ backgroundColor: social.bg, color: social.color }}>
                            <social.icon size={18} />
                        </button>
                    ))}
                </div>
            </div>

            {/* Story & Mission */}
            <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm p-8">
                <div className="mb-6">
                    <h3 className="text-[16px] font-extrabold text-[#181725] mb-3">Our Story :</h3>
                    <p className="text-[14px] text-[#4B4B4B] font-medium leading-[1.8]">{vendor.story}</p>
                </div>
                <div>
                    <h3 className="text-[16px] font-extrabold text-[#181725] mb-3">Our Mission :</h3>
                    <p className="text-[14px] text-[#4B4B4B] font-medium leading-[1.8]">{vendor.mission}</p>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Item Stock', value: vendor.stock, icon: Package, color: '#299E60' },
                    { label: 'Sells', value: vendor.sells, icon: ShoppingCart, color: '#F59E0B' },
                    { label: 'Happy Client', value: vendor.happyClients, icon: Users, color: '#299E60' },
                    { label: 'Followers', value: vendor.followers, icon: Heart, color: '#F59E0B' },
                ].map((stat, idx) => (
                    <div key={idx} className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm overflow-hidden hover:shadow-md transition-all group">
                        <div className="h-[3px] w-full" style={{ backgroundColor: stat.color }}></div>
                        <div className="p-6 text-center">
                            <div className="w-[44px] h-[44px] rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform" style={{ backgroundColor: `${stat.color}15`, color: stat.color }}>
                                <stat.icon size={20} />
                            </div>
                            <h4 className="text-[20px] font-[900] text-[#181725] leading-none">
                                <AnimatedCounter value={stat.value} />
                            </h4>
                            <p className="text-[12px] font-bold text-[#AEAEAE] mt-2 uppercase tracking-wider">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Revenue Chart + Reviews */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                <div className="xl:col-span-8 bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm p-8">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <div className="flex items-center gap-3">
                                <h3 className="text-[28px] font-[900] text-[#181725] tracking-tight">$5,563,786</h3>
                                <span className="bg-[#EEF8F1] text-[#299E60] text-[12px] font-[800] px-2.5 py-1 rounded-md flex items-center gap-1">
                                    <TrendingUp size={12} /> +4.53%
                                </span>
                            </div>
                            <p className="text-[13px] text-[#299E60] font-bold mt-1">Gained $378.56 This Month !</p>
                        </div>
                        <div className="w-[48px] h-[48px] rounded-[12px] bg-[#EEF8F1] flex items-center justify-center text-[#299E60]">
                            <BarChart3 size={24} />
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
                        <ChartWrapper data={MONTHLY_REVENUE_DATA} />
                    </div>
                </div>
                <div className="xl:col-span-4 bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm p-8">
                    <h3 className="text-[18px] font-extrabold text-[#181725] text-center mb-6">Company Reviews</h3>
                    <div className="flex items-center justify-center gap-3 bg-[#EEF8F1] rounded-[12px] py-3 px-5 mb-4 mx-auto max-w-[280px]">
                        <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map(s => <Star key={s} size={18} fill={s <= vendor.rating ? '#F59E0B' : 'none'} className={s <= vendor.rating ? 'text-[#F59E0B]' : 'text-[#E5E7EB]'} />)}
                        </div>
                        <span className="text-[16px] font-[900] text-[#181725]">{vendor.rating} Out of 5</span>
                    </div>
                    <div className="space-y-4 mt-8">
                        {STAR_RATINGS.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-4">
                                <span className="text-[14px] font-bold text-[#181725] w-[55px]">{item.stars} star :</span>
                                <div className="flex-1 h-[8.5px] bg-[#F5F5F5] rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        whileInView={{ width: `${item.percentage}%` }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 1, ease: "easeOut", delay: idx * 0.1 }}
                                        className="h-full rounded-full bg-[#F59E0B]"
                                    ></motion.div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Product Table + Revenue Sidebar */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                <div className="xl:col-span-8 bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm overflow-hidden">
                    <div className="p-6 flex items-center justify-between border-b border-[#EEEEEE]">
                        <h3 className="text-[18px] font-extrabold text-[#181725]">Latest Added Product</h3>
                        <button className="flex items-center gap-2 text-[13px] font-bold text-[#4B4B4B] border border-[#EEEEEE] rounded-lg px-4 py-2">
                            This Month <ChevronDown size={14} />
                        </button>
                    </div>
                    <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-[#FAFAFA] border-b border-[#EEEEEE] text-[12px] font-bold text-[#AEAEAE] uppercase">
                        <div className="col-span-1"><input type="checkbox" className="w-4 h-4" /></div>
                        <div className="col-span-3">Product Name</div>
                        <div className="col-span-2">Tag ID</div>
                        <div className="col-span-2">Category</div>
                        <div className="col-span-2">Add Date</div>
                        <div className="col-span-2">Status</div>
                    </div>
                    {LATEST_PRODUCTS.map((p, i) => (
                        <div key={i} className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-[#F5F5F5] items-center hover:bg-[#FAFAFA] transition-colors">
                            <div className="col-span-1"><input type="checkbox" className="w-4 h-4" /></div>
                            <div className="col-span-3 flex items-center gap-3">
                                <div className="w-[44px] h-[44px] rounded-[10px] bg-[#F1F4F9] overflow-hidden">
                                    <img src={p.image} className="w-full h-full object-cover" />
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-[14px] font-bold text-[#1B2559] truncate hover:underline cursor-pointer">{p.name}</p>
                                    <p className="text-[11px] text-[#AEAEAE]">Variants : {p.variants}</p>
                                </div>
                            </div>
                            <div className="col-span-2 text-[13px] font-bold text-[#4B4B4B]">{p.tagId}</div>
                            <div className="col-span-2 text-[13px] font-bold text-[#4B4B4B]">{p.category}</div>
                            <div className="col-span-2 text-[13px] font-bold text-[#4B4B4B]">{p.addDate}</div>
                            <div className="col-span-2">
                                {p.status === 'Published' ? (
                                    <span className="inline-flex items-center gap-1 bg-[#E6F9ED] text-[#299E60] text-[11px] font-[900] px-2.5 py-1.5 rounded-[6px] uppercase">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12l4 4 10-10" /><path d="M9 12l4 4 10-10" transform="translate(-4, 0)" /></svg>
                                        Published
                                    </span>
                                ) : p.status === 'Pending' ? (
                                    <span className="inline-flex items-center gap-2 bg-[#F1F4F9] text-[#1B2559] text-[11px] font-[900] px-2.5 py-1.5 rounded-[6px] uppercase">
                                        <span className="w-[8px] h-[8px] rounded-full bg-[#1B2559]"></span> Pending
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 bg-[#FDE2E2] text-[#EF4444] text-[11px] font-[900] px-2.5 py-1.5 rounded-[6px] uppercase">
                                        <Clock size={12} strokeWidth={3.5} /> Draft
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="xl:col-span-4 flex flex-col gap-6">
                    <div className="bg-[#1B2537] rounded-[16px] p-7 relative overflow-hidden min-h-[220px]">


                        {/* Spirograph Pattern */}
                        <div className="absolute top-0 -right-4 w-[200px] h-[200px] opacity-30 pointer-events-none">
                            <svg viewBox="0 0 200 200" className="w-full h-full">
                                {Array.from({ length: 40 }).map((_, i) => (
                                    <ellipse
                                        key={i}
                                        cx="150"
                                        cy="100"
                                        rx="80"
                                        ry="40"
                                        fill="none"
                                        stroke="#F59E0B"
                                        strokeWidth="0.5"
                                        transform={`rotate(${i * 9} 150 100)`}
                                    />
                                ))}
                            </svg>
                        </div>

                        <div className="relative z-10 transition-all duration-500">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-[54px] h-[54px] rounded-[14px] bg-[#2E3748] flex items-center justify-center text-white text-[18px] font-black shadow-lg">1</div>
                                    <h3 className="text-[17px] font-extrabold text-white">Accounting Revenue</h3>
                                </div>
                                <MoreVertical size={20} className="text-white/40 cursor-pointer hover:text-white transition-colors" />
                            </div>
                            <h2 className="text-[34px] font-[900] text-[#F59E0B] mb-2 tracking-tight">$5,324,000</h2>
                            <p className="text-[13.5px] text-white/50 leading-relaxed mb-6 font-medium">Accounting revenue refers to the income earned by a company recorded in its books...</p>
                            <div className="flex items-center gap-2">
                                <span className="text-[16px] font-extrabold text-white">+870</span>
                                <span className="text-[14px] font-bold text-[#A3AED0]">Customers</span>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-5">
                        <div className="bg-white rounded-[16px] border border-[#EEEEEE] shadow-sm p-6 text-center">
                            <p className="text-[14px] font-bold text-[#1B2559] mb-4">Orders</p>
                            <div className="w-[48px] h-[48px] rounded-[12px] bg-[#FFF3E0] flex items-center justify-center text-[#F59E0B] mx-auto mb-4">
                                <ShoppingCart size={22} />
                            </div>
                            <h4 className="text-[26px] font-[900] mb-1"><AnimatedCounter value={458} /></h4>
                            <p className="text-[12px] text-[#AEAEAE] font-bold mb-4">60% Target</p>
                            <div className="h-[8px] bg-gray-100 rounded-full overflow-hidden mb-5">
                                <motion.div
                                    initial={{ width: 0 }}
                                    whileInView={{ width: '60%' }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 1.2, ease: "easeOut" }}
                                    className="h-full bg-[#F59E0B]"
                                ></motion.div>
                            </div>
                            <button className="text-[13px] font-bold flex items-center gap-1.5 mx-auto">View More <ArrowRight size={14} /></button>
                        </div>
                        <div className="bg-white rounded-[16px] border border-[#EEEEEE] shadow-sm p-6 text-center">
                            <p className="text-[14px] font-bold text-[#1B2559] mb-4">Users</p>
                            <div className="w-[48px] h-[48px] rounded-[12px] bg-[#EEF8F1] flex items-center justify-center text-[#299E60] mx-auto mb-4">
                                <UserPlus size={22} />
                            </div>
                            <h4 className="text-[26px] font-[900] mb-1"><AnimatedCounter value={870} /></h4>
                            <p className="text-[12px] text-[#AEAEAE] font-bold mb-4">80% Target</p>
                            <div className="h-[8px] bg-gray-100 rounded-full overflow-hidden mb-5">
                                <motion.div
                                    initial={{ width: 0 }}
                                    whileInView={{ width: '80%' }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 1.2, ease: "easeOut" }}
                                    className="h-full bg-[#299E60]"
                                ></motion.div>
                            </div>
                            <button className="text-[13px] font-bold flex items-center gap-1.5 mx-auto">View More <ArrowRight size={14} /></button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
