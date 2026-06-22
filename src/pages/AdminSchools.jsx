import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { 
  School, 
  Plus, 
  Edit, 
  Users, 
  BookOpen,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';

const AdminSchools = () => {
  const { toast } = useToast();
  
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSchool, setNewSchool] = useState({
    name: '',
    location: '',
    type: 'university',
    description: ''
  });

  // Mock data para demonstração
  useEffect(() => {
    setTimeout(() => {
      setSchools([
        {
          id: 1,
          name: 'Universidade Federal do Rio de Janeiro',
          location: 'Rio de Janeiro, RJ',
          type: 'university',
          students_count: 245,
          courses_count: 12,
          description: 'Instituição federal de ensino superior'
        },
        {
          id: 2,
          name: 'SENAI - Escola Técnica',
          location: 'São Paulo, SP',
          type: 'technical',
          students_count: 89,
          courses_count: 8,
          description: 'Escola técnica profissionalizante'
        },
        {
          id: 3,
          name: 'Instituto Federal de Educação',
          location: 'Belo Horizonte, MG',
          type: 'federal',
          students_count: 156,
          courses_count: 15,
          description: 'Instituto federal de educação, ciência e tecnologia'
        }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const handleAddSchool = async () => {
    if (!newSchool.name || !newSchool.location) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Nome e localização são obrigatórios.',
        variant: 'destructive'
      });
      return;
    }

    try {
      // TODO: Implementar chamada para API
      const schoolData = {
        ...newSchool,
        id: Date.now(),
        students_count: 0,
        courses_count: 0
      };
      
      setSchools(prev => [...prev, schoolData]);
      setNewSchool({ name: '', location: '', type: 'university', description: '' });
      setShowAddForm(false);
      
      toast({
        title: 'Escola adicionada',
        description: 'A escola foi adicionada com sucesso!'
      });
    } catch (error) {
      toast({
        title: 'Erro ao adicionar escola',
        description: 'Não foi possível adicionar a escola. Tente novamente.',
        variant: 'destructive'
      });
    }
  };

  const filteredSchools = schools.filter(school =>
    school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    school.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTypeLabel = (type) => {
    const types = {
      university: 'Universidade',
      technical: 'Escola Técnica',
      federal: 'Instituto Federal',
      private: 'Instituição Privada'
    };
    return types[type] || type;
  };

  const getTypeColor = (type) => {
    const colors = {
      university: 'bg-blue-50 text-blue-700 border-blue-200',
      technical: 'bg-green-50 text-green-700 border-green-200',
      federal: 'bg-purple-50 text-purple-700 border-purple-200',
      private: 'bg-orange-50 text-orange-700 border-orange-200'
    };
    return colors[type] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <Helmet>
        <title>Gerenciar Escolas - Admin CurriculoJá</title>
      </Helmet>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Gerenciar Escolas
              </h1>
              <p className="text-gray-600 text-lg">
                Adicione e gerencie escolas, cursos e alunos no sistema.
              </p>
            </div>
            
            <Button 
              onClick={() => setShowAddForm(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl px-6"
            >
              <Plus size={20} className="mr-2" />
              Adicionar Escola
            </Button>
          </div>
        </motion.div>

        {/* Filtros */}
        <motion.div 
          className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  placeholder="Buscar por nome ou localização..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 rounded-xl border-gray-200 focus:border-blue-300 focus:ring-blue-200"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Formulário de Adicionar Escola */}
        {showAddForm && (
          <motion.div
            className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mb-8"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Adicionar Nova Escola</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome da Escola *
                </label>
                <Input
                  value={newSchool.name}
                  onChange={(e) => setNewSchool(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nome da instituição"
                  className="rounded-xl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Localização *
                </label>
                <Input
                  value={newSchool.location}
                  onChange={(e) => setNewSchool(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Cidade, Estado"
                  className="rounded-xl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Instituição
                </label>
                <select
                  value={newSchool.type}
                  onChange={(e) => setNewSchool(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full h-12 px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-blue-300 focus:ring-blue-200 focus:outline-none text-sm"
                >
                  <option value="university">Universidade</option>
                  <option value="technical">Escola Técnica</option>
                  <option value="federal">Instituto Federal</option>
                  <option value="private">Instituição Privada</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição
                </label>
                <Input
                  value={newSchool.description}
                  onChange={(e) => setNewSchool(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Breve descrição da instituição"
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button 
                onClick={() => setShowAddForm(false)}
                variant="outline"
                className="rounded-2xl"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleAddSchool}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-2xl"
              >
                Adicionar Escola
              </Button>
            </div>
          </motion.div>
        )}

        {/* Lista de Escolas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredSchools.map((school, index) => (
            <motion.div
              key={school.id}
              className="bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-50 rounded-xl">
                      <School className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 line-clamp-2">
                        {school.name}
                      </h3>
                      <p className="text-sm text-gray-500">{school.location}</p>
                    </div>
                  </div>
                  <div className="relative">
                    <Button variant="ghost" size="sm" className="rounded-lg">
                      <MoreVertical size={16} />
                    </Button>
                  </div>
                </div>

                <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border mb-4 ${getTypeColor(school.type)}`}>
                  {getTypeLabel(school.type)}
                </div>

                {school.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {school.description}
                  </p>
                )}

                <div className="flex items-center justify-between mb-4">
                  <div className="flex gap-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-600">{school.students_count}</div>
                      <div className="text-xs text-gray-500">Alunos</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-600">{school.courses_count}</div>
                      <div className="text-xs text-gray-500">Cursos</div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 rounded-xl"
                  >
                    <Eye size={14} className="mr-1" />
                    Ver Detalhes
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="rounded-xl"
                  >
                    <Edit size={14} />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {filteredSchools.length === 0 && (
          <motion.div 
            className="text-center py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <School className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Nenhuma escola encontrada
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm 
                ? 'Nenhuma escola corresponde aos critérios de busca.'
                : 'Adicione a primeira escola ao sistema para começar.'
              }
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AdminSchools;
