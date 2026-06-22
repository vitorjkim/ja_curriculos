import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { 
  Users, 
  Building2, 
  UserPlus, 
  FileSpreadsheet, 
  Trash2, 
  Search,
  Download,
  Upload,
  UserX,
  UserCheck,
  Edit,
  Save,
  X,
  RefreshCw,
  GraduationCap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { createTemplate } from '@/lib/excelTemplate';
import { usersAPI, authAPI } from '@/lib/api';
import * as XLSX from 'xlsx';

const AdminDashboard = () => {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [editForm, setEditForm] = useState({
    name: '',
    companyName: '',
    schoolName: '',
    schoolType: '',
    schoolCity: '',
    email: '',
    phone: '',
    cpf: '',
    cnpj: '',
    type: '',
    password: '',
    isAgency: false
  });
  const [editLicenses, setEditLicenses] = useState({ studentsLimit: '', featuredStudentsLimit: '' });
  const [licensesLoading, setLicensesLoading] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    candidates: 0,
    companies: 0,
    admins: 0,
    activeUsers: 0,
    disabledUsers: 0
  });
  const [offlineMode, setOfflineMode] = useState(false);

  // Formatação de telefone (BR)
  const formatPhoneBR = (value) => {
    if (!value) return '';
    let digits = String(value).replace(/\D/g, '');
    if (digits.length > 11 && digits.startsWith('55')) digits = digits.slice(2);
    digits = digits.slice(0, 11);
    if (digits.length === 0) return '';
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0,2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`;
    return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
  };

  const handlePhoneInputChange = (e) => {
    const formatted = formatPhoneBR(e.target.value);
    setEditForm(prev => ({ ...prev, phone: formatted }))
  };

  // Verificar se o usuário é admin
  useEffect(() => {
    if (loading) return; // esperar auth inicial finalizar
    if (!user) {
      return navigate('/login');
    }
    if (!isAdmin) {
      toast({
        title: 'Acesso negado',
        description: 'Apenas administradores podem acessar esta página.',
        variant: 'destructive'
      });
      navigate('/');
    }
  }, [user, isAdmin, navigate, loading]);

  // Carregar usuários
  useEffect(() => {
    loadUsers();
  }, []);

  // Auto-atualização a cada 10 segundos para dados em tempo real
  useEffect(() => {
    const interval = setInterval(() => {
      loadUsers();
    }, 10000); // 10 segundos para atualização mais frequente

    return () => clearInterval(interval);
  }, []); // Remover dependência para evitar loops

  // Filtrar usuários
  useEffect(() => {
    let filtered = users;

    if (searchTerm) {
      filtered = filtered.filter(user => 
        (user.name || user.companyName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(user => user.type === filterType);
    }

    if (filterStatus !== 'all') {
      if (filterStatus === 'active') {
        filtered = filtered.filter(user => !user.disabled);
      } else if (filterStatus === 'disabled') {
        filtered = filtered.filter(user => user.disabled);
      }
    }

    setFilteredUsers(filtered);
  }, [users, searchTerm, filterType, filterStatus]);

  const loadUsers = async () => {
    try {
      const response = await usersAPI.list({
        page: 1,
        limit: 1000, // Carregar todos os usuários para o admin
        ...(filterType !== 'all' && { type: filterType }),
        ...(filterStatus !== 'all' && { status: filterStatus }),
        ...(searchTerm && { search: searchTerm })
      });

      setUsers(response.users || []);
      setStats(response.stats || {
        totalUsers: 0,
        candidates: 0,
        companies: 0,
        schools: 0,
        admins: 0,
        activeUsers: 0,
        disabledUsers: 0
      });
      if ((response.users || []).length === 0 && response.stats && response.stats.totalUsers === 0) {
        setOfflineMode(true);
      } else {
        setOfflineMode(false);
      }
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      toast({
        title: 'Erro ao carregar dados',
        description: error.message || 'Não foi possível carregar os usuários.',
        variant: 'destructive'
      });
      
      // Fallback para localStorage se API não estiver disponível
      const localUsers = JSON.parse(localStorage.getItem('curriculoja_users') || '[]');
      if (localUsers.length > 0) {
        setUsers(localUsers);
        const stats = {
          totalUsers: localUsers.length,
          candidates: localUsers.filter(u => u.type === 'candidate').length,
          companies: localUsers.filter(u => u.type === 'company').length,
          schools: localUsers.filter(u => u.type === 'school').length,
          admins: localUsers.filter(u => u.type === 'admin').length,
          activeUsers: localUsers.filter(u => !u.disabled).length,
          disabledUsers: localUsers.filter(u => u.disabled).length
        };
        setStats(stats);
      }
    }
  };

  // Função para atualização manual
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Simular um pequeno delay para feedback visual
      await new Promise(resolve => setTimeout(resolve, 500));
      loadUsers();
      toast({
        title: 'Dados atualizados',
        description: 'As informações foram atualizadas com sucesso.'
      });
    } catch (error) {
      toast({
        title: 'Erro na atualização',
        description: 'Não foi possível atualizar os dados.',
        variant: 'destructive'
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Funções de seleção múltipla
  const handleSelectUser = (userId, checked) => {
    if (checked) {
      setSelectedUsers(prev => [...prev, userId]);
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    }
  };

  const handleSelectAll = (checked) => {
    setSelectAll(checked);
    if (checked) {
      // Selecionar todos os usuários filtrados, exceto o próprio admin
      const selectableUsers = filteredUsers.filter(u => u.id !== user.id);
      setSelectedUsers(selectableUsers.map(u => u.id));
    } else {
      setSelectedUsers([]);
    }
  };

  // Limpar seleção quando filtros mudam
  useEffect(() => {
    setSelectedUsers([]);
    setSelectAll(false);
  }, [filteredUsers]);

  // Ações em lote
  const handleBulkDelete = async () => {
    if (selectedUsers.length === 0) {
      toast({
        title: 'Nenhum usuário selecionado',
        description: 'Selecione pelo menos um usuário para excluir.',
        variant: 'destructive'
      });
      return;
    }

    const confirmMessage = `Tem certeza que deseja excluir ${selectedUsers.length} usuário(s)?`;
    if (window.confirm(confirmMessage)) {
      try {
        await usersAPI.bulkAction('delete', selectedUsers);
        
        setSelectedUsers([]);
        setSelectAll(false);
        
        // Recarregar dados
        await loadUsers();
        
        toast({
          title: 'Usuários excluídos',
          description: `${selectedUsers.length} usuário(s) foram removidos do sistema.`
        });
      } catch (error) {
        console.error('Erro ao excluir usuários:', error);
        toast({
          title: 'Erro na exclusão',
          description: error.message || 'Não foi possível excluir os usuários.',
          variant: 'destructive'
        });
      }
    }
  };

  const handleBulkToggleStatus = async (disable = true) => {
    if (selectedUsers.length === 0) {
      toast({
        title: 'Nenhum usuário selecionado',
        description: `Selecione pelo menos um usuário para ${disable ? 'desabilitar' : 'habilitar'}.`,
        variant: 'destructive'
      });
      return;
    }

    try {
      const action = disable ? 'disable' : 'enable';
      await usersAPI.bulkAction(action, selectedUsers);

      setSelectedUsers([]);
      setSelectAll(false);
      
      // Recarregar dados
      await loadUsers();
      
      toast({
        title: `Usuários ${disable ? 'desabilitados' : 'habilitados'}`,
        description: `${selectedUsers.length} usuário(s) foram ${disable ? 'desabilitados' : 'habilitados'}.`
      });
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast({
        title: 'Erro na operação',
        description: error.message || 'Não foi possível alterar o status dos usuários.',
        variant: 'destructive'
      });
    }
  };

  const handleToggleUserStatus = async (userId, disable) => {
    try {
      await usersAPI.toggleStatus(userId, disable);
      
      // Recarregar dados após alteração
      await loadUsers();
      
      const targetUser = users.find(u => u.id === userId);
      const userName = targetUser?.name || targetUser?.companyName || targetUser?.email;
      
      toast({
        title: `Usuário ${disable ? 'desabilitado' : 'habilitado'}`,
        description: `${userName} foi ${disable ? 'desabilitado' : 'habilitado'}.`
      });
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast({
        title: 'Erro na operação',
        description: error.message || 'Não foi possível alterar o status do usuário.',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteUser = async (userId) => {
    if (userId === user.id) {
      toast({
        title: 'Erro',
        description: 'Você não pode deletar sua própria conta.',
        variant: 'destructive'
      });
      return;
    }

    const targetUser = users.find(u => u.id === userId);
    const userName = targetUser?.name || targetUser?.companyName || targetUser?.email;

    if (window.confirm(`Tem certeza que deseja deletar o usuário ${userName}?`)) {
      try {
        await usersAPI.delete(userId);
        
        // Recarregar dados após exclusão
        await loadUsers();
        
        toast({
          title: 'Usuário deletado',
          description: `${userName} foi removido do sistema.`
        });
      } catch (error) {
        console.error('Erro ao deletar usuário:', error);
        toast({
          title: 'Erro na exclusão',
          description: error.message || 'Não foi possível deletar o usuário.',
          variant: 'destructive'
        });
      }
    }
  };

  // Funções de edição
  const handleEditUser = (userToEdit) => {
    setEditingUser(userToEdit);
    setEditForm({
      name: userToEdit.name || '',
      companyName: userToEdit.companyName || '',
      schoolName: userToEdit.schoolName || userToEdit.school_name || '',
      schoolType: userToEdit.schoolType || userToEdit.school_type || '',
      schoolCity: userToEdit.schoolCity || userToEdit.school_city || '',
      email: userToEdit.email || '',
      phone: userToEdit.phone || '',
      cpf: userToEdit.cpf || '',
      cnpj: userToEdit.cnpj || '',
      type: userToEdit.type || '',
      password: '', // Deixar vazio por segurança
      isAgency: userToEdit.isAgency || userToEdit.is_agency || false
    });
    // Carregar licenças se for escola
    if ((userToEdit.type || userToEdit.user_type) === 'school') {
      setLicensesLoading(true);
      usersAPI.getLicenses(userToEdit.id)
        .then((res) => {
          setEditLicenses({
            studentsLimit: res.studentsLimit ?? '',
            featuredStudentsLimit: res.featuredStudentsLimit ?? ''
          });
        })
        .catch(() => setEditLicenses({ studentsLimit: '', featuredStudentsLimit: '' }))
        .finally(() => setLicensesLoading(false));
    } else {
      setEditLicenses({ studentsLimit: '', featuredStudentsLimit: '' });
    }
  };

  const handleEditFormChange = (field, value) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveEdit = async () => {
    if (!editForm.email || !editForm.email.includes('@')) {
      toast({
        title: 'Erro de validação',
        description: 'Email é obrigatório e deve ser válido.',
        variant: 'destructive'
      });
      return;
    }

    // Verificar se email já existe (exceto para o próprio usuário)
    const emailExists = users.find(u => 
      u.email === editForm.email && u.id !== editingUser.id
    );

    if (emailExists) {
      toast({
        title: 'Erro de validação',
        description: 'Este email já está sendo usado por outro usuário.',
        variant: 'destructive'
      });
      return;
    }

    if (editForm.type === 'candidate' && !editForm.name) {
      toast({
        title: 'Erro de validação',
        description: 'Nome é obrigatório para candidatos.',
        variant: 'destructive'
      });
      return;
    }

    if (editForm.type === 'company' && !editForm.companyName) {
      toast({
        title: 'Erro de validação',
        description: 'Nome da empresa é obrigatório para empresas.',
        variant: 'destructive'
      });
      return;
    }

    if (editForm.type === 'admin' && !editForm.name) {
      toast({
        title: 'Erro de validação',
        description: 'Nome é obrigatório para administradores.',
        variant: 'destructive'
      });
      return;
    }

    if (editForm.type === 'school' && !editForm.schoolName) {
      toast({
        title: 'Erro de validação',
        description: 'Nome da escola é obrigatório.',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Preparar dados para envio
      const updateData = {
        email: editForm.email,
        phone: editForm.phone || null,
        type: editForm.type
      };

      // Adicionar campos específicos por tipo
      if (editForm.type === 'candidate' || editForm.type === 'admin') {
        updateData.name = editForm.name;
        if (editForm.type === 'candidate' && editForm.cpf) {
          updateData.cpf = editForm.cpf;
        }
      }

      if (editForm.type === 'company') {
        updateData.companyName = editForm.companyName;
        if (editForm.cnpj) {
          updateData.cnpj = editForm.cnpj;
        }
        updateData.isAgency = editForm.isAgency;
      }

      if (editForm.type === 'school') {
        updateData.schoolName = editForm.schoolName;
        if (editForm.schoolType) {
          updateData.schoolType = editForm.schoolType;
        }
        if (editForm.schoolCity) {
          updateData.schoolCity = editForm.schoolCity;
        }
      }

      // Adicionar senha apenas se uma nova foi fornecida
      if (editForm.password && editForm.password.trim() !== '') {
        updateData.password = editForm.password.trim();
      }

      // Fazer a chamada para a API
      await usersAPI.update(editingUser.id, updateData);

      // Atualizar limites de licenças se escola
      if (editForm.type === 'school') {
        const sLimit = editLicenses.studentsLimit === '' ? null : Number(editLicenses.studentsLimit);
        const fLimit = editLicenses.featuredStudentsLimit === '' ? null : Number(editLicenses.featuredStudentsLimit);
        if ((sLimit !== null && Number.isNaN(sLimit)) || (fLimit !== null && Number.isNaN(fLimit))) {
          throw new Error('Limites de licenças inválidos');
        }
        await usersAPI.updateLicenses(editingUser.id, { studentsLimit: sLimit, featuredStudentsLimit: fLimit });
      }

      // Recarregar dados após atualização
      await loadUsers();
      
      setEditingUser(null);
      
      const passwordUpdated = editForm.password && editForm.password.trim() !== '';
      const userName = editForm.name || editForm.companyName || editForm.email;
      
      toast({
        title: 'Usuário atualizado',
        description: `${userName} foi atualizado com sucesso.${passwordUpdated ? ' A senha também foi alterada.' : ''}`
      });
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      toast({
        title: 'Erro na atualização',
        description: error.message || 'Não foi possível atualizar o usuário.',
        variant: 'destructive'
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setEditForm({
      name: '',
      companyName: '',
      email: '',
      phone: '',
      cpf: '',
      cnpj: '',
      type: '',
      password: '',
      isAgency: false
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      console.log('Nenhum arquivo selecionado');
      return;
    }

    console.log('Arquivo selecionado:', file.name, 'Tipo:', file.type, 'Tamanho:', file.size);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        console.log('Iniciando leitura do arquivo...');
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        console.log('Planilhas encontradas:', workbook.SheetNames);
        
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        console.log('Dados extraídos:', jsonData);

        if (jsonData.length === 0) {
          toast({
            title: 'Arquivo vazio',
            description: 'O arquivo não contém dados válidos.',
            variant: 'destructive'
          });
          return;
        }

        // Processar dados do Excel e registrar via API
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i];
          const { email, nome, senha, tipo, telefone, empresa, cpf, cnpj } = row;
          
          console.log(`Processando linha ${i + 2}:`, row);
          
          if (!email || !nome || !senha || !tipo) {
            console.log(`Erro na linha ${i + 2}: Campos obrigatórios faltando`);
            toast({
              title: `Erro na linha ${i + 2}`,
              description: 'Email, nome, senha e tipo são obrigatórios.',
              variant: 'destructive'
            });
            errorCount++;
            continue;
          }

          // Validar tipo
          if (!['candidate', 'company'].includes(tipo.toLowerCase())) {
            console.log(`Erro na linha ${i + 2}: Tipo inválido: ${tipo}`);
            toast({
              title: `Erro na linha ${i + 2}`,
              description: `Tipo "${tipo}" é inválido. Use "candidate" ou "company".`,
              variant: 'destructive'
            });
            errorCount++;
            continue;
          }

          try {
            const userData = {
              email,
              password: senha,
              type: tipo.toLowerCase(),
              phone: telefone || ''
            };

            if (tipo.toLowerCase() === 'candidate') {
              userData.name = nome;
              userData.cpf = cpf || '';
            } else if (tipo.toLowerCase() === 'company') {
              userData.companyName = empresa || nome;
              userData.cnpj = cnpj || '';
            }

            // Registrar usuário via API
            const response = await authAPI.register(userData);
            
            if (response.user) {
              successCount++;
              console.log(`Usuário linha ${i + 2} registrado com sucesso`);
            } else {
              throw new Error('Resposta da API não contém dados do usuário');
            }

          } catch (error) {
            console.error(`Erro ao registrar usuário linha ${i + 2}:`, error);
            toast({
              title: `Erro na linha ${i + 2}`,
              description: error.message || 'Erro ao registrar usuário',
              variant: 'destructive'
            });
            errorCount++;
          }
        }

        console.log(`Processamento concluído. Sucessos: ${successCount}, Erros: ${errorCount}`);

        if (successCount > 0) {
          loadUsers(); // Recarregar lista de usuários
          
          toast({
            title: 'Importação concluída',
            description: `${successCount} usuários foram importados com sucesso.${errorCount > 0 ? ` ${errorCount} erros encontrados.` : ''}`
          });
        } else {
          toast({
            title: 'Nenhum usuário importado',
            description: 'Não foi possível importar nenhum usuário. Verifique o formato do arquivo.',
            variant: 'destructive'
          });
        }

      } catch (error) {
        console.error('Erro detalhado na importação:', error);
        toast({
          title: 'Erro na importação',
          description: `Erro ao processar o arquivo: ${error.message}`,
          variant: 'destructive'
        });
      }
    };

    reader.onerror = (error) => {
      console.error('Erro ao ler arquivo:', error);
      toast({
        title: 'Erro na leitura',
        description: 'Não foi possível ler o arquivo selecionado.',
        variant: 'destructive'
      });
    };

    reader.readAsArrayBuffer(file);
    e.target.value = ''; // Limpar input
  };

  const downloadTemplate = () => {
    try {
      console.log('Baixando template Excel...');
      const workbook = createTemplate();
      const fileName = 'template-usuarios-curriculoja.xlsx';
      XLSX.writeFile(workbook, fileName);
      
      console.log('Template baixado:', fileName);
      
      toast({
        title: 'Template baixado',
        description: 'O template Excel foi baixado com sucesso.'
      });
    } catch (error) {
      console.error('Erro ao baixar template:', error);
      toast({
        title: 'Erro no download',
        description: 'Não foi possível baixar o template.',
        variant: 'destructive'
      });
    }
  };

  const exportUsers = () => {
    try {
      console.log('Iniciando exportação. Total de usuários:', users.length);
      
      if (users.length === 0) {
        toast({
          title: 'Nenhum usuário para exportar',
          description: 'Não há usuários cadastrados no sistema.',
          variant: 'destructive'
        });
        return;
      }

      const exportData = users.map(user => ({
        Email: user.email,
        Nome: user.name || user.companyName,
        Tipo: user.type === 'admin' ? 'Administrador' : 
               user.type === 'company' ? 'Empresa' : 
               user.type === 'school' ? 'Escola' : 'Candidato',
        Telefone: user.phone || '',
        'Data de Criação': user.createdAt ? new Date(user.createdAt).toLocaleDateString('pt-BR') : ''
      }));

      console.log('Dados preparados para exportação:', exportData);

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Usuários');
      
      const fileName = `usuarios-curriculoja-${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      console.log('Arquivo exportado:', fileName);
      
      toast({
        title: 'Exportação concluída',
        description: `${users.length} usuários foram exportados para ${fileName}`
      });

    } catch (error) {
      console.error('Erro na exportação:', error);
      toast({
        title: 'Erro na exportação',
        description: 'Ocorreu um erro ao exportar os dados. Verifique o console.',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Carregando sessão...</div>;
  }

  return (
    <>
      <Helmet>
        <title>Dashboard Administrativo - CurrículoJá</title>
        <meta name="description" content="Painel administrativo para gerenciamento de usuários do sistema." />
      </Helmet>

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold gradient-text">Dashboard Administrativo</h1>
                <p className="text-gray-600 mt-2">Gerencie usuários e monitore estatísticas do sistema</p>
                <p className="text-xs text-gray-500 mt-1">
                  Última atualização: {lastUpdated.toLocaleTimeString('pt-BR')} • Auto-atualização a cada 10s
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Atualizando...' : 'Atualizar Dados'}
              </Button>
            </div>

            {/* Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-6 mb-8">
              <Card>
                <CardContent className="p-6 text-center">
                  <Users className="w-12 h-12 mx-auto mb-4 text-blue-600" />
                  <div className="text-2xl font-bold">{stats.totalUsers}</div>
                  <div className="text-gray-600">Total</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6 text-center">
                  <UserPlus className="w-12 h-12 mx-auto mb-4 text-green-600" />
                  <div className="text-2xl font-bold">{stats.candidates}</div>
                  <div className="text-gray-600">Candidatos</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6 text-center">
                  <Building2 className="w-12 h-12 mx-auto mb-4 text-purple-600" />
                  <div className="text-2xl font-bold">{stats.companies}</div>
                  <div className="text-gray-600">Empresas</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6 text-center">
                  <Users className="w-12 h-12 mx-auto mb-4 text-red-600" />
                  <div className="text-2xl font-bold">{stats.admins}</div>
                  <div className="text-gray-600">Admins</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 text-center">
                  <GraduationCap className="w-12 h-12 mx-auto mb-4 text-blue-500" />
                  <div className="text-2xl font-bold">{stats.schools}</div>
                  <div className="text-gray-600">Escolas</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 text-center">
                  <UserCheck className="w-12 h-12 mx-auto mb-4 text-green-500" />
                  <div className="text-2xl font-bold">{stats.activeUsers}</div>
                  <div className="text-gray-600">Ativos</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 text-center">
                  <UserX className="w-12 h-12 mx-auto mb-4 text-gray-500" />
                  <div className="text-2xl font-bold">{stats.disabledUsers}</div>
                  <div className="text-gray-600">Desabilitados</div>
                </CardContent>
              </Card>
            </div>

            {/* Ações Principais */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <Button 
                onClick={() => navigate('/admin/register')}
                className="btn-primary text-white"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Cadastrar Usuário
              </Button>
              
              <div>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    console.log('Botão Importar Excel clicado');
                    const fileInput = document.getElementById('file-upload');
                    console.log('File input encontrado:', fileInput);
                    if (fileInput) {
                      fileInput.click();
                    } else {
                      console.error('File input não encontrado!');
                    }
                  }}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Importar Excel
                </Button>
                <input
                  id="file-upload"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => {
                    console.log('Input file onChange disparado');
                    handleFileUpload(e);
                  }}
                  style={{ display: 'none' }}
                />
              </div>
              
              <Button 
                variant="outline"
                onClick={exportUsers}
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar Dados
              </Button>
              
              <Button 
                variant="outline"
                onClick={downloadTemplate}
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Template Excel
              </Button>
            </div>

            {/* Ações em Lote */}
            {selectedUsers.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6"
              >
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-blue-800">
                      {selectedUsers.length} usuário(s) selecionado(s)
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleBulkToggleStatus(false)}
                      className="border-green-300 text-green-700 hover:bg-green-50"
                    >
                      <UserCheck className="w-4 h-4 mr-1" />
                      Habilitar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleBulkToggleStatus(true)}
                      className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                    >
                      <UserX className="w-4 h-4 mr-1" />
                      Desabilitar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBulkDelete}
                      className="border-red-300 text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Excluir
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Filtros e Busca */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Gerenciar Usuários</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <Label htmlFor="search">Buscar usuários</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="search"
                        placeholder="Buscar por nome ou email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="filter">Filtrar por tipo</Label>
                    <Select
                      id="filter"
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                    >
                      <option value="all">Todos</option>
                      <option value="candidate">Candidatos</option>
                      <option value="company">Empresas</option>
                      <option value="school">Escolas</option>
                      <option value="admin">Administradores</option>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="filterStatus">Filtrar por status</Label>
                    <Select
                      id="filterStatus"
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                    >
                      <option value="all">Todos</option>
                      <option value="active">Ativos</option>
                      <option value="disabled">Desabilitados</option>
                    </Select>
                  </div>
                </div>

                {/* Lista de Usuários */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 w-10">
                          <Checkbox
                            checked={selectAll}
                            onCheckedChange={handleSelectAll}
                            disabled={filteredUsers.filter(u => u.id !== user.id).length === 0}
                          />
                        </th>
                        <th className="text-left py-2">Nome/Empresa</th>
                        <th className="text-left py-2">Email</th>
                        <th className="text-left py-2">Tipo</th>
                        <th className="text-left py-2">Status</th>
                        <th className="text-left py-2">Data de Criação</th>
                        <th className="text-left py-2">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((userItem) => (
                        <tr 
                          key={userItem.id} 
                          className={`border-b hover:bg-gray-50 ${userItem.disabled ? 'opacity-60' : ''}`}
                        >
                          <td className="py-3">
                            <Checkbox
                              checked={selectedUsers.includes(userItem.id)}
                              onCheckedChange={(checked) => handleSelectUser(userItem.id, checked)}
                              disabled={userItem.id === user.id}
                            />
                          </td>
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <span className={userItem.disabled ? 'line-through' : ''}>
                                {userItem.name || userItem.companyName}
                              </span>
                              {userItem.id === user.id && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  Você
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3">{userItem.email}</td>
                          <td className="py-3">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              userItem.type === 'admin' ? 'bg-red-100 text-red-800' :
                              userItem.type === 'company' && userItem.isAgency ? 'bg-orange-100 text-orange-800' :
                              userItem.type === 'company' ? 'bg-purple-100 text-purple-800' :
                              userItem.type === 'school' ? 'bg-blue-100 text-blue-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {userItem.type === 'admin' ? 'Admin' :
                               userItem.type === 'company' && userItem.isAgency ? 'Agência' :
                               userItem.type === 'company' ? 'Empresa' : 
                               userItem.type === 'school' ? 'Escola' : 'Candidato'}
                            </span>
                          </td>
                          <td className="py-3">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              userItem.disabled ? 'bg-gray-100 text-gray-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {userItem.disabled ? 'Desabilitado' : 'Ativo'}
                            </span>
                          </td>
                          <td className="py-3">
                            {new Date(userItem.createdAt).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="py-3">
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditUser(userItem)}
                                title="Editar usuário"
                                className="text-blue-600 hover:text-blue-700"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleToggleUserStatus(userItem.id, !userItem.disabled)}
                                title={userItem.disabled ? 'Habilitar usuário' : 'Desabilitar usuário'}
                              >
                                {userItem.disabled ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteUser(userItem.id)}
                                disabled={userItem.id === user.id}
                                className="text-red-600 hover:text-red-700"
                                title="Excluir usuário"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {filteredUsers.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      Nenhum usuário encontrado.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Modal de Edição */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  Editar Usuário
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelEdit}
                  className="p-2"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-email">Email *</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editForm.email}
                    onChange={(e) => handleEditFormChange('email', e.target.value)}
                    placeholder="exemplo@email.com"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="edit-type">Tipo de Usuário *</Label>
                  <Select
                    id="edit-type"
                    value={editForm.type}
                    onChange={(e) => handleEditFormChange('type', e.target.value)}
                    disabled={editingUser.id === user.id}
                    required
                  >
                    <option value="">Selecione o tipo</option>
                    <option value="candidate">Candidato</option>
                    <option value="company">Empresa</option>
                    <option value="admin">Administrador</option>
                  </Select>
                  {editingUser.id === user.id && (
                    <p className="text-xs text-gray-500 mt-1">
                      Você não pode alterar seu próprio tipo de usuário
                    </p>
                  )}
                </div>

                {editForm.type === 'candidate' && (
                  <>
                    <div>
                      <Label htmlFor="edit-name">Nome Completo *</Label>
                      <Input
                        id="edit-name"
                        value={editForm.name}
                        onChange={(e) => handleEditFormChange('name', e.target.value)}
                        placeholder="Nome completo"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-cpf">CPF</Label>
                      <Input
                        id="edit-cpf"
                        value={editForm.cpf}
                        onChange={(e) => handleEditFormChange('cpf', e.target.value)}
                        placeholder="000.000.000-00"
                      />
                    </div>
                  </>
                )}

                {editForm.type === 'company' && (
                  <>
                    <div>
                      <Label htmlFor="edit-company-name">Nome da Empresa *</Label>
                      <Input
                        id="edit-company-name"
                        value={editForm.companyName}
                        onChange={(e) => handleEditFormChange('companyName', e.target.value)}
                        placeholder="Nome da empresa"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-cnpj">CNPJ</Label>
                      <Input
                        id="edit-cnpj"
                        value={editForm.cnpj}
                        onChange={(e) => handleEditFormChange('cnpj', e.target.value)}
                        placeholder="00.000.000/0000-00"
                      />
                    </div>
                    <div className="mt-2 p-3 border rounded-md bg-orange-50 border-orange-200">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="edit-is-agency"
                          checked={editForm.isAgency}
                          onChange={(e) => handleEditFormChange('isAgency', e.target.checked)}
                          className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                        />
                        <Label htmlFor="edit-is-agency" className="cursor-pointer font-medium text-orange-800">
                          Agência de Estágio
                        </Label>
                      </div>
                      <p className="text-[11px] text-orange-600 mt-1 ml-7">
                        Ativar plano de agência. A empresa poderá importar vagas externas com links de redirecionamento.
                      </p>
                    </div>
                  </>
                )}

                {editForm.type === 'school' && (
                  <>
                    <div>
                      <Label htmlFor="edit-school-name">Nome da Escola *</Label>
                      <Input
                        id="edit-school-name"
                        value={editForm.schoolName}
                        onChange={(e) => handleEditFormChange('schoolName', e.target.value)}
                        placeholder="Nome da escola"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-school-type">Tipo de Escola</Label>
                      <Input
                        id="edit-school-type"
                        value={editForm.schoolType}
                        onChange={(e) => handleEditFormChange('schoolType', e.target.value)}
                        placeholder="Ex: Pública, Privada, Técnica"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-school-city">Cidade</Label>
                      <Input
                        id="edit-school-city"
                        value={editForm.schoolCity}
                        onChange={(e) => handleEditFormChange('schoolCity', e.target.value)}
                        placeholder="Cidade da escola"
                      />
                    </div>
                    <div className="mt-2 p-3 border rounded-md bg-gray-50">
                      <div className="font-medium text-sm mb-2">Licenças da Escola</div>
                      {licensesLoading ? (
                        <div className="text-xs text-gray-500">Carregando limites...</div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="edit-students-limit">Alunos (limite total)</Label>
                            <Input
                              id="edit-students-limit"
                              placeholder="ex: 200"
                              value={editLicenses.studentsLimit}
                              onChange={(e) => setEditLicenses((l) => ({ ...l, studentsLimit: e.target.value }))}
                            />
                            <p className="text-[11px] text-gray-500 mt-1">Deixe vazio para ilimitado</p>
                          </div>
                          <div>
                            <Label htmlFor="edit-featured-limit">Destacados (limite)</Label>
                            <Input
                              id="edit-featured-limit"
                              placeholder="ex: 20"
                              value={editLicenses.featuredStudentsLimit}
                              onChange={(e) => setEditLicenses((l) => ({ ...l, featuredStudentsLimit: e.target.value }))}
                            />
                            <p className="text-[11px] text-gray-500 mt-1">Deixe vazio para ilimitado</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {editForm.type === 'admin' && (
                  <div>
                    <Label htmlFor="edit-admin-name">Nome do Administrador *</Label>
                    <Input
                      id="edit-admin-name"
                      value={editForm.name}
                      onChange={(e) => handleEditFormChange('name', e.target.value)}
                      placeholder="Nome do administrador"
                      required
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="edit-phone">Telefone</Label>
                  <Input
                    id="edit-phone"
                    value={editForm.phone}
                    onChange={handlePhoneInputChange}
                    placeholder="(11) 99999-9999"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-password">Nova Senha</Label>
                  <Input
                    id="edit-password"
                    type="password"
                    value={editForm.password}
                    onChange={(e) => handleEditFormChange('password', e.target.value)}
                    placeholder="Digite uma nova senha (deixe vazio para manter a atual)"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Deixe em branco para manter a senha atual
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={handleCancelEdit}
                  className="flex-1"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  className="flex-1 btn-primary text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Salvar
                </Button>
              </div>

              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">
                  <strong>Usuário:</strong> {editingUser.name || editingUser.companyName}
                  <br />
                  <strong>ID:</strong> {editingUser.id}
                  <br />
                  <strong>Criado em:</strong> {new Date(editingUser.createdAt).toLocaleDateString('pt-BR')}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
};

export default AdminDashboard;
