import { LOGO_BASE64 } from './LogoData';

export default function Navbar() {
  return (
    <header className="bg-white border-b px-8 py-5 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <img 
          src={LOGO_BASE64} 
          alt="PARTH LACE Logo" 
          className="h-12 w-12 object-contain rounded-full"
        />
        <div>
          <h1 className="text-3xl font-bold text-slate-900 leading-none">
            PARTH LACE
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Manufacturing ERP
          </p>
        </div>
      </div>
    </header>
  );
}