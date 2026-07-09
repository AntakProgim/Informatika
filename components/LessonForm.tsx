import React, { useState } from 'react';
import { Loader2, Sparkles, Plus, X, Link as LinkIcon, FileText } from 'lucide-react';
import { GeneratorParams } from '../types';

interface LessonFormProps {
  onSubmit: (params: GeneratorParams) => void;
  isLoading: boolean;
}

const LessonForm: React.FC<LessonFormProps> = ({ onSubmit, isLoading }) => {
  const [topic, setTopic] = useState('');
  const [grade, setGrade] = useState('5 klasė'); // Changed default to 5th grade
  const [context, setContext] = useState('');
  
  const [links, setLinks] = useState<string[]>([]);
  const [currentLink, setCurrentLink] = useState('');
  
  const [files, setFiles] = useState<{name: string, data: string, mimeType: string}[]>([]);

  const handleAddLink = () => {
    if (currentLink.trim()) {
      setLinks([...links, currentLink.trim()]);
      setCurrentLink('');
    }
  };

  const handleRemoveLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // Cast to File[] to ensure TS knows the type of elements inside map
      const newFiles = Array.from(e.target.files) as File[];
      const processedFiles = await Promise.all(newFiles.map(async (file) => {
        return new Promise<{name: string, data: string, mimeType: string}>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve({
              name: file.name,
              data: base64,
              mimeType: file.type
            });
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }));
      setFiles([...files, ...processedFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    onSubmit({ 
      topic, 
      grade, 
      context,
      additionalLinks: links,
      uploadedFiles: files
    });
  };

  const gradeOptions = [
    '1 klasė', '2 klasė', '3 klasė', '4 klasė',
    '5 klasė', '6 klasė', '7 klasė', '8 klasė',
    '9 klasė (I gimnazijos)', '10 klasė (II gimnazijos)',
    '11 klasė (III gimnazijos)', '12 klasė (IV gimnazijos)'
  ];

  const itTopics = [
    'Algoritmai ir programavimas',
    'Python pagrindai',
    'Ciklai (for, while)',
    'Sąlygos sakiniai (if, else)',
    'Duomenų tipai ir kintamieji',
    'Funkcijos ir procedūros',
    'Sąrašai ir masyvai',
    'Objektinis programavimas',
    'Duomenų sauga ir privatumas',
    'Kibernetinis saugumas',
    'Kompiuterių tinklai ir internetas',
    'Debesų komandija',
    'Dirbtinis intelektas ir mašininis mokymasis',
    'Duomenų bazės ir SQL',
    'HTML ir CSS pagrindai',
    'Tinklalapių kūrimas',
    'Grafinis dizainas ir multimedija',
    'Skaitmeninis raštingumas',
    'Informacinės sistemos',
    'Algoritmų sudėtingumas',
    'Rūšiavimo algoritmai',
    'Paieškos algoritmai',
    'Logikos uždaviniai (Bebras)',
    'Robotika ir mikrovaldikliai (Micro:bit)',
    '3D modeliavimas ir spausdinimas'
  ];

  return (
    <div className="bg-white shadow-sm rounded-xl border border-gray-200 p-6 md:p-8">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-yellow-500" />
          Generuoti metodinę medžiagą
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Įveskite temą, o DI parengs planą pagal bendrąsias programas.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="grade" className="block text-sm font-medium text-gray-700 mb-1">
            Klasė
          </label>
          <select
            id="grade"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="w-full rounded-lg border-gray-300 border p-2.5 focus:border-primary focus:ring-primary sm:text-sm shadow-sm"
          >
            {gradeOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="topic" className="block text-sm font-medium text-gray-700 mb-1">
            Pamokos tema
          </label>
          <input
            type="text"
            id="topic"
            list="it-topics-list"
            placeholder="Pvz.: Python ciklai, Duomenų sauga, Logikos pradmenys..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full rounded-lg border-gray-300 border p-2.5 focus:border-primary focus:ring-primary sm:text-sm shadow-sm"
            required
          />
          <datalist id="it-topics-list">
            {itTopics.map((t, i) => (
              <option key={i} value={t} />
            ))}
          </datalist>
        </div>

        {/* User Content Section */}
        <div className="border-t border-gray-100 pt-4 mt-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Mokytojo medžiaga (šaltiniai)</h3>
            
            {/* Link Input */}
            <div className="mb-4">
                <label className="block text-xs font-medium text-gray-500 mb-1">Pridėti nuorodą</label>
                <div className="flex gap-2">
                    <input
                        type="url"
                        placeholder="https://..."
                        value={currentLink}
                        onChange={(e) => setCurrentLink(e.target.value)}
                        className="flex-1 rounded-lg border-gray-300 border p-2 text-sm focus:border-primary focus:ring-primary"
                    />
                    <button 
                        type="button" 
                        onClick={handleAddLink}
                        disabled={!currentLink.trim()}
                        className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                    >
                        <Plus className="h-4 w-4" />
                    </button>
                </div>
                {links.length > 0 && (
                    <ul className="mt-2 space-y-1">
                        {links.map((link, idx) => (
                            <li key={idx} className="flex items-center justify-between bg-gray-50 px-2 py-1 rounded text-xs text-gray-600">
                                <span className="truncate flex-1 mr-2"><LinkIcon className="h-3 w-3 inline mr-1"/>{link}</span>
                                <button type="button" onClick={() => handleRemoveLink(idx)} className="text-red-500 hover:text-red-700">
                                    <X className="h-3 w-3" />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* File Input */}
            <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Pridėti failus (PDF)</label>
                <div className="flex items-center justify-center w-full">
                    <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <FileText className="w-6 h-6 text-gray-400 mb-2" />
                            <p className="text-xs text-gray-500"><span className="font-semibold">Spauskite įkelti</span> arba įtempkite</p>
                            <p className="text-[10px] text-gray-500">PDF (MAX. 5MB)</p>
                        </div>
                        <input id="dropzone-file" type="file" className="hidden" accept="application/pdf" multiple onChange={handleFileChange} />
                    </label>
                </div>
                {files.length > 0 && (
                     <ul className="mt-2 space-y-1">
                        {files.map((file, idx) => (
                            <li key={idx} className="flex items-center justify-between bg-blue-50 px-2 py-1 rounded text-xs text-blue-700">
                                <span className="truncate flex-1 mr-2"><FileText className="h-3 w-3 inline mr-1"/>{file.name}</span>
                                <button type="button" onClick={() => handleRemoveFile(idx)} className="text-red-500 hover:text-red-700">
                                    <X className="h-3 w-3" />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>

        <div>
          <label htmlFor="context" className="block text-sm font-medium text-gray-700 mb-1 mt-4">
            Papildomi nurodymai (neprivaloma)
          </label>
          <textarea
            id="context"
            rows={2}
            placeholder="Pvz.: Akcentuoti Bebras uždavinių sprendimą..."
            value={context}
            onChange={(e) => setContext(e.target.value)}
            className="w-full rounded-lg border-gray-300 border p-2.5 focus:border-primary focus:ring-primary sm:text-sm shadow-sm"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !topic.trim()}
          className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all ${
            (isLoading || !topic.trim()) ? 'opacity-70 cursor-not-allowed' : ''
          }`}
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
              Generuojama...
            </>
          ) : (
            'Sukurti pamokos planą'
          )}
        </button>
      </form>
    </div>
  );
};

export default LessonForm;