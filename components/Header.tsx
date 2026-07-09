import React from 'react';
import { BookOpen, GraduationCap } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center text-primary">
              <GraduationCap className="h-8 w-8 mr-2" />
              <h1 className="text-xl font-bold tracking-tight text-gray-900">
                Informatikos DI <span className="text-primary">metodinė medžiaga</span>
              </h1>
            </div>
            <div className="hidden md:block ml-10">
              <a 
                href="https://emokykla.lt/bendrosios-programos/visos-bendrosios-programos/3?types=&clases=&educations=&st=1&ach-1=1&ach-2=1&ach-3=1&ach-4=1&ach-5=1&ach-6=1&ct=1&res=3"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full border border-blue-200 hover:bg-blue-100 transition-colors"
              >
                Lietuvos BP Pagalba
              </a>
            </div>
          </div>
          <div className="flex items-center space-x-4">
             <a 
                href="https://emokykla.lt/bendrosios-programos" 
                target="_blank" 
                rel="noreferrer"
                className="text-sm text-gray-500 hover:text-primary transition-colors flex items-center"
             >
                <BookOpen className="h-4 w-4 mr-1" />
                eMokykla
             </a>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;