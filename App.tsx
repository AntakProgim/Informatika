import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import LessonForm from './components/LessonForm';
import LessonResult from './components/LessonResult';
import { generateLessonPlan } from './services/geminiService';
import { storageService } from './services/storageService';
import { LessonPlan, GeneratorParams, SavedLessonPlan } from './types';
import { LayoutDashboard, Save, Trash2, ChevronRight, UploadCloud, Loader2, CheckCircle2 } from 'lucide-react';

const App: React.FC = () => {
  const [lessonPlan, setLessonPlan] = useState<LessonPlan | null>(null);
  const [savedPlans, setSavedPlans] = useState<SavedLessonPlan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [planToDelete, setPlanToDelete] = useState<string | null>(null);

  // Load saved plans from IndexedDB on mount
  useEffect(() => {
    loadSavedPlans();
  }, []);

  const loadSavedPlans = async () => {
    try {
      const plans = await storageService.getAllPlans();
      setSavedPlans(plans);
    } catch (err) {
      console.error("Failed to load plans from DB", err);
    }
  };

  const handleGenerate = async (params: GeneratorParams) => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    setLessonPlan(null);
    setCurrentPlanId(null);

    try {
      const result = await generateLessonPlan(params);
      setLessonPlan(result);
    } catch (err: any) {
      const msg = err?.message || "Nepavyko sugeneruoti pamokos plano. Patikrinkite API raktą arba bandykite vėliau.";
      setError(msg);
      console.error("Generavimo klaida:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePlan = async () => {
    if (!lessonPlan) return;
    
    const newPlan: SavedLessonPlan = {
      ...lessonPlan,
      id: Date.now().toString(),
      createdAt: Date.now(),
    };

    try {
      await storageService.savePlan(newPlan);
      await loadSavedPlans(); // Reload list
      setCurrentPlanId(newPlan.id);
    } catch (err) {
      console.error("Failed to save plan", err);
      setError("Nepavyko išsaugoti plano į duomenų bazę.");
    }
  };

  const handleDeletePlan = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      await storageService.deletePlan(id);
      await loadSavedPlans(); // Reload list
      
      if (currentPlanId === id) {
          setLessonPlan(null);
          setCurrentPlanId(null);
      }
      setPlanToDelete(null);
    } catch (err) {
      console.error("Failed to delete plan", err);
    }
  };

  const confirmDelete = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setPlanToDelete(id);
  };

  const cancelDelete = (e: React.MouseEvent) => {
      e.stopPropagation();
      setPlanToDelete(null);
  };

  const handleSelectPlan = (plan: SavedLessonPlan) => {
    setLessonPlan(plan);
    setCurrentPlanId(plan.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setError(null);
    setSuccessMessage(null);
    e.target.value = ''; // Reset input to allow importing the same file again

    try {
      // Simulate slightly longer loading for visual feedback
      await new Promise(resolve => setTimeout(resolve, 800));
      const text = await file.text();
      
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (parseError) {
        throw new Error('Neteisingas failo formatas. Nepavyko nuskaityti JSON struktūros.');
      }
      
      if (!Array.isArray(parsed)) {
        throw new Error('Neteisingas failo turinys. Tikėtasi planų sąrašo paketo.');
      }
      
      const validPlans = parsed.filter(p => p.id && p.topic && p.grade);
      
      if (validPlans.length === 0) {
        throw new Error('Faile nerasta tinkamų pamokų planų.');
      }

      await storageService.importPlans(validPlans);
      await loadSavedPlans();
      
      setSuccessMessage(`Sėkmingai importuota ${validPlans.length} planų!`);
      // Hide success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      
    } catch (err) {
      console.error("Failed to import plans", err);
      setError(err instanceof Error ? err.message : "Įvyko nenumatyta klaida importuojant failą.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="print:hidden">
        <Header />
      </div>
      
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 print:p-0 print:w-full print:max-w-none">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 print:block">
          {/* Left Column: Input & Saved Plans */}
          <div className="lg:col-span-4 space-y-6 print:hidden">
            <LessonForm onSubmit={handleGenerate} isLoading={isLoading} />
            
            {/* Saved Plans List */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm transition-all">
                <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                    <h4 className="font-semibold text-gray-900 flex items-center">
                        <Save className="h-4 w-4 mr-2 text-primary" />
                        Išsaugoti planai ({savedPlans.length})
                    </h4>
                    <div>
                        <input 
                            type="file" 
                            accept=".json" 
                            ref={fileInputRef} 
                            className="hidden" 
                            onChange={handleImportFile} 
                        />
                        <button
                            type="button"
                            onClick={handleImportClick}
                            disabled={isImporting}
                            className="text-xs font-medium text-blue-700 bg-blue-50 px-2.5 py-1.5 rounded-lg flex items-center hover:bg-blue-100 transition-colors disabled:opacity-50 border border-blue-200"
                            title="Importuoti planus iš .json failo"
                        >
                            {isImporting ? (
                                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                            ) : (
                                <UploadCloud className="h-4 w-4 mr-1.5" />
                            )}
                            {isImporting ? 'Importuojama...' : 'Importuoti'}
                        </button>
                    </div>
                </div>
                
                {isImporting && savedPlans.length === 0 ? (
                    <div className="p-8 text-center flex flex-col items-center justify-center space-y-3">
                        <Loader2 className="h-8 w-8 text-primary animate-spin" />
                        <p className="text-sm text-gray-500">Skaitomas failas...</p>
                    </div>
                ) : savedPlans.length === 0 ? (
                    <div className="p-8 text-center text-sm text-gray-500">
                        Nėra išsaugotų planų. Sistemoje galite importuoti arba sukurti naujus.
                    </div>
                ) : (
                    <ul className={`divide-y divide-gray-100 max-h-64 overflow-y-auto ${isImporting ? 'opacity-50 pointer-events-none' : ''}`}>
                        {savedPlans.map(plan => (
                            <li 
                                key={plan.id} 
                                onClick={() => handleSelectPlan(plan)}
                                className={`px-5 py-3 hover:bg-gray-50 cursor-pointer transition-colors flex justify-between items-center group ${currentPlanId === plan.id ? 'bg-blue-50 border-l-4 border-primary' : 'border-l-4 border-transparent'}`}
                            >
                                <div className="overflow-hidden mr-3">
                                    <p className={`text-sm font-medium truncate ${currentPlanId === plan.id ? 'text-primary' : 'text-gray-800'}`}>
                                        {plan.topic}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        {plan.grade} • {new Date(plan.createdAt).toLocaleDateString('lt-LT')}
                                    </p>
                                </div>
                                {planToDelete === plan.id ? (
                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={(e) => handleDeletePlan(plan.id, e)}
                                            className="text-white bg-red-500 hover:bg-red-600 px-2 py-1 rounded text-xs font-medium transition-colors"
                                            title="Tvirtinti ištrynimą"
                                        >
                                            Trinti
                                        </button>
                                        <button
                                            onClick={cancelDelete}
                                            className="text-gray-600 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-xs font-medium transition-colors"
                                            title="Atšaukti"
                                        >
                                            Atšaukti
                                        </button>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={(e) => confirmDelete(plan.id, e)}
                                        className="text-gray-400 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
                                        title="Ištrinti"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-sm text-blue-800">
              <h4 className="font-semibold flex items-center mb-2">
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Naudojami šaltiniai
              </h4>
              <p className="mb-2">Sistema remiasi:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li><a href="https://www.raspberrypi.org/curriculum/key-stage-2" target="_blank" rel="noreferrer" className="underline hover:text-blue-900">Raspberry Pi (Key Stage 2)</a></li>
                <li><a href="https://www.raspberrypi.org/curriculum/key-stage-4" target="_blank" rel="noreferrer" className="underline hover:text-blue-900">Raspberry Pi (Key Stage 4)</a></li>
                <li><a href="https://adacomputerscience.org/topics" target="_blank" rel="noreferrer" className="underline hover:text-blue-900">Ada Computer Science</a></li>
                <li><a href="https://experience-ai.org/lt/units" target="_blank" rel="noreferrer" className="underline hover:text-blue-900">Experience AI</a></li>
                <li><a href="https://smp.emokykla.lt/?Dalykai=2131" target="_blank" rel="noreferrer" className="underline hover:text-blue-900">SMP eMokykla (Informatika)</a></li>
                <li><a href="https://atviri.emokymai.vu.lt/course/view.php?id=220" target="_blank" rel="noreferrer" className="underline hover:text-blue-900">VU eMokymai</a></li>
                <li><a href="https://bebrasplay.com/lt/content/11-nemokamai" target="_blank" rel="noreferrer" className="underline hover:text-blue-900">Bebras (loginis mąstymas)</a></li>
                <li><a href="https://www.teachai.org/cs" target="_blank" rel="noreferrer" className="underline hover:text-blue-900">TeachAI</a></li>
                <li><a href="https://studio.code.org/catalog" target="_blank" rel="noreferrer" className="underline hover:text-blue-900">Code.org</a></li>
                <li><a href="https://www.theachievery.com/en" target="_blank" rel="noreferrer" className="underline hover:text-blue-900">The Achievery</a></li>
                <li><a href="https://www.raspberrypi.org/curriculum/gb" target="_blank" rel="noreferrer" className="underline hover:text-blue-900">Raspberry Pi (UK Curriculum)</a></li>
              </ul>
            </div>
          </div>

          {/* Right Column: Output */}
          <div className="lg:col-span-8 print:w-full">
            {successMessage && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6 flex items-center shadow-sm" role="alert">
                <CheckCircle2 className="h-5 w-5 mr-3 flex-shrink-0" />
                <span className="block sm:inline">{successMessage}</span>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 shadow-sm flex items-start" role="alert">
                <strong className="font-bold mr-2 mt-0.5">Klaida!</strong>
                <span className="block sm:inline flex-1">{error}</span>
              </div>
            )}

            {lessonPlan ? (
              <LessonResult 
                plan={lessonPlan} 
                onSave={handleSavePlan} 
                isSaved={!!currentPlanId}
              />
            ) : (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl bg-white p-8 text-center text-gray-500 print:hidden">
                {!isLoading && (
                  <>
                    <div className="bg-gray-100 p-4 rounded-full mb-4">
                        <LayoutDashboard className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Nėra sugeneruotos medžiagos</h3>
                    <p className="mt-1 text-sm text-gray-500">Užpildykite formą kairėje arba pasirinkite išsaugotą planą.</p>
                  </>
                )}
                {isLoading && (
                   <div className="space-y-4 w-full max-w-md">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto animate-pulse"></div>
                      <div className="h-32 bg-gray-200 rounded w-full animate-pulse mt-8"></div>
                   </div>
                )}
              </div>
            )}
          </div>
        </div>

      </main>

      <footer className="bg-white border-t border-gray-200 mt-auto print:hidden">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Informatikos DI metodinė medžiaga. Sukurta mokytojams.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;