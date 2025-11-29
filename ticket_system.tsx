import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Clock, MessageSquare, Plus, Search, User, LogOut, Mail, Lock, Shield, UserCircle } from 'lucide-react';

export default function TicketSystem() {
  const [tickets, setTickets] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [showLogin, setShowLogin] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    confirmPassword: '',
    userType: 'client'
  });
  const [loginError, setLoginError] = useState('');
  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    priority: 'medium',
    category: 'technical'
  });
  const [newResponse, setNewResponse] = useState('');

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadTickets();
    }
  }, [currentUser]);

  const checkUser = async () => {
    try {
      const result = await window.storage.get('current_user');
      if (result) {
        const user = JSON.parse(result.value);
        setCurrentUser(user);
        setShowLogin(false);
      }
    } catch (error) {
      console.log('Nenhum usuário logado');
    }
  };

  const handleRegister = async () => {
    setLoginError('');

    if (!registerForm.name || !registerForm.email || !registerForm.password) {
      setLoginError('Preencha todos os campos obrigatórios');
      return;
    }

    if (registerForm.password.length < 6) {
      setLoginError('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      setLoginError('As senhas não coincidem');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(registerForm.email)) {
      setLoginError('Email inválido');
      return;
    }

    try {
      const existingUser = await window.storage.get(`user:${registerForm.email}`);
      if (existingUser) {
        setLoginError('Este email já está cadastrado');
        return;
      }

      const newUser = {
        name: registerForm.name,
        email: registerForm.email,
        password: registerForm.password,
        userType: registerForm.userType,
        createdAt: new Date().toISOString()
      };

      await window.storage.set(`user:${registerForm.email}`, JSON.stringify(newUser));
      
      setLoginError('');
      setShowRegister(false);
      setRegisterForm({ name: '', email: '', password: '', confirmPassword: '', userType: 'client' });
      alert('Cadastro realizado com sucesso! Faça login para continuar.');
    } catch (error) {
      console.error('Erro ao registrar:', error);
      setLoginError('Erro ao realizar cadastro');
    }
  };

  const handleLogin = async () => {
    setLoginError('');

    if (!loginForm.email || !loginForm.password) {
      setLoginError('Preencha email e senha');
      return;
    }

    try {
      const userResult = await window.storage.get(`user:${loginForm.email}`);
      
      if (!userResult) {
        setLoginError('Email ou senha incorretos');
        return;
      }

      const user = JSON.parse(userResult.value);

      if (user.password !== loginForm.password) {
        setLoginError('Email ou senha incorretos');
        return;
      }

      const sessionUser = {
        name: user.name,
        email: user.email,
        userType: user.userType,
        loginAt: new Date().toISOString()
      };

      await window.storage.set('current_user', JSON.stringify(sessionUser));
      setCurrentUser(sessionUser);
      setShowLogin(false);
      setLoginForm({ email: '', password: '' });
      setLoginError('');
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      setLoginError('Erro ao fazer login');
    }
  };

  const handleLogout = async () => {
    try {
      await window.storage.delete('current_user');
      setCurrentUser(null);
      setShowLogin(true);
      setTickets([]);
      setSelectedTicket(null);
      setLoginError('');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const loadTickets = async () => {
    try {
      const stored = await window.storage.list('ticket:');
      if (stored && stored.keys) {
        const ticketPromises = stored.keys.map(async (key) => {
          const result = await window.storage.get(key);
          return result ? JSON.parse(result.value) : null;
        });
        const loadedTickets = (await Promise.all(ticketPromises)).filter(Boolean);
        
        const filteredByUser = currentUser.userType === 'technician' 
          ? loadedTickets 
          : loadedTickets.filter(t => t.createdBy === currentUser.email);
        
        setTickets(filteredByUser.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      }
    } catch (error) {
      console.error('Erro ao carregar tickets:', error);
    }
  };

  const createTicket = async () => {
    if (!newTicket.title || !newTicket.description) {
      alert('Preencha título e descrição');
      return;
    }

    const ticket = {
      id: `ticket_${Date.now()}`,
      ...newTicket,
      status: 'open',
      createdBy: currentUser.email,
      createdByName: currentUser.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      responses: []
    };

    try {
      await window.storage.set(`ticket:${ticket.id}`, JSON.stringify(ticket));
      setTickets([ticket, ...tickets]);
      setNewTicket({ title: '', description: '', priority: 'medium', category: 'technical' });
      setShowNewTicket(false);
    } catch (error) {
      console.error('Erro ao criar ticket:', error);
      alert('Erro ao criar ticket');
    }
  };

  const addResponse = async () => {
    if (!newResponse.trim() || !selectedTicket) return;

    const response = {
      id: `response_${Date.now()}`,
      text: newResponse,
      author: currentUser.name,
      authorEmail: currentUser.email,
      isTechnician: currentUser.userType === 'technician',
      createdAt: new Date().toISOString()
    };

    const updatedTicket = {
      ...selectedTicket,
      responses: [...selectedTicket.responses, response],
      updatedAt: new Date().toISOString()
    };

    try {
      await window.storage.set(`ticket:${updatedTicket.id}`, JSON.stringify(updatedTicket));
      setTickets(tickets.map(t => t.id === updatedTicket.id ? updatedTicket : t));
      setSelectedTicket(updatedTicket);
      setNewResponse('');
    } catch (error) {
      console.error('Erro ao adicionar resposta:', error);
    }
  };

  const updateStatus = async (ticketId, newStatus) => {
    if (currentUser.userType !== 'technician') {
      alert('Apenas técnicos podem alterar o status');
      return;
    }

    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;

    const updatedTicket = {
      ...ticket,
      status: newStatus,
      updatedAt: new Date().toISOString()
    };

    try {
      await window.storage.set(`ticket:${ticketId}`, JSON.stringify(updatedTicket));
      setTickets(tickets.map(t => t.id === ticketId ? updatedTicket : t));
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(updatedTicket);
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesFilter = filter === 'all' || ticket.status === filter;
    const matchesSearch = ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'open': return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'in_progress': return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'resolved': return <CheckCircle className="w-5 h-5 text-green-500" />;
      default: return null;
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      open: 'Aberto',
      in_progress: 'Em Andamento',
      resolved: 'Resolvido'
    };
    return labels[status] || status;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-blue-100 text-blue-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-red-100 text-red-800'
    };
    return colors[priority] || colors.medium;
  };

  if (showLogin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, rgb(0, 212, 255), rgb(161, 75, 255))' }}>
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          {!showRegister ? (
            <>
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4" style={{ background: 'linear-gradient(135deg, rgb(0, 212, 255), rgb(161, 75, 255))' }}>
                  <MessageSquare className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-gray-800">Sistema de Tickets</h1>
                <p className="text-gray-600 mt-2">Faça login para continuar</p>
              </div>
              
              {loginError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-red-700">{loginError}</span>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                      onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:border-transparent transition"
                      placeholder="seu@email.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                      onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:border-transparent transition"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <button
                  onClick={handleLogin}
                  className="w-full text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition shadow-lg"
                  style={{ background: 'linear-gradient(135deg, rgb(0, 212, 255), rgb(161, 75, 255))' }}
                >
                  Entrar
                </button>

                <div className="text-center">
                  <button
                    onClick={() => {
                      setShowRegister(true);
                      setLoginError('');
                    }}
                    className="text-sm text-gray-600 hover:text-gray-800 transition"
                  >
                    Não tem uma conta? <span className="font-semibold" style={{ color: 'rgb(161, 75, 255)' }}>Cadastre-se</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4" style={{ background: 'linear-gradient(135deg, rgb(0, 212, 255), rgb(161, 75, 255))' }}>
                  <UserCircle className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-gray-800">Criar Conta</h1>
                <p className="text-gray-600 mt-2">Preencha seus dados</p>
              </div>

              {loginError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-red-700">{loginError}</span>
                </div>
              )}

              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                  <input
                    type="text"
                    value={registerForm.name}
                    onChange={(e) => setRegisterForm({...registerForm, name: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:border-transparent transition"
                    placeholder="João Silva"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm({...registerForm, email: e.target.value})}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:border-transparent transition"
                      placeholder="seu@email.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Usuário</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setRegisterForm({...registerForm, userType: 'client'})}
                      className={`p-4 border-2 rounded-lg transition ${
                        registerForm.userType === 'client'
                          ? 'border-cyan-500 bg-cyan-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <User className="w-6 h-6 mx-auto mb-2" style={{ color: registerForm.userType === 'client' ? 'rgb(0, 212, 255)' : '#9ca3af' }} />
                      <p className="text-sm font-medium text-gray-700">Cliente</p>
                    </button>
                    <button
                      onClick={() => setRegisterForm({...registerForm, userType: 'technician'})}
                      className={`p-4 border-2 rounded-lg transition ${
                        registerForm.userType === 'technician'
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Shield className="w-6 h-6 mx-auto mb-2" style={{ color: registerForm.userType === 'technician' ? 'rgb(161, 75, 255)' : '#9ca3af' }} />
                      <p className="text-sm font-medium text-gray-700">Técnico</p>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Senha (mínimo 6 caracteres)</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:border-transparent transition"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      value={registerForm.confirmPassword}
                      onChange={(e) => setRegisterForm({...registerForm, confirmPassword: e.target.value})}
                      onKeyPress={(e) => e.key === 'Enter' && handleRegister()}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:border-transparent transition"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <button
                  onClick={handleRegister}
                  className="w-full text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition shadow-lg"
                  style={{ background: 'linear-gradient(135deg, rgb(0, 212, 255), rgb(161, 75, 255))' }}
                >
                  Criar Conta
                </button>

                <div className="text-center">
                  <button
                    onClick={() => {
                      setShowRegister(false);
                      setLoginError('');
                    }}
                    className="text-sm text-gray-600 hover:text-gray-800 transition"
                  >
                    Já tem uma conta? <span className="font-semibold" style={{ color: 'rgb(161, 75, 255)' }}>Faça login</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, rgb(0, 212, 255), rgb(161, 75, 255))' }}>
                Sistema de Tickets
              </h1>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-2 text-gray-700">
                  <User className="w-4 h-4" />
                  <span className="text-sm font-medium">{currentUser.name}</span>
                </div>
                {currentUser.userType === 'technician' ? (
                  <span className="text-xs px-3 py-1 rounded-full text-white flex items-center gap-1" style={{ background: 'linear-gradient(135deg, rgb(161, 75, 255), rgb(0, 212, 255))' }}>
                    <Shield className="w-3 h-3" />
                    Técnico
                  </span>
                ) : (
                  <span className="text-xs px-3 py-1 rounded-full bg-gray-200 text-gray-700 flex items-center gap-1">
                    <User className="w-3 h-3" />
                    Cliente
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              {currentUser.userType === 'client' && (
                <button
                  onClick={() => setShowNewTicket(true)}
                  className="flex items-center gap-2 text-white px-4 py-2 rounded-lg hover:opacity-90 transition shadow-lg"
                  style={{ background: 'linear-gradient(135deg, rgb(0, 212, 255), rgb(161, 75, 255))' }}
                >
                  <Plus className="w-5 h-5" />
                  Novo Ticket
                </button>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition"
              >
                <LogOut className="w-5 h-5" />
                Sair
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar tickets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:border-transparent transition"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {['all', 'open', 'in_progress', 'resolved'].map(status => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 rounded-lg transition font-medium ${
                    filter === status
                      ? 'text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  style={filter === status ? { background: 'linear-gradient(135deg, rgb(0, 212, 255), rgb(161, 75, 255))' } : {}}
                >
                  {status === 'all' ? 'Todos' : getStatusLabel(status)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-700 flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                {currentUser.userType === 'technician' ? 'Todos os Tickets' : 'Meus Tickets'}
              </h2>
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {filteredTickets.map(ticket => (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className={`p-4 border-2 rounded-xl cursor-pointer transition transform hover:scale-[1.02] ${
                      selectedTicket?.id === ticket.id
                        ? 'bg-gradient-to-r from-cyan-50 to-purple-50 shadow-lg'
                        : 'border-gray-200 hover:border-gray-300 bg-white hover:shadow-md'
                    }`}
                    style={selectedTicket?.id === ticket.id ? { borderColor: 'rgb(0, 212, 255)' } : {}}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(ticket.status)}
                        <h3 className="font-semibold text-gray-800">{ticket.title}</h3>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority === 'low' ? 'Baixa' : ticket.priority === 'medium' ? 'Média' : 'Alta'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">{ticket.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {ticket.createdByName}
                      </span>
                      <span>{new Date(ticket.createdAt).toLocaleDateString('pt-BR')}</span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {ticket.responses.length}
                      </span>
                    </div>
                  </div>
                ))}
                {filteredTickets.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Nenhum ticket encontrado</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 border border-gray-200">
              {selectedTicket ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-800">{selectedTicket.title}</h2>
                    {getStatusIcon(selectedTicket.status)}
                  </div>
                  
                  {currentUser.userType === 'technician' && (
                    <div className="flex gap-2">
                      <select
                        value={selectedTicket.status}
                        onChange={(e) => updateStatus(selectedTicket.id, e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:border-transparent transition"
                      >
                        <option value="open">Aberto</option>
                        <option value="in_progress">Em Andamento</option>
                        <option value="resolved">Resolvido</option>
                      </select>
                    </div>
                  )}

                  <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                    <p className="text-gray-700">{selectedTicket.description}</p>
                    <div className="mt-4 text-sm text-gray-500 space-y-1">
                      <p className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span className="font-medium">{selectedTicket.createdByName}</span>
                        <span className="text-xs">({selectedTicket.createdBy})</span>
                      </p>
                      <p>Criado em: {new Date(selectedTicket.createdAt).toLocaleString('pt-BR')}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      Respostas ({selectedTicket.responses.length})
                    </h3>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                      {selectedTicket.responses.map(response => (
                        <div key={response.id} className={`rounded-lg p-4 shadow-sm ${response.isTechnician ? 'bg-gradient-to-r from-cyan-50 to-purple-50 border-2' : 'bg-white border border-gray-100'}`}
                          style={response.isTechnician ? { borderColor: 'rgb(161, 75, 255)' } : {}}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`font-semibold text-sm ${response.isTechnician ? 'text-purple-700' : 'text-gray-700'}`}>
                              {response.author}
                            </span>
                            {response.isTechnician && (
                              <span className="text-xs px-2 py-0.5 rounded-full text-white flex items-center gap-1" style={{ background: 'linear-gradient(135deg, rgb(161, 75, 255), rgb(0, 212, 255))' }}>
                                <Shield className="w-3 h-3" />
                                Técnico
                              </span>
                            )}
                            <span className="text-xs text-gray-500 ml-auto">
                              {new Date(response.createdAt).toLocaleString('pt-BR')}
                            </span>
                          </div>
                          <p className="text-gray-700">{response.text}</p>
                        </div>
                      ))}
                      {selectedTicket.responses.length === 0 && (
                        <p className="text-center text-gray-400 py-8">Nenhuma resposta ainda</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <textarea
                      value={newResponse}
                      onChange={(e) => setNewResponse(e.target.value)}
                      placeholder="Digite sua resposta..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:border-transparent resize-none transition"
                      rows="4"
                    />
                    <button
                      onClick={addResponse}
                      disabled={!newResponse.trim()}
                      className="w-full text-white px-4 py-2 rounded-lg hover:opacity-90 transition shadow-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ background: 'linear-gradient(135deg, rgb(0, 212, 255), rgb(161, 75, 255))' }}
                    >
                      Adicionar Resposta
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <MessageSquare className="w-16 h-16 mx-auto mb-3 opacity-30" />
                  <p>Selecione um ticket para ver detalhes</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showNewTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl">
            <h2 className="text-2xl font-bold mb-4 bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, rgb(0, 212, 255), rgb(161, 75, 255))' }}>
              Novo Ticket
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                <input
                  type="text"
                  value={newTicket.title}
                  onChange={(e) => setNewTicket({...newTicket, title: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:border-transparent transition"
                  placeholder="Descreva o problema brevemente"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({...newTicket, description: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:border-transparent resize-none transition"
                  rows="5"
                  placeholder="Descreva o problema em detalhes"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prioridade</label>
                  <select
                    value={newTicket.priority}
                    onChange={(e) => setNewTicket({...newTicket, priority: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:border-transparent transition"
                  >
                    <option value="low">Baixa</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                  <select
                    value={newTicket.category}
                    onChange={(e) => setNewTicket({...newTicket, category: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:border-transparent transition"
                  >
                    <option value="technical">Técnico</option>
                    <option value="billing">Financeiro</option>
                    <option value="general">Geral</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={createTicket}
                  className="flex-1 text-white px-4 py-2 rounded-lg hover:opacity-90 transition shadow-lg font-medium"
                  style={{ background: 'linear-gradient(135deg, rgb(0, 212, 255), rgb(161, 75, 255))' }}
                >
                  Criar Ticket
                </button>
                <button
                  onClick={() => setShowNewTicket(false)}
                  className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition font-medium"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}