import { HashRouter as Router, Routes, Route, Link, NavLink } from 'react-router-dom';
import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { Project } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Github, 
  ExternalLink, 
  Plus, 
  Trash2, 
  Edit3, 
  Code2, 
  Terminal, 
  Cpu, 
  Layout as LayoutIcon, 
  Settings,
  X,
  Save,
  User,
  Mail,
  Info,
  Send,
  ChevronRight,
  Globe,
  Database,
  Layers,
  LogOut,
  LogIn,
  Monitor,
  Laptop
} from 'lucide-react';
import { cn } from './lib/utils';
import { db, auth, signInWithGoogle, logOut } from './firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc, addDoc } from 'firebase/firestore';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

// --- Error Handling Spec ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Firebase Hook ---
const useProjects = () => {
  const [projects, setProjects] = useState<Project[]>(() => {
    const cached = localStorage.getItem('projects_cache');
    return cached ? JSON.parse(cached) : [];
  });
  const [loading, setLoading] = useState(() => {
    const cached = localStorage.getItem('projects_cache');
    return !cached || JSON.parse(cached).length === 0;
  });

  useEffect(() => {
    // Pre-fetch images when projects are loaded
    projects.forEach(project => {
      if (project.imageUrl) {
        const img = new Image();
        img.src = project.imageUrl;
      }
    });
  }, [projects]);

  useEffect(() => {
    const path = 'projects';
    const unsubscribe = onSnapshot(collection(db, path), (snapshot) => {
      const loadedProjects: Project[] = [];
      snapshot.forEach((doc) => {
        loadedProjects.push({ id: doc.id, ...doc.data() } as Project);
      });
      // Sort by createdAt descending
      loadedProjects.sort((a, b) => b.createdAt - a.createdAt);
      
      // Only update if we have data or if we are sure it's not a transient empty state
      if (loadedProjects.length > 0) {
        setProjects(loadedProjects);
        localStorage.setItem('projects_cache', JSON.stringify(loadedProjects));
      }
      setLoading(false);
    }, (error) => {
      setLoading(false);
      handleFirestoreError(error, OperationType.LIST, path);
    });

    return () => unsubscribe();
  }, []);

  const addProject = async (project: Omit<Project, 'id' | 'createdAt'>) => {
    const newId = Math.random().toString(36).substr(2, 9);
    const path = `projects/${newId}`;
    try {
      await setDoc(doc(db, 'projects', newId), {
        ...project,
        createdAt: Date.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    const path = `projects/${id}`;
    try {
      await updateDoc(doc(db, 'projects', id), {
        ...updates,
        updatedAt: Date.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const deleteProject = async (id: string) => {
    const path = `projects/${id}`;
    try {
      await deleteDoc(doc(db, 'projects', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  return { projects, loading, addProject, updateProject, deleteProject };
};

// --- Contacts Hook ---
const useContacts = () => {
  const [contacts, setContacts] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const path = 'contacts';
    const unsubscribe = onSnapshot(collection(db, path), (snapshot) => {
      const loadedContacts: ContactMessage[] = [];
      snapshot.forEach((doc) => {
        loadedContacts.push({ id: doc.id, ...doc.data() } as ContactMessage);
      });
      loadedContacts.sort((a, b) => b.createdAt - a.createdAt);
      setContacts(loadedContacts);
      setLoading(false);
    }, (error) => {
      setLoading(false);
      handleFirestoreError(error, OperationType.LIST, path);
    });

    return () => unsubscribe();
  }, []);

  return { contacts, loading };
};

// --- Components ---
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0F1117] text-[#61AFEF] flex flex-col items-center justify-center p-8 font-mono">
          <div className="border border-[#61AFEF]/30 p-8 max-w-2xl w-full bg-[#161B22]/40 backdrop-blur-md rounded-lg">
            <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Terminal size={24} /> CRITICAL_SYSTEM_ERROR
            </h1>
            <div className="bg-black/50 p-4 rounded mb-6 font-mono text-xs overflow-auto max-h-64 border border-[#ABB2BF]/10">
              <p className="text-[#E06C75] mb-2">ERROR_MESSAGE: {this.state.error?.message}</p>
              <p className="opacity-50">LOCATION: {window.location.href}</p>
            </div>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => window.location.href = '/'}
                className="w-full bg-[#61AFEF] text-black py-3 rounded font-bold hover:bg-[#61AFEF]/90 transition-all"
              >
                REBOOT_SYSTEM (BACK_TO_HOME)
              </button>
              <button 
                onClick={() => {
                  localStorage.clear();
                  window.location.href = '/';
                }}
                className="w-full border border-red-500/50 text-red-400 py-3 rounded font-bold hover:bg-red-500/10 transition-all text-xs"
              >
                WIPE_LOCAL_STORAGE (RESET_ALL_DATA)
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// --- Components ---

function ProjectCard({ project }: { project: Project }) {
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative p-[1px] rounded-2xl bg-gradient-to-br from-[#61AFEF]/20 via-[#C678DD]/20 to-[#98C379]/20 hover:from-[#61AFEF]/40 hover:via-[#C678DD]/40 hover:to-[#98C379]/40 transition-all duration-500 shadow-2xl"
    >
      {/* Code Background Overlay - More complex */}
      <div className="absolute inset-0 opacity-[0.06] pointer-events-none font-mono text-[9px] overflow-hidden p-6 text-[#ABB2BF] leading-relaxed select-none">
        {`// SYSTEM_BOOT_SEQUENCE_INIT\nconst kernel = { status: 'READY', pid: 1024 };\nfunction execute(task) { return task.run(); }\nclass Project extends Entity { constructor(data) { super(data); this.id = uuid(); } }\nconst handleAuth = async (req, res) => { const { token } = req.headers; }\n// ...\n[OK] DEPLOYMENT_SUCCESSFUL\n[LOG] MONITORING_ACTIVE\n[WARN] MEMORY_USAGE_OPTIMIZED\nconst db = connect(process.env.DB_URL);\nif (db.isConnected()) { console.log('DB_CONNECTED'); }\n// ...\n{ "id": "${project.id}", "status": "${project.status || 'STABLE'}" }`}
      </div>

      <div className="bg-[#0B0E14] rounded-[15px] h-full relative z-10 border border-[#ABB2BF]/10 overflow-hidden">
        {/* Terminal Header */}
        <div className="bg-[#161B22]/50 border-b border-[#ABB2BF]/10 px-4 py-2 flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#E06C75]"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-[#E5C07B]"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-[#98C379]"></div>
          </div>
          <div className="text-[10px] text-[#ABB2BF]/50 font-mono ml-2">~/projects/{project.title.toLowerCase().replace(/\s+/g, '_')}</div>
        </div>

        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
            {project.imageUrl ? (
              <div className="flex-shrink-0 w-full md:w-72 h-44 border border-[#ABB2BF]/10 rounded-xl overflow-hidden relative group-hover:border-[#61AFEF]/50 transition-colors bg-[#161B22]">
                <img 
                  src={project.imageUrl} 
                  alt={project.title} 
                  className="w-full h-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100" 
                  referrerPolicy="no-referrer" 
                  loading="eager"
                  decoding="async"
                  onLoad={(e) => {
                    e.currentTarget.classList.remove('opacity-0');
                    e.currentTarget.classList.add('opacity-80');
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B0E14] to-transparent opacity-70"></div>
                <div className="absolute bottom-3 left-3 bg-[#0B0E14]/80 backdrop-blur-sm p-2 rounded-lg border border-[#ABB2BF]/10">
                  <Monitor size={20} className="text-[#61AFEF]" />
                </div>
              </div>
            ) : (
              <div className="flex-shrink-0 w-20 h-20 md:w-24 md:h-24 border border-[#C678DD]/20 flex items-center justify-center text-3xl md:text-4xl font-bold text-[#C678DD]/40 group-hover:text-[#C678DD] group-hover:border-[#C678DD] transition-colors rounded-xl bg-[#161B22]">
                <Laptop size={40} />
              </div>
            )}
            <div className="flex-1 w-full">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <h3 className="text-2xl md:text-4xl font-bold tracking-tight text-[#ECEFF4] group-hover:text-[#61AFEF] transition-colors">{project.title}</h3>
                {project.duration && (
                  <span className="text-xs md:text-sm text-[#C678DD] opacity-80 px-3 py-1 border border-[#C678DD]/20 rounded-full uppercase font-bold whitespace-nowrap">
                    DURATION: {project.duration}
                  </span>
                )}
              </div>
              <p className="text-sm md:text-base text-[#ABB2BF] mb-6 leading-relaxed max-w-3xl">{project.description}</p>
              
              {/* Code Snippet Element - Enhanced */}
              <div className="bg-[#0B0E14] p-5 rounded-xl border border-[#ABB2BF]/10 mb-6 font-mono text-[11px] md:text-xs shadow-inner flex gap-4 overflow-x-auto">
                <div className="text-[#5C6370] select-none">
                  {[1, 2, 3].map(i => <div key={i}>{i}</div>)}
                </div>
                <div style={{ color: project.color || '#98C379' }}>
                  <span className="text-[#C678DD]">const</span> lastUpdate = <span className="text-[#E5C07B]">'{new Date(project.updatedAt || project.createdAt).toLocaleDateString('en-GB')}'</span>;
                  <br />
                  <span className="text-[#C678DD]">const</span> status = <span className="text-[#E5C07B]">'{project.status || 'STABLE'}'</span>;
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {project.tags?.map(tag => (
                  <span key={tag} className="text-[10px] md:text-xs font-mono border border-[#98C379]/20 bg-[#98C379]/5 px-3 py-1 text-[#98C379] rounded-md">
                    {tag.toUpperCase()}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-row md:flex-col gap-3 md:gap-4 justify-end w-full md:w-auto pt-6 md:pt-0 border-t border-[#ABB2BF]/5 md:border-t-0">
              {project.githubLink && (
                <a href={project.githubLink} target="_blank" rel="noopener noreferrer" className="flex-1 md:flex-none p-3 border border-[#ABB2BF]/10 text-[#ABB2BF] hover:bg-[#61AFEF] hover:text-black hover:border-[#61AFEF] transition-all rounded-xl flex items-center justify-center">
                  <Github size={20} />
                </a>
              )}
              {project.liveLink && (
                <a href={project.liveLink} target="_blank" rel="noopener noreferrer" className="flex-1 md:flex-none p-3 border border-[#ABB2BF]/10 text-[#ABB2BF] hover:bg-[#C678DD] hover:text-black hover:border-[#C678DD] transition-all rounded-xl flex items-center justify-center">
                  <ExternalLink size={20} />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

const CodeBackground = () => {
  const codeSnippets = [
    `function initSystem() {
  const kernel = new Kernel();
  kernel.boot();
  return { status: 'READY' };
}`,
    `class Project extends Entity {
  constructor(data) {
    super(data);
    this.id = uuid();
    this.timestamp = Date.now();
  }
}`,
    `const handleAuth = async (req, res) => {
  const { token } = req.headers;
  const user = await verify(token);
  if (!user) throw new AuthError();
}`,
    `interface PortfolioConfig {
  theme: 'ONE_DARK_PRO';
  version: '4.2.0';
  owner: 'KEROLOS_SFWAT';
}`,
    `git commit -m "feat: implement neural interface"
git push origin master
[OK] deployment successful`,
    `npm install @syntax/core --save
[DONE] 142 packages updated
vulnerabilities: 0`,
    `SELECT * FROM projects 
WHERE status = 'STABLE'
ORDER BY priority DESC;`,
    `while(alive) {
  eat();
  sleep();
  code();
  repeat();
}`
  ];

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      <div className="code-overlay animate-float">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="mb-8 opacity-40 text-[#61AFEF]">
            {codeSnippets[i % codeSnippets.length]}
          </div>
        ))}
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={`dup-${i}`} className="mb-8 opacity-40 text-[#C678DD]">
            {codeSnippets[i % codeSnippets.length]}
          </div>
        ))}
      </div>
    </div>
  );
};

const Layout = ({ children }: { children: React.ReactNode }) => {
  const [terminalText, setTerminalText] = useState('');
  const fullText = 'SYSTEM_OPERATOR // FULL_STACK_DEVELOPER';

  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      setTerminalText(fullText.slice(0, i));
      i++;
      if (i > fullText.length) clearInterval(timer);
    }, 50);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#0F1117] text-[#ABB2BF] selection:bg-[#61AFEF] selection:text-black relative overflow-hidden font-mono flex flex-col">
      {/* Background Effects */}
      <CodeBackground />
      <div className="fixed inset-0 bg-code pointer-events-none"></div>
      <div className="scanline"></div>

      <header className="relative z-10 p-6 md:p-12 border-b border-[#ABB2BF]/10 backdrop-blur-md bg-[#0F1117]/80">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-4 w-full md:w-auto">
            <div className="flex items-center gap-3">
              <Terminal className="text-[#61AFEF] shrink-0" size={28} />
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[#ECEFF4] break-words">
                <span className="text-[#98C379] font-normal opacity-80">dev </span>KEROLOS<span className="text-[#C678DD]">_</span>SFWAT
              </h1>
            </div>
            <p className="text-[10px] md:text-sm opacity-60 tracking-widest uppercase truncate">
              {terminalText}<span className="animate-pulse text-[#61AFEF]">|</span>
            </p>
            
            <nav className="flex flex-wrap gap-4 md:gap-8 pt-2">
              <NavLink to="/" className={({ isActive }) => cn("text-[10px] md:text-xs uppercase tracking-widest hover:text-[#61AFEF] transition-all border-b-2 border-transparent pb-1", isActive && "text-[#61AFEF] border-[#61AFEF]")}>
                [ PROJECTS ]
              </NavLink>
              <NavLink to="/about" className={({ isActive }) => cn("text-[10px] md:text-xs uppercase tracking-widest hover:text-[#61AFEF] transition-all border-b-2 border-transparent pb-1", isActive && "text-[#61AFEF] border-[#61AFEF]")}>
                [ ABOUT ]
              </NavLink>
              <NavLink to="/contact" className={({ isActive }) => cn("text-[10px] md:text-xs uppercase tracking-widest hover:text-[#61AFEF] transition-all border-b-2 border-transparent pb-1", isActive && "text-[#61AFEF] border-[#61AFEF]")}>
                [ CONTACT ]
              </NavLink>
            </nav>
          </div>
          <div className="flex flex-row md:flex-col items-center md:items-end gap-4 md:gap-2 text-[9px] md:text-[10px] uppercase opacity-50 w-full md:w-auto justify-between md:justify-end border-t border-[#ABB2BF]/10 pt-4 md:border-t-0 md:pt-0">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#98C379] animate-pulse"></div>
              STATUS: ACTIVE
            </div>
            <div className="flex items-center gap-2">
              <Cpu size={10} className="text-[#D19A66]" /> ARCH: X64
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto py-12 md:py-16 px-6 md:px-12 flex-1 w-full">
        {children}
      </main>

      {/* Footer */}
      <footer className="relative z-10 p-8 md:p-12 border-t border-[#ABB2BF]/10 bg-[#0F1117]/90 backdrop-blur-md mt-auto w-full">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 md:gap-8">
          <div className="space-y-1 text-center md:text-left">
            <p className="text-[9px] opacity-40 uppercase tracking-widest">
              [ SECURE_SHELL_V4.2 ]
            </p>
            <p className="text-[10px] md:text-xs opacity-60">© 2026 KEROLOS_SFWAT // COMPILED_WITH_PASSION</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="flex gap-6 items-center">
              <a href="#" className="text-[9px] md:text-[10px] uppercase hover:text-[#61AFEF] transition-colors">GITHUB</a>
              <a href="#" className="text-[9px] md:text-[10px] uppercase hover:text-[#C678DD] transition-colors">LINKEDIN</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

const About = () => {
  return (
    <Layout>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-12"
      >
        <div className="space-y-4">
          <h2 className="text-2xl md:text-3xl font-bold text-[#ECEFF4] flex items-center gap-3">
            <User className="text-[#61AFEF]" size={24} /> PROFILE_OVERVIEW
          </h2>
          <div className="h-0.5 w-32 bg-[#61AFEF]/30"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-6">
            <div className="p-6 border border-[#ABB2BF]/10 bg-[#161B22]/40 rounded-lg space-y-4">
              <p className="text-sm md:text-base leading-relaxed text-[#ABB2BF]">
                I am a <span className="text-[#61AFEF]">Full-Stack Developer</span> with a deep passion for building robust, scalable, and visually compelling digital experiences. My journey in technology is driven by a constant desire to solve complex problems and master new paradigms.
              </p>
              <p className="text-sm md:text-base leading-relaxed text-[#ABB2BF]">
                With expertise in modern web technologies, I bridge the gap between elegant user interfaces and powerful backend architectures. I believe in writing clean, maintainable code that stands the test of time.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border border-[#ABB2BF]/10 bg-[#161B22]/20 rounded-lg">
                <h4 className="text-[10px] uppercase tracking-widest text-[#C678DD] mb-2">Experience</h4>
                <p className="text-lg font-bold text-[#ECEFF4]">5+ YEARS</p>
              </div>
              <div className="p-4 border border-[#ABB2BF]/10 bg-[#161B22]/20 rounded-lg">
                <h4 className="text-[10px] uppercase tracking-widest text-[#98C379] mb-2">Projects</h4>
                <p className="text-lg font-bold text-[#ECEFF4]">50+ COMPLETED</p>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <h3 className="text-lg font-bold uppercase tracking-widest text-[#ECEFF4] flex items-center gap-2">
              <Layers className="text-[#D19A66]" size={18} /> CORE_COMPETENCIES
            </h3>
            
            <div className="space-y-6">
              {[
                { name: 'FRONTEND_DEVELOPMENT', skills: ['React', 'TypeScript', 'Tailwind', 'Framer Motion'], icon: <Globe size={16} className="text-[#61AFEF]" /> },
                { name: 'BACKEND_ARCHITECTURE', skills: ['Node.js', 'Express', 'Firebase', 'PostgreSQL'], icon: <Database size={16} className="text-[#C678DD]" /> },
                { name: 'SYSTEM_DESIGN', skills: ['Microservices', 'REST APIs', 'Cloud Deployment'], icon: <Cpu size={16} className="text-[#D19A66]" /> }
              ].map((category, idx) => (
                <div key={idx} className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#ABB2BF]">
                    {category.icon} {category.name}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {category.skills.map(skill => (
                      <span key={skill} className="text-[10px] px-3 py-1 border border-[#ABB2BF]/10 bg-[#161B22]/40 rounded text-[#ABB2BF]">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </Layout>
  );
};

const Contact = () => {
  const [sent, setSent] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'contacts'), {
        ...formData,
        createdAt: Date.now()
      });
      setSent(true);
      setFormData({ name: '', email: '', message: '' });
      setTimeout(() => setSent(false), 5000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'contacts');
    }
  };

  return (
    <Layout>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-4xl mx-auto space-y-12"
      >
        <div className="text-center space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold text-[#ECEFF4] tracking-tight">ESTABLISH_CONNECTION</h2>
          <p className="text-xs md:text-sm text-[#ABB2BF] opacity-60 uppercase tracking-[0.3em]">Ready to collaborate on your next project</p>
          <div className="h-0.5 w-24 bg-[#61AFEF]/30 mx-auto"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1 space-y-6">
            <div className="p-6 border border-[#ABB2BF]/10 bg-[#161B22]/40 rounded-lg space-y-4">
              <div className="space-y-1">
                <h4 className="text-[10px] uppercase tracking-widest text-[#61AFEF]">Email</h4>
                <p className="text-sm text-[#ECEFF4]">contact@kerolos.dev</p>
              </div>
              <div className="space-y-1">
                <h4 className="text-[10px] uppercase tracking-widest text-[#C678DD]">Location</h4>
                <p className="text-sm text-[#ECEFF4]">Cairo, Egypt // Remote</p>
              </div>
              <div className="space-y-1">
                <h4 className="text-[10px] uppercase tracking-widest text-[#98C379]">Availability</h4>
                <p className="text-sm text-[#ECEFF4]">Available for Freelance</p>
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            <form onSubmit={handleSubmit} className="p-8 border border-[#ABB2BF]/10 bg-[#161B22]/40 rounded-lg space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-[#ABB2BF]">Name</label>
                  <input required type="text" className="w-full bg-[#0F1117] border border-[#ABB2BF]/20 rounded p-3 text-sm focus:border-[#61AFEF] outline-none transition-colors" placeholder="IDENTIFY_YOURSELF" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-[#ABB2BF]">Email</label>
                  <input required type="email" className="w-full bg-[#0F1117] border border-[#ABB2BF]/20 rounded p-3 text-sm focus:border-[#61AFEF] outline-none transition-colors" placeholder="RETURN_ADDRESS" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-[#ABB2BF]">Message</label>
                <textarea required rows={5} className="w-full bg-[#0F1117] border border-[#ABB2BF]/20 rounded p-3 text-sm focus:border-[#61AFEF] outline-none transition-colors resize-none" placeholder="TRANSMIT_DATA..." value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})}></textarea>
              </div>
              <button type="submit" className="w-full py-4 bg-[#61AFEF] text-black font-bold uppercase tracking-widest hover:bg-[#C678DD] transition-all rounded flex items-center justify-center gap-3 group">
                {sent ? (
                  <>DATA_TRANSMITTED <ChevronRight size={18} /></>
                ) : (
                  <>SEND_MESSAGE <Send size={18} className="group-hover:translate-x-1 transition-transform" /></>
                )}
              </button>
            </form>
          </div>
        </div>
      </motion.div>
    </Layout>
  );
};

const Portfolio = () => {
  const { projects, loading } = useProjects();

  return (
    <Layout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 md:mb-12 gap-4">
        <div className="space-y-1">
          <h2 className="text-lg md:text-xl font-bold uppercase tracking-widest flex items-center gap-3 text-[#ECEFF4]">
            <Code2 className="text-[#C678DD]" size={18} /> PROJECT_REPOSITORY
          </h2>
          <div className="h-0.5 w-20 bg-[#61AFEF]/30"></div>
        </div>
        <div className="flex gap-4 md:gap-6 text-[9px] md:text-[10px] uppercase opacity-40 font-mono">
          <span className="border-r border-[#ABB2BF]/20 pr-4 md:pr-6">ENTRIES: {projects.length}</span>
          <span>ENV: CLOUD_FIRESTORE</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {projects.map(project => (
          <div key={project.id}>
            <ProjectCard project={project} />
          </div>
        ))}
        {!loading && projects.length === 0 && (
          <div className="p-24 text-center border border-dashed border-[#ABB2BF]/10 rounded-xl bg-[#161B22]/20">
            <p className="opacity-40 text-xs tracking-widest">
              EMPTY_REPOSITORY: NO_OBJECTS_DETECTED
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};

const Admin = () => {
  const { projects, loading: projectsLoading, addProject, updateProject, deleteProject } = useProjects();
  const { contacts, loading: contactsLoading } = useContacts();
  const [activeTab, setActiveTab] = useState<'projects' | 'contacts'>('projects');
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Project>>({
    title: '',
    description: '',
    githubLink: '',
    liveLink: '',
    imageUrl: '',
    duration: '',
    tags: [],
    status: 'STABLE',
    color: '#61AFEF'
  });
  const [tagInput, setTagInput] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description) return;

    if (isEditing) {
      await updateProject(isEditing, formData);
      setIsEditing(null);
    } else {
      await addProject(formData as Omit<Project, 'id' | 'createdAt'>);
    }
    setFormData({ title: '', description: '', githubLink: '', liveLink: '', imageUrl: '', duration: '', tags: [] });
  };

  const handleEdit = (project: Project) => {
    setIsEditing(project.id);
    setFormData(project);
  };

  if (projectsLoading || contactsLoading) return null;

  return (
    <div className="min-h-screen bg-[#0F1117] text-[#ABB2BF] p-4 md:p-8 font-mono">
      <div className="max-w-4xl mx-auto">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 md:mb-12 border-b border-[#ABB2BF]/10 pb-6 gap-4">
          <div className="flex gap-4">
            <button onClick={() => setActiveTab('projects')} className={cn("text-[10px] md:text-xs hover:text-[#61AFEF]", activeTab === 'projects' && "text-[#61AFEF]")}>PROJECTS</button>
            <button onClick={() => setActiveTab('contacts')} className={cn("text-[10px] md:text-xs hover:text-[#61AFEF]", activeTab === 'contacts' && "text-[#61AFEF]")}>CONTACTS</button>
            <Link to="/" className="text-[10px] md:text-xs hover:text-[#61AFEF] opacity-60 flex items-center gap-2">
              <ExternalLink size={12} /> BACK_TO_SITE
            </Link>
          </div>
        </header>

        {activeTab === 'projects' ? (
          <>
            {/* Form Section */}
            <section className="bg-[#161B22]/40 p-6 md:p-8 rounded-xl mb-8 md:mb-12 border border-[#ABB2BF]/10 backdrop-blur-sm">
              <h2 className="text-[10px] md:text-sm mb-6 opacity-60 uppercase tracking-widest text-[#C678DD]">
                {isEditing ? 'EDIT_PROJECT_ENTRY' : 'CREATE_NEW_ENTRY'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase opacity-40">Project Title</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Neural Interface" 
                    className="w-full bg-[#0F1117]/50 border border-[#ABB2BF]/20 rounded p-3 focus:border-[#61AFEF] outline-none transition-colors text-sm"
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase opacity-40">Description</label>
                  <textarea 
                    placeholder="Detailed project breakdown..." 
                    className="w-full bg-[#0F1117]/50 border border-[#ABB2BF]/20 rounded p-3 focus:border-[#61AFEF] outline-none transition-colors h-32 resize-none text-sm"
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase opacity-40">Github Source</label>
                    <input 
                      type="url" 
                      placeholder="https://github.com/..." 
                      className="w-full bg-[#0F1117]/50 border border-[#ABB2BF]/20 rounded p-3 focus:border-[#61AFEF] outline-none transition-colors text-sm"
                      value={formData.githubLink}
                      onChange={e => setFormData({...formData, githubLink: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase opacity-40">Live Deployment</label>
                    <input 
                      type="url" 
                      placeholder="https://demo.app/..." 
                      className="w-full bg-[#0F1117]/50 border border-[#ABB2BF]/20 rounded p-3 focus:border-[#61AFEF] outline-none transition-colors text-sm"
                      value={formData.liveLink}
                      onChange={e => {
                        const url = e.target.value;
                        setFormData({
                          ...formData, 
                          liveLink: url,
                          imageUrl: url ? `https://image.thum.io/get/width/800/crop/600/${url}` : formData.imageUrl
                        });
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase opacity-40">Status</label>
                    <select 
                      className="w-full bg-[#0F1117]/50 border border-[#ABB2BF]/20 rounded p-3 focus:border-[#61AFEF] outline-none transition-colors text-sm"
                      value={formData.status}
                      onChange={e => setFormData({...formData, status: e.target.value as any})}
                    >
                      <option value="STABLE">STABLE</option>
                      <option value="BETA">BETA</option>
                      <option value="EXPERIMENTAL">EXPERIMENTAL</option>
                      <option value="DEPRECATED">DEPRECATED</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase opacity-40">Accent Color</label>
                    <input 
                      type="color" 
                      className="w-full h-[46px] bg-[#0F1117]/50 border border-[#ABB2BF]/20 rounded p-1 focus:border-[#61AFEF] outline-none transition-colors"
                      value={formData.color}
                      onChange={e => setFormData({...formData, color: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase opacity-40">Duration</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 3 Months..." 
                      className="w-full bg-[#0F1117]/50 border border-[#ABB2BF]/20 rounded p-3 focus:border-[#61AFEF] outline-none transition-colors text-sm"
                      value={formData.duration || ''}
                      onChange={e => setFormData({...formData, duration: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase opacity-40">Project Image (JPG/PNG)</label>
                  <input 
                    type="file" 
                    accept="image/png, image/jpeg"
                    className="w-full bg-[#0F1117]/50 border border-[#ABB2BF]/20 rounded p-3 focus:border-[#61AFEF] outline-none transition-colors text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-bold file:bg-[#61AFEF] file:text-black hover:file:bg-[#61AFEF]/90"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setFormData({...formData, imageUrl: reader.result as string});
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </div>
                
                <div className="space-y-3">
                  <label className="text-[10px] uppercase opacity-40">Technologies / Tags</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Add tag and press Enter" 
                      className="flex-1 bg-[#0F1117]/50 border border-[#ABB2BF]/20 rounded p-3 focus:border-[#61AFEF] outline-none transition-colors text-sm"
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (tagInput.trim()) {
                            setFormData({...formData, tags: [...(formData.tags || []), tagInput.trim()]});
                            setTagInput('');
                          }
                        }
                      }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.tags?.map((tag, i) => (
                      <span key={i} className="text-[9px] bg-[#61AFEF]/10 text-[#61AFEF] border border-[#61AFEF]/20 px-2 py-1 rounded flex items-center gap-2">
                        {tag.toUpperCase()} <X size={10} className="cursor-pointer hover:text-white" onClick={() => setFormData({...formData, tags: formData.tags?.filter((_, idx) => idx !== i)})} />
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <button type="submit" className="flex-1 bg-[#61AFEF] text-black py-3 rounded font-bold hover:bg-[#61AFEF]/90 transition-all flex items-center justify-center gap-2">
                    <Save size={18} /> {isEditing ? 'UPDATE_RECORD' : 'COMMIT_CHANGES'}
                  </button>
                  {isEditing && (
                    <button 
                      type="button" 
                      onClick={() => {
                        setIsEditing(null);
                        setFormData({ title: '', description: '', githubLink: '', liveLink: '', imageUrl: '', duration: '', tags: [] });
                      }}
                      className="px-8 py-3 border border-[#ABB2BF]/20 rounded hover:bg-[#ABB2BF]/5 transition-colors text-sm"
                    >
                      ABORT
                    </button>
                  )}
                </div>
              </form>
            </section>

            {/* List Section */}
            <section>
              <h2 className="text-[10px] md:text-sm mb-6 opacity-60 uppercase tracking-widest text-[#98C379]">DATABASE_RECORDS</h2>
              <div className="space-y-3">
                {projects.map(p => (
                  <div key={p.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border border-[#ABB2BF]/10 rounded-lg hover:bg-[#161B22]/40 transition-all gap-4">
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-[#ECEFF4]">{p.title}</h3>
                      <p className="text-[9px] opacity-40 font-mono">ID: {p.id.slice(0, 8)} // DATE: {new Date(p.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto justify-end">
                      <button onClick={() => handleEdit(p)} className="p-2 border border-[#ABB2BF]/10 rounded hover:bg-[#61AFEF]/10 hover:text-[#61AFEF] transition-all">
                        <Edit3 size={16} />
                      </button>
                      <button onClick={() => deleteProject(p.id)} className="p-2 border border-[#ABB2BF]/10 rounded hover:bg-red-500/10 hover:text-red-400 transition-all">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : (
          <section>
            <h2 className="text-[10px] md:text-sm mb-6 opacity-60 uppercase tracking-widest text-[#98C379]">CONTACT_MESSAGES</h2>
            <div className="space-y-3">
              {contacts.map(c => (
                <div key={c.id} className="p-4 border border-[#ABB2BF]/10 rounded-lg bg-[#161B22]/40 gap-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-sm font-bold text-[#ECEFF4]">{c.name}</h3>
                    <p className="text-[9px] opacity-40 font-mono">{new Date(c.createdAt).toLocaleString()}</p>
                  </div>
                  <p className="text-xs text-[#61AFEF] mb-2">{c.email}</p>
                  <p className="text-sm text-[#ABB2BF]">{c.message}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default function App() {
  useEffect(() => {
    console.log("SYSTEM_INIT: Router mounting...");
    console.log("SYSTEM_INIT: Current Path:", window.location.pathname);
  }, []);

  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/" element={<Portfolio />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/admin-panel" element={<Admin />} />
          <Route path="*" element={<Portfolio />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}
