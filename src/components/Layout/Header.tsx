export default function Header() {
  return (
    <header className="relative bg-white/95 backdrop-blur-xl border-b border-gray-200/50 px-8 py-6 shadow-lg">
      {/* Decorative gradient line */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600"></div>

      <div className="flex items-center justify-between">
        {/* Left side - Logo & Title */}
        <div className="flex items-center gap-5">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity duration-300"></div>
            <div className="relative w-14 h-14 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl flex items-center justify-center shadow-xl border-2 border-white">
              <span className="text-white text-2xl font-black">C</span>
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-700 bg-clip-text text-transparent tracking-tight">
              CCNA 200-301
            </h1>
            <p className="text-sm text-gray-500 font-medium mt-0.5">Exam Preparation Platform</p>
          </div>
        </div>

        {/* Right side - Status Badge */}
        <div className="flex items-center gap-4">
          <div className="group relative overflow-hidden px-6 py-3 bg-gradient-to-r from-blue-50 via-cyan-50 to-blue-50 rounded-xl border border-blue-200/50 shadow-md hover:shadow-lg transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-100/0 via-cyan-100/50 to-blue-100/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
            <div className="relative flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50"></div>
                <span className="text-sm font-bold text-gray-700">Active</span>
              </div>
              <div className="w-px h-5 bg-gray-300"></div>
              <span className="text-sm font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                Cisco Certified Network Associate
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
