import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Menu, X, User, Building2, LogOut, FileText, Search, Briefcase, Zap, Users, UserPlus, MessageSquare } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import Logo from './Logo';
import MessageIndicator from './MessageIndicator';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    user,
    logout,
    isCompany,
    isAdmin
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Verificar se estamos na página de empresas
  const isOnCompanyPage = location.pathname === '/company-landing' || location.pathname.includes('/company');
  
  const handleLogout = () => {
    logout();
    navigate('/');
    setIsOpen(false);
  };

  const menuItems = user ? isAdmin ? [{
    label: 'Dashboard Admin',
    path: '/admin-dashboard',
    icon: Users
  }, {
    label: 'Cadastrar Usuário',
    path: '/admin/register',
    icon: UserPlus
  }] : isCompany ? [{
    label: 'Página de Perfil',
    path: user ? `/company/${user.id}` : '/company',
    icon: Building2
  }, {
    label: 'Dashboard',
    path: '/company-dashboard',
    icon: Building2
  }, {
    label: 'Mensagens',
    path: '/company-messages',
    icon: MessageSquare
  }] : [{
    label: 'Criar Currículo',
    path: '/create-resume',
    icon: FileText
  }, {
    label: 'Meus Currículos',
    path: '/my-resumes',
    icon: User
  }, {
    label: 'Buscar Vagas',
    path: '/search-jobs',
    icon: Search
  }, {
    label: 'Jornada do Candidato',
    path: '/candidate-journey',
    icon: Zap
  }, {
    label: 'Mensagens',
    path: '/my-messages',
    icon: MessageSquare
  }] : [];

  return (
    <nav className="bg-white/90 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <motion.div 
            whileHover={{ scale: 1.05 }} 
            transition={{ type: "spring", stiffness: 300 }}
            className="flex-shrink-0"
          >
            <Link to="/" className="flex items-center h-full">
              <Logo size="md" animated={true} />
            </Link>
          </motion.div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-2 lg:space-x-4">
            {menuItems.map(item => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || 
                             (item.path === '/my-jobs' && location.pathname.includes('/candidates/')) ||
                             (item.path === '/my-resumes' && location.pathname.includes('/resume/')) ||
                             (item.path === '/admin-dashboard' && location.pathname.includes('/admin'));
              
              const isJourneyPage = item.path === '/candidate-journey';
              
              return (
                <motion.div key={item.path} whileHover={{ y: -2 }}>
                  <Link to={item.path} className={`flex items-center space-x-1 px-2 lg:px-4 py-2 rounded-full transition-all duration-300 font-medium text-sm lg:text-base ${
                    isActive 
                      ? isJourneyPage 
                        ? 'text-yellow-600 bg-yellow-50 shadow-sm border-2 border-yellow-200' 
                        : 'text-blue-600 bg-blue-50 shadow-sm border-2 border-blue-200'
                      : isJourneyPage
                        ? 'text-gray-600 hover:text-yellow-600 hover:bg-yellow-50'
                        : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                  }`}>
                    <motion.div
                      whileTap={{ 
                        scale: [1, 1.2, 0.9, 1.1, 1],
                        rotate: [0, 5, -3, 2, 0]
                      }}
                      transition={{ 
                        type: "spring", 
                        stiffness: 400,
                        damping: 10,
                        duration: 0.4
                      }}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                    </motion.div>
                    <span className="hidden lg:inline">{item.label}</span>
                    <span className="lg:hidden text-xs truncate max-w-16">{item.label.split(' ')[0]}</span>
                  </Link>
                </motion.div>
              );
            })}

            {/* User Actions */}
            <div className="flex items-center space-x-2 lg:space-x-3 border-l border-gray-200 pl-2 lg:pl-4">
              {user ? (
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                    {(user.name || user.companyName || 'U').charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden lg:inline text-sm text-gray-600 truncate max-w-24">
                    {user.name || user.companyName}
                  </span>
                  <motion.div whileHover={{ y: -2 }}>
                    <Button onClick={handleLogout} variant="outline" size="sm" className="flex items-center space-x-1 rounded-full text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 transition-all duration-300 p-2 lg:px-4">
                      <motion.div
                        whileTap={{ 
                          scale: [1, 1.2, 0.9, 1.1, 1],
                          rotate: [0, 5, -3, 2, 0]
                        }}
                        transition={{ 
                          type: "spring", 
                          stiffness: 400,
                          damping: 10,
                          duration: 0.4
                        }}
                      >
                        <LogOut className="w-4 h-4" />
                      </motion.div>
                      <span className="hidden lg:inline">Sair</span>
                    </Button>
                  </motion.div>
                </div>
                      }}
                    >
                      <LogOut className="w-4 h-4" />
                    </motion.div>
                    <span className="hidden lg:inline">Sair</span>
                  </Button>
                </motion.div>
              </div>
            ) : (
              <div className="flex items-center space-x-1 lg:space-x-2">
                {isOnCompanyPage ? (
                  <Link to="/">
                    <Button variant="ghost" size="sm" className="flex items-center space-x-1 rounded-full hover:bg-blue-50 hover:text-blue-600 p-2 lg:px-4">
                      <User className="w-4 h-4" />
                      <span className="hidden lg:inline">Sou um aluno</span>
                    </Button>
                  </Link>
                ) : (
                  <Link to="/company-landing">
                    <Button variant="ghost" size="sm" className="flex items-center space-x-1 rounded-full hover:bg-blue-50 hover:text-blue-600 p-2 lg:px-4">
                      <Building2 className="w-4 h-4" />
                      <span className="hidden lg:inline">Para Empresas</span>
                    </Button>
                  </Link>
                )}
                <Link to="/login">
                  <Button variant="outline" size="sm" className="rounded-full border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white px-3 lg:px-4">
                    <span className="hidden sm:inline">Entrar</span>
                    <span className="sm:hidden">Login</span>
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center space-x-2">
            {/* Message indicator para mobile */}
            {user && user.type === 'candidate' && <MessageIndicator />}
            
            {/* User avatar para mobile */}
            {user && (
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                {(user.name || user.companyName || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            
            <motion.button onClick={() => setIsOpen(!isOpen)} className="text-gray-600 hover:text-blue-600 transition-colors p-2 rounded-full hover:bg-blue-50"
              whileTap={{ scale: 0.95 }}
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && <motion.div initial={{
      opacity: 0,
      y: -10
    }} animate={{
      opacity: 1,
      y: 0
    }} exit={{
      opacity: 0,
      y: -10
    }} className="md:hidden bg-white/90 backdrop-blur-md border-t border-gray-200/50">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {menuItems.map(item => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || 
                         (item.path === '/my-jobs' && location.pathname.includes('/candidates/')) ||
                         (item.path === '/my-resumes' && location.pathname.includes('/resume/')) ||
                         (item.path === '/admin-dashboard' && location.pathname.includes('/admin'));
          
          return <Link key={item.path} to={item.path} onClick={() => setIsOpen(false)} className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
            isActive 
              ? 'text-blue-600 bg-blue-50 border-l-4 border-blue-600' 
              : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
          }`}>
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>;
        })}
            
            {user ? (
              <div className="border-t pt-2">
                <div className="px-3 py-2 text-sm text-gray-600">
                  {user.name || user.companyName}
                </div>
                <motion.button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 w-full px-3 py-2 text-left text-red-600 hover:bg-red-600 hover:text-white rounded-md transition-colors"
                  whileTap={{ scale: 0.95 }}
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sair</span>
                </motion.button>
              </div>
            ) : (
              <div className="border-t pt-2 space-y-1">
                {isOnCompanyPage ? (
                  <Link 
                    to="/" 
                    onClick={() => setIsOpen(false)} 
                    className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors rounded-lg"
                  >
                    <User className="w-4 h-4" />
                    <span>Sou um aluno</span>
                  </Link>
                ) : (
                  <Link 
                    to="/company-landing" 
                    onClick={() => setIsOpen(false)} 
                    className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors rounded-lg"
                  >
                    <Building2 className="w-4 h-4" />
                    <span>Para Empresas</span>
                  </Link>
                )}
                <Link to="/login" onClick={() => setIsOpen(false)} className="block px-3 py-2 text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors rounded-lg">
                  Entrar
                </Link>
              </div>
            )}
          </div>
        </motion.div>}
    </nav>
  );
};

export default Navbar;