export default function Processing() {
    return (    
        <div className="min-h-screen w-full flex flex-col items-center justify-center px-4 relative overflow-hidden" style={{backgroundColor: '#FAFAFA'}}>
            {/* Content */}
            <div className="relative z-10 flex flex-col items-center gap-8">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-center" style={{color: '#1A1A1A', fontFamily: 'DM Sans, sans-serif'}}>
                    Processing Photo...
                </h1>
                
                {/* Modern Spinner */}
                <div className="relative">
                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-gray-200"></div>
                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-t-black absolute top-0 left-0 animate-spin" style={{borderTopColor: '#1A1A1A'}}></div>
                </div>

                <p className="text-lg md:text-xl text-center mt-4" style={{color: '#4A4A4A', fontFamily: 'DM Sans, sans-serif'}}>
                    This won't take long...
                </p>
            </div>

            <style>{`
                @keyframes float {
                    0%, 100% {
                        transform: translateY(0px) rotate(var(--rotate));
                    }
                    50% {
                        transform: translateY(-20px) rotate(var(--rotate));
                    }
                }

                @keyframes float-delayed {
                    0%, 100% {
                        transform: translateY(0px) rotate(var(--rotate));
                    }
                    50% {
                        transform: translateY(-15px) rotate(var(--rotate));
                    }
                }

                .animate-float {
                    animation: float 4s ease-in-out infinite;
                }

                .animate-float-delayed {
                    animation: float-delayed 5s ease-in-out infinite;
                }

                @keyframes spin {
                    from {
                        transform: rotate(0deg);
                    }
                    to {
                        transform: rotate(360deg);
                    }
                }

                .animate-spin {
                    animation: spin 1s linear infinite;
                }
            `}</style>
        </div>
    )
}