'use client';

import React, { useRef, useEffect, useCallback } from 'react';

export function TrustedBy() {
    // Each logo gets a tailored container (w × h) so they all look
    // the same visual weight despite different aspect ratios.
    const logos = [
        { name: 'McCain', src: '/images/trusted-by/McCain-Foods-Logo.png', cls: 'w-[38px] h-[24px] md:w-[68px] md:h-[42px]' },
        { name: 'Golden Crown', src: '/images/trusted-by/Golden-crown-logo.png', cls: 'w-[38px] h-[24px] md:w-[68px] md:h-[42px]' },
        { name: 'ITC', src: '/images/trusted-by/itc-limited-logo-png-transparent.png', cls: 'w-[20px] h-[22px] md:w-[36px] md:h-[40px]' },
        { name: 'Veeba', src: '/images/trusted-by/veeba.png', cls: 'w-[50px] h-[14px] md:w-[90px] md:h-[26px]' },
        { name: 'Everest', src: '/images/trusted-by/everest-spices-logo.png', cls: 'w-[50px] h-[14px] md:w-[90px] md:h-[26px]' },
        { name: 'Amul', src: '/images/trusted-by/amul-logo.png', cls: 'w-[50px] h-[16px] md:w-[90px] md:h-[28px]' },
        { name: 'Monin', src: '/images/trusted-by/monin-logo.png', cls: 'w-[50px] h-[14px] md:w-[90px] md:h-[26px]' },
        { name: 'Barilla', src: '/images/trusted-by/barilla.png', cls: 'w-[40px] h-[16px] md:w-[70px] md:h-[28px]' },
        { name: 'Lee Kum Kee', src: '/images/trusted-by/lee-kum-kee-logo-png_new.png', cls: 'w-[24px] h-[24px] md:w-[42px] md:h-[42px]' },
    ];

    const scrollRef = useRef<HTMLDivElement>(null);
    const firstSetRef = useRef<HTMLDivElement>(null);
    const offsetRef = useRef(0);
    const rafRef = useRef<number>(0);
    const speed = 0.5;

    const animate = useCallback(() => {
        if (!scrollRef.current || !firstSetRef.current) return;
        const firstSetWidth = firstSetRef.current.offsetWidth;
        offsetRef.current -= speed;
        if (Math.abs(offsetRef.current) >= firstSetWidth) {
            offsetRef.current += firstSetWidth;
        }
        scrollRef.current.style.transform = `translateX(${offsetRef.current}px)`;
        rafRef.current = requestAnimationFrame(animate);
    }, []);

    useEffect(() => {
        rafRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(rafRef.current);
    }, [animate]);

    const LogoItem = ({ logo }: { logo: typeof logos[0] }) => (
        <div className={`flex-shrink-0 ${logo.cls} flex items-center justify-center mx-3 md:mx-5`}>
            <img
                src={logo.src}
                alt={logo.name}
                className="max-w-full max-h-full object-contain"
            />
        </div>
    );

    return (
        <section className="py-6 bg-white overflow-hidden">
            <div className="fluid-container">
                <h2
                    style={{ fontFamily: "'Poppins', sans-serif" }}
                    className="text-[16px] md:text-[24px] font-bold text-[#181725] mb-5 leading-[100%] tracking-[0%]"
                >
                    Trusted By
                </h2>

                <div className="relative w-full overflow-hidden">
                    <div ref={scrollRef} className="flex will-change-transform">
                        <div ref={firstSetRef} className="flex items-center flex-shrink-0">
                            {logos.map((logo, index) => (
                                <LogoItem key={`a-${index}`} logo={logo} />
                            ))}
                        </div>
                        {[1, 2, 3, 4, 5].map((setIndex) => (
                            <div key={setIndex} className="flex items-center flex-shrink-0">
                                {logos.map((logo, index) => (
                                    <LogoItem key={`${setIndex}-${index}`} logo={logo} />
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
