import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { 
  BookOpen, 
  Clock, 
  User, 
  MessageCircle, 
  Plus, 
  Trash2, 
  LayoutDashboard,
  CheckCircle,
  Video,
  PenTool,
  FileText,
  Search,
  Filter,
  Calendar,
  Lock,
  Unlock,
  Key,
  GripVertical,
  AlertTriangle
} from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'Planning', label: 'Planning', icon: FileText, color: 'bg-slate-100 text-slate-700 border-slate-300' },
  { value: 'Scripting', label: 'Scripting', icon: PenTool, color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  { value: 'Recording', label: 'Recording', icon: Video, color: 'bg-red-100 text-red-700 border-red-300' },
  { value: 'Editing', label: 'Editing', icon: Clock, color: 'bg-purple-100 text-purple-700 border-purple-300' },
  { value: 'Review', label: 'Review', icon: MessageCircle, color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { value: 'Completed', label: 'Completed', icon: CheckCircle, color: 'bg-green-100 text-green-700 border-green-300' }
];

const STATUS_PROGRESS = {
  'Planning': 15,
  'Scripting': 30,
  'Recording': 50,
  'Editing': 75,
  'Review': 90,
  'Completed': 100
};

const CONTENT_TYPES = [
  'Course',
  'Live',
  'Event',
  'Marketing Video'
];

// Production Configuration (Vercel)
// Replace the values below with your real Firebase project keys
const firebaseConfig = {
  apiKey: "AIzaSyDbe81rhQ0XoEHdzub2lnfe-B6x42LtQEw",
  authDomain: "impacta-ed875.firebaseapp.com",
  projectId: "impacta-ed875",
  storageBucket: "impacta-ed875.firebasestorage.app",
  messagingSenderId: "311469756126",
  appId: "1:311469756126:web:73f321d95458c7720f7c4f"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export default function App() {
  const [projects, setProjects] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // State to capture and display Firebase connection errors
  const [firebaseError, setFirebaseError] = useState(null);

  // Security States (View-Only vs Editing Mode)
  const [isAdmin, setIsAdmin] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // Drag and Drop States
  const [draggedItemIndex, setDraggedItemIndex] = useState(null);
  const [dragOverItemIndex, setDragOverItemIndex] = useState(null);
  
  // Access code
  const CORRECT_PIN = '9999';

  // Filters for the dashboard
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // 1. Initialize Database Authentication
  useEffect(() => {
    const initAuth = async () => {
      try {
        setFirebaseError(null);
        await signInAnonymously(auth);
      } catch (error) {
        console.error("Authentication error:", error);
        setFirebaseError(error.message);
        setLoading(false);
      }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // 2. Fetch and listen to real-time Firestore data
  useEffect(() => {
    if (!user) return;
    
    const projectsRef = collection(db, 'projetos');
    const unsubscribe = onSnapshot(projectsRef, (snapshot) => {
      const projectsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort projects based on the 'ordem' field. 
      // If it doesn't exist, use the creation date as a fallback.
      projectsData.sort((a, b) => {
        const orderA = a.ordem !== undefined ? a.ordem : a.createdAt;
        const orderB = b.ordem !== undefined ? b.ordem : b.createdAt;
        return orderA - orderB;
      });
      
      setProjects(projectsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching data:", error);
      setFirebaseError("Error fetching projects. Check Firestore security rules.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Form State
  const [formData, setFormData] = useState({
    nome: '',
    tipoConteudo: 'Course',
    cargaHoraria: '',
    status: 'Planning',
    responsavel: '',
    comentarios: '',
    dataEntrega: ''
  });

  // Update form data
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Add a new project to the database
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nome || !formData.cargaHoraria || !formData.responsavel || !user) return;

    // Calculate new order to place it at the end of the list
    const newOrder = projects.length > 0 
      ? Math.max(...projects.map(p => p.ordem !== undefined ? p.ordem : 0)) + 1 
      : 0;

    const newProject = {
      ...formData,
      createdAt: Date.now(),
      ordem: newOrder
    };

    try {
      await addDoc(collection(db, 'projetos'), newProject);
      
      // Clear form
      setFormData({
        nome: '',
        tipoConteudo: 'Course',
        cargaHoraria: '',
        status: 'Planning',
        responsavel: '',
        comentarios: '',
        dataEntrega: ''
      });
    } catch (error) {
      console.error("Error adding project:", error);
      alert("Error adding project: " + error.message);
    }
  };

  // Remove a project from the database
  const handleDelete = async (id) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'projetos', id));
    } catch (error) {
      console.error("Error deleting project:", error);
    }
  };

  // Update a specific field
  const handleUpdateProject = async (id, field, value) => {
    if (!user) return;
    
    setProjects(projects.map(project => 
      project.id === id ? { ...project, [field]: value } : project
    ));

    try {
      await updateDoc(doc(db, 'projetos', id), {
        [field]: value
      });
    } catch (error) {
      console.error("Error updating project:", error);
    }
  };

  // --- Drag and Drop Handlers ---
  const handleDrop = async (e, targetIndex) => {
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === targetIndex) {
      setDraggedItemIndex(null);
      setDragOverItemIndex(null);
      return;
    }

    const newProjects = [...projects];
    const draggedItem = newProjects[draggedItemIndex];

    // Rearrange the array
    newProjects.splice(draggedItemIndex, 1);
    newProjects.splice(targetIndex, 0, draggedItem);

    // Recalculate 'ordem' field for all elements to ensure consistency
    const updatedProjects = newProjects.map((proj, idx) => ({
      ...proj,
      ordem: idx
    }));

    setProjects(updatedProjects);
    setDraggedItemIndex(null);
    setDragOverItemIndex(null);

    // Save batch updates to Firebase
    try {
      const updatePromises = updatedProjects.map(proj => {
        // Only trigger an update if the order actually changed for this item
        if (projects.find(p => p.id === proj.id)?.ordem !== proj.ordem) {
          return updateDoc(doc(db, 'projetos', proj.id), { ordem: proj.ordem });
        }
        return Promise.resolve();
      });
      await Promise.all(updatePromises);
    } catch (error) {
      console.error("Error saving new order:", error);
    }
  };

  // Helper function to get status colors
  const getStatusColor = (statusName) => {
    const statusObj = STATUS_OPTIONS.find(s => s.value === statusName);
    return statusObj ? statusObj.color : 'bg-gray-100 text-gray-700 border-gray-300';
  };

  // Calculate statistics
  const totalProjects = projects.length;
  const publishedProjects = projects.filter(p => p.status === 'Completed').length;
  const inProgressProjects = totalProjects - publishedProjects;

  const isFiltering = searchQuery !== '' || statusFilter !== 'All';

  // Filter projects for display
  const filteredProjects = projects.filter(p => {
    const matchSearch = p.nome.toLowerCase().includes(searchQuery.toLowerCase()) || 
                       p.responsavel.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'All' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleUnlock = (e) => {
    e.preventDefault();
    if (pinInput === CORRECT_PIN) {
      setIsAdmin(true);
      setShowPinModal(false);
      setPinInput('');
      setPinError('');
    } else {
      setPinError('Incorrect code. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <header className="bg-indigo-600 text-white shadow-md py-6 px-8 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="w-8 h-8 text-indigo-200" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Educational Content Dashboard</h1>
              <p className="text-indigo-200 text-sm">Course Production Management</p>
            </div>
          </div>
          
          <button
            onClick={() => isAdmin ? setIsAdmin(false) : setShowPinModal(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isAdmin 
                ? 'bg-indigo-700 hover:bg-indigo-800 text-white' 
                : 'bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm'
            }`}
          >
            {isAdmin ? (
              <>
                <Unlock className="w-4 h-4" />
                Editing Mode Active
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                Unlock Editing
              </>
            )}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center gap-4">
            <div className="p-3 bg-indigo-100 rounded-lg text-indigo-600">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Projects</p>
              <p className="text-2xl font-bold text-slate-800">{totalProjects}</p>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center gap-4">
            <div className="p-3 bg-amber-100 rounded-lg text-amber-600">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">In Production</p>
              <p className="text-2xl font-bold text-slate-800">{inProgressProjects}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center gap-4">
            <div className="p-3 bg-emerald-100 rounded-lg text-emerald-600">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Completed</p>
              <p className="text-2xl font-bold text-slate-800">{publishedProjects}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-full">
              <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
                <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-indigo-500" />
                  New Content
                </h2>
              </div>
              
              {!isAdmin ? (
                <div className="p-8 flex flex-col items-center justify-center text-center h-[calc(100%-60px)]">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
                    <Lock className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-700 mb-2">View Only</h3>
                  <p className="text-sm text-slate-500 mb-6">
                    The dashboard is restricted. To add or modify projects, you must enter the access code.
                  </p>
                  <button
                    onClick={() => setShowPinModal(true)}
                    className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors"
                  >
                    Enter Code
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Content Name</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <BookOpen className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        type="text"
                        name="nome"
                        value={formData.nome}
                        onChange={handleChange}
                        placeholder="Ex: Photography Course"
                        className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Content Type</label>
                    <select
                      name="tipoConteudo"
                      value={formData.tipoConteudo}
                      onChange={handleChange}
                      className="block w-full pl-3 pr-10 py-2 text-base border border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-lg"
                    >
                      {CONTENT_TYPES.map(tipo => (
                        <option key={tipo} value={tipo}>{tipo}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Duration</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Clock className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        type="text"
                        name="cargaHoraria"
                        value={formData.cargaHoraria}
                        onChange={handleChange}
                        placeholder="Ex: 40h"
                        className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Current Status</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className="block w-full pl-3 pr-10 py-2 text-base border border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-lg"
                    >
                      {STATUS_OPTIONS.map(status => (
                        <option key={status.value} value={status.value}>{status.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Current Assignee</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        type="text"
                        name="responsavel"
                        value={formData.responsavel}
                        onChange={handleChange}
                        placeholder="Assignee name"
                        className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Deadline</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Calendar className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        type="date"
                        name="dataEntrega"
                        value={formData.dataEntrega}
                        onChange={handleChange}
                        className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-slate-700"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Comments</label>
                    <div className="relative">
                      <div className="absolute top-3 left-3 pointer-events-none">
                        <MessageCircle className="h-4 w-4 text-slate-400" />
                      </div>
                      <textarea
                        name="comentarios"
                        value={formData.comentarios}
                        onChange={handleChange}
                        rows={3}
                        placeholder="Project observations..."
                        className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm resize-none"
                      />
                    </div>
                  </div>
                  
                  <button
                    type="submit"
                    className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                  >
                    Add Project
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Right Column: Project List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-lg font-semibold text-slate-800">Content in Production</h2>
                
                {/* Search and Filters */}
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Search content..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="block w-full sm:w-64 pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div className="relative flex-shrink-0">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Filter className="h-4 w-4 text-slate-400" />
                    </div>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="block w-full pl-9 pr-8 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500 appearance-none bg-white cursor-pointer"
                    >
                      <option value="All">All Statuses</option>
                      {STATUS_OPTIONS.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      {isAdmin && !isFiltering && <th scope="col" className="px-2 py-3 w-8"></th>}
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Content</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status & Progress</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Assignee & Deadline</th>
                      {isAdmin && (
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {loading ? (
                      <tr>
                        <td colSpan={isAdmin && !isFiltering ? "5" : "4"} className="px-6 py-12 text-center text-slate-500 flex flex-col items-center justify-center">
                          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                          Loading dashboard...
                        </td>
                      </tr>
                    ) : firebaseError ? (
                      <tr>
                        <td colSpan={isAdmin && !isFiltering ? "5" : "4"} className="px-6 py-12">
                          <div className="flex flex-col items-center justify-center text-center">
                            <div className="bg-red-50 p-6 rounded-xl border border-red-200 max-w-lg">
                              <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
                              <h3 className="text-lg font-bold text-red-800 mb-2">Firebase Connection Error</h3>
                              <p className="text-sm text-red-600 mb-4 bg-red-100 p-2 rounded font-mono">{firebaseError}</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : filteredProjects.length === 0 ? (
                      <tr>
                        <td colSpan={isAdmin && !isFiltering ? "5" : "4"} className="px-6 py-12 text-center text-slate-500">
                          {projects.length === 0 
                            ? "No projects registered yet. Use the form to start!" 
                            : "No projects found for this search."}
                        </td>
                      </tr>
                    ) : (
                      filteredProjects.map((project, index) => (
                        <tr 
                          key={project.id} 
                          className={`hover:bg-slate-50 transition-all ${draggedItemIndex === index ? 'opacity-50 bg-slate-100' : ''} ${dragOverItemIndex === index ? 'border-t-2 border-indigo-500' : ''}`}
                          draggable={isAdmin && !isFiltering}
                          onDragStart={(e) => {
                            setDraggedItemIndex(index);
                            e.dataTransfer.effectAllowed = "move";
                          }}
                          onDragEnter={(e) => {
                            if (draggedItemIndex !== null) setDragOverItemIndex(index);
                          }}
                          onDragOver={(e) => e.preventDefault()}
                          onDragEnd={() => {
                            setDraggedItemIndex(null);
                            setDragOverItemIndex(null);
                          }}
                          onDrop={(e) => handleDrop(e, index)}
                        >
                          {isAdmin && !isFiltering && (
                            <td className="px-2 py-4 whitespace-nowrap cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600">
                              <GripVertical className="w-5 h-5" />
                            </td>
                          )}
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-slate-900">{project.nome}</span>
                              <div className="flex items-center gap-3 mt-1">
                                {isAdmin ? (
                                  <select
                                    value={project.tipoConteudo || 'Course'}
                                    onChange={(e) => handleUpdateProject(project.id, 'tipoConteudo', e.target.value)}
                                    className="text-[10px] uppercase font-bold tracking-wider bg-indigo-50 text-indigo-700 rounded px-1.5 py-0.5 border border-indigo-100 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    title="Change content type"
                                  >
                                    {CONTENT_TYPES.map(tipo => (
                                      <option key={tipo} value={tipo}>{tipo}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className="text-[10px] uppercase font-bold tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100 rounded px-1.5 py-0.5">
                                    {project.tipoConteudo || 'Course'}
                                  </span>
                                )}
                                <div className="flex items-center text-xs text-slate-500">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {project.cargaHoraria}
                                </div>
                              </div>
                              {isAdmin ? (
                                <div className="mt-2 relative">
                                  <textarea
                                    value={project.comentarios || ''}
                                    onChange={(e) => handleUpdateProject(project.id, 'comentarios', e.target.value)}
                                    placeholder="Add/edit observations..."
                                    rows={2}
                                    className="text-sm text-slate-700 bg-white/50 p-2 rounded-md border border-dashed border-slate-300 hover:border-indigo-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full resize-y transition-all"
                                    title="Click to edit observations"
                                  />
                                </div>
                              ) : (
                                project.comentarios && (
                                  <div className="mt-2 text-sm text-slate-600 bg-slate-100 p-2 rounded-md border border-slate-200">
                                    <span className="font-medium">Obs:</span> {project.comentarios}
                                  </div>
                                )
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col gap-2">
                              <div>
                                {isAdmin ? (
                                  <select
                                    value={project.status}
                                    onChange={(e) => handleUpdateProject(project.id, 'status', e.target.value)}
                                    className={`inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-medium border cursor-pointer hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 transition-all ${getStatusColor(project.status)}`}
                                    title="Click to change status"
                                  >
                                    {STATUS_OPTIONS.map(status => (
                                      <option key={status.value} value={status.value} className="bg-white text-slate-900 font-medium">
                                        {status.label}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className={`inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-medium border ${getStatusColor(project.status)}`}>
                                    {project.status}
                                  </span>
                                )}
                              </div>
                              <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1 max-w-[120px]">
                                <div 
                                  className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500" 
                                  style={{ width: `${STATUS_PROGRESS[project.status] || 0}%` }}
                                ></div>
                              </div>
                              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                                {STATUS_PROGRESS[project.status] || 0}% Completed
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center group">
                                <div className={`flex-shrink-0 h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs transition-colors ${isAdmin ? 'group-hover:bg-indigo-200' : ''}`}>
                                  {project.responsavel ? project.responsavel.charAt(0).toUpperCase() : '?'}
                                </div>
                                <div className="ml-3 flex-1 relative">
                                  {isAdmin ? (
                                    <input
                                      type="text"
                                      value={project.responsavel}
                                      onChange={(e) => handleUpdateProject(project.id, 'responsavel', e.target.value)}
                                      className="text-sm font-medium text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-slate-50 focus:outline-none w-full py-0.5 px-1 transition-all rounded-sm cursor-text"
                                      placeholder="Set assignee"
                                      title="Click to edit assignee"
                                    />
                                  ) : (
                                    <span className="text-sm font-medium text-slate-900 px-1">{project.responsavel || 'Unassigned'}</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center ml-11 text-xs text-slate-500 group">
                                <Calendar className="w-3 h-3 mr-1.5 text-slate-400" />
                                {isAdmin ? (
                                  <input
                                    type="date"
                                    value={project.dataEntrega || ''}
                                    onChange={(e) => handleUpdateProject(project.id, 'dataEntrega', e.target.value)}
                                    className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-slate-50 focus:outline-none py-0.5 transition-all rounded-sm cursor-text text-xs text-slate-500"
                                    title="Set deadline"
                                  />
                                ) : (
                                  <span>{project.dataEntrega ? project.dataEntrega.split('-').reverse().join('/') : 'No deadline'}</span>
                                )}
                              </div>
                            </div>
                          </td>
                          {isAdmin && (
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button 
                                onClick={() => handleDelete(project.id)}
                                className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-full transition-colors"
                                title="Delete project"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* PIN Modal */}
      {showPinModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden transform transition-all">
            <div className="px-6 py-6">
              <div className="flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-full mx-auto mb-4">
                <Key className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold text-center text-slate-900 mb-2">Unlock Editing</h3>
              <p className="text-sm text-center text-slate-500 mb-6">
                Enter the access code to manage contents.
              </p>
              
              <form onSubmit={handleUnlock}>
                <input
                  type="password"
                  autoFocus
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="Access code..."
                  className="block w-full px-4 py-3 border border-slate-300 rounded-lg text-center text-lg tracking-widest focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                />
                
                {pinError && (
                  <p className="text-red-500 text-sm mt-2 text-center font-medium">{pinError}</p>
                )}
                
                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPinModal(false);
                      setPinError('');
                      setPinInput('');
                    }}
                    className="flex-1 px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                  >
                    Unlock
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
