import React, { useRef, useState } from 'react';
import { LessonPlan } from '../types';
import { FileText, Clock, Target, BookOpen, Activity, Paperclip, ExternalLink, HelpCircle, Printer, Save, CheckCircle, BarChart3, Briefcase, ListChecks, Download, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { marked } from 'marked';

interface LessonResultProps {
  plan: LessonPlan;
  onSave?: () => void;
  isSaved?: boolean;
}

const LessonResult: React.FC<LessonResultProps> = ({ plan, onSave, isSaved }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const handleExportTxt = () => {
    let content = `
PAMOKOS PLANAS: ${plan.topic}
Klasė: ${plan.grade}
Trukmė: ${plan.duration}

1. ĮŽANGA
${plan.introduction}

2. PAMOKOS TIKSLAS
${plan.goal}

3. TEORINĖ MEDŽIAGA
${plan.theoryContent}

4. ĮTVIRTINIMO UŽDUOTYS (3 Lygiai)
   I. Pradedantysis (Level 1):
${plan.consolidationTasks.level1.map(t => `   - ${t}`).join('\n')}
   
   II. Vidutinis (Level 2):
${plan.consolidationTasks.level2.map(t => `   - ${t}`).join('\n')}
   
   III. Pažengęs (Level 3):
${plan.consolidationTasks.level3.map(t => `   - ${t}`).join('\n')}

5. PRAKTINĖS UŽDUOTYS (3 Lygiai)
   I. Pradedantysis (Level 1):
${plan.practicalTasks.level1.map(t => `   - ${t}`).join('\n')}
   
   II. Vidutinis (Level 2):
${plan.practicalTasks.level2.map(t => `   - ${t}`).join('\n')}
   
   III. Pažengęs (Level 3):
${plan.practicalTasks.level3.map(t => `   - ${t}`).join('\n')}

6. KONTROLINIAI KLAUSIMAI (REFLEKSIJA)
${plan.controlQuestions.map(q => `- ${q}`).join('\n')}

7. UGDYMAS KARJERAI
${plan.careerIntegration}
    `;

    if (plan.teacherResources && plan.teacherResources.length > 0) {
        content += `\n\n8. PAPILDOMA MEDŽIAGA (MOKYTOJO)\n`;
        plan.teacherResources.forEach(res => {
            content += `- [${res.type === 'link' ? 'Nuoroda' : 'Failas'}] ${res.name}\n`;
        });
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Pamoka_${plan.topic.replace(/\s+/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = async () => {
    if (!contentRef.current) return;
    setIsDownloading(true);

    try {
      // Add a temporary class for PDF styling
      contentRef.current.classList.add('pdf-export-mode');

      // Capture the entire content as a single canvas
      const canvas = await html2canvas(contentRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: contentRef.current.offsetWidth
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 15;
      const contentWidth = pageWidth - 2 * margin;
      const footerHeight = 10;
      const contentHeightPerPage = pageHeight - 2 * margin - footerHeight;

      const imgWidth = contentWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let remainingHeightPx = canvas.height;
      let srcY = 0;
      let pageNum = 1;

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Could not get canvas context");

      while (remainingHeightPx > 0) {
        if (pageNum > 1) {
          pdf.addPage();
        }

        // Header on each page
        pdf.setFontSize(8);
        pdf.setTextColor(150);
        pdf.text(`Informatikos pamokos medžiaga: ${plan.topic}`, margin, 10);
        
        // Page number
        pdf.text(`Puslapis ${pageNum}`, pageWidth / 2, pageHeight - 5, { align: 'center' });

        const availablePx = (contentHeightPerPage * canvas.width) / imgWidth;
        let sliceHeightPx = Math.min(remainingHeightPx, availablePx);

        // SMART SPLIT: Combine DOM analysis and pixel transitions
        if (remainingHeightPx > sliceHeightPx) {
          let cutY = srcY + sliceHeightPx;

          // 1. DOM-based dynamic height calculations
          // Prevent cutting through critical elements like images, code blocks, or table rows
          if (contentRef.current) {
            const containerRect = contentRef.current.getBoundingClientRect();
            const scale = canvas.width / contentRef.current.offsetWidth;
            // Removed general text blocks from atomic avoidance to allow pixel scanning to split them
            const criticalElements = contentRef.current.querySelectorAll('img, pre, tr, h1, h2, h3, h4, h5, h6, .break-inside-avoid');
            
            let highestNeededTop = cutY;

            Array.from(criticalElements).forEach((el: Element) => {
              const rect = el.getBoundingClientRect();
              const elTop = (rect.top - containerRect.top) * scale;
              const elBottom = (rect.bottom - containerRect.top) * scale;
              
              // If the proposed cut line falls within this element
              if (cutY > elTop && cutY < elBottom) {
                // If moving the cut up to the element's top doesn't leave the page too empty (at least 15% used)
                if (elTop > srcY + (sliceHeightPx * 0.15) && elTop < highestNeededTop) {
                  highestNeededTop = elTop;
                }
              }
            });

            cutY = highestNeededTop;
          }

          // 2. Pixel Transition Scanner
          // Find a clean gap between lines of text by scanning pixel rows
          // Only scan if we haven't already heavily adjusted the cut line via DOM
          if (cutY === srcY + sliceHeightPx || cutY > srcY + sliceHeightPx * 0.8) {
            const searchLimit = Math.floor((cutY - srcY) * 0.35); // scan up to 35% backwards
            let bestY = cutY;
            
            if (searchLimit > 0 && cutY - searchLimit > srcY) {
              const startScanY = Math.floor(cutY - searchLimit);
              const scanAreaHeight = searchLimit + 1;
              
              try {
                const imageData = ctx.getImageData(0, startScanY, canvas.width, scanAreaHeight);
                const data = imageData.data;
                let minTransitions = Infinity;
                let cleanRows = 0;
                
                // Scan from bottom to top to find the lowest possible clean break
                for (let y = searchLimit; y >= 0; y--) {
                  const checkY = startScanY + y;
                  if (checkY <= srcY) break;
                  
                  let transitions = 0;
                  const rowStartIdx = y * canvas.width * 4;
                  
                  // Sample every 4th pixel for performance, check horizontal color variations
                  for (let x = 4; x < canvas.width; x += 4) {
                    const idx = rowStartIdx + (x * 4);
                    const prevIdx = rowStartIdx + ((x - 4) * 4);
                    const rDiff = Math.abs(data[idx] - data[prevIdx]);
                    const gDiff = Math.abs(data[idx+1] - data[prevIdx+1]);
                    const bDiff = Math.abs(data[idx+2] - data[prevIdx+2]);
                    
                    if (rDiff > 10 || gDiff > 10 || bDiff > 10) {
                      transitions++;
                    }
                  }

                  if (transitions < minTransitions) {
                    minTransitions = transitions;
                    bestY = checkY;
                  }

                  // If perfectly clean row is found with few transitions (e.g. side borders only)
                  if (transitions <= 4) {
                    cleanRows++;
                    // Look for a band of whitespace, not just a single lucky row
                    if (cleanRows >= 3) {
                      bestY = checkY + 1;
                      break; 
                    }
                  } else {
                    cleanRows = 0;
                  }
                }
              } catch (e) {
                  console.warn("Pixel scanning failed:", e);
              }
            }
            cutY = bestY;
          }

          sliceHeightPx = cutY - srcY;
        }

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = sliceHeightPx;
        
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.fillStyle = '#ffffff';
          tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
          tempCtx.drawImage(
            canvas, 
            0, srcY, canvas.width, sliceHeightPx, 
            0, 0, tempCanvas.width, sliceHeightPx
          );
          
          const sliceImgData = tempCanvas.toDataURL('image/png', 0.95);
          const sliceHeightPdf = (sliceHeightPx * imgWidth) / canvas.width;
          
          pdf.addImage(sliceImgData, 'PNG', margin, margin, imgWidth, sliceHeightPdf);
          
          srcY += sliceHeightPx;
          remainingHeightPx -= sliceHeightPx;
          pageNum++;
        } else {
          break;
        }
      }

      pdf.save(`Pamoka_${plan.topic.replace(/\s+/g, '_')}.pdf`);

    } catch (error) {
      console.error("PDF generation failed:", error);
      alert("Nepavyko sugeneruoti PDF. Bandykite spausdinti (Ctrl+P).");
    } finally {
      if (contentRef.current) {
        contentRef.current.classList.remove('pdf-export-mode');
      }
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const renderTheoryContent = () => {
    try {
      // Configure marked for better rendering of nested structures and tables
      marked.setOptions({
        gfm: true,
        breaks: true,
        pedantic: false
      });
      const html = marked.parse(plan.theoryContent) as string;
      return { __html: html };
    } catch (e) {
      return { __html: plan.theoryContent };
    }
  };

  return (
    <div className="bg-white shadow-lg rounded-xl border border-gray-200 overflow-hidden print:shadow-none print:border-none">
      {/* Header Actions */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{plan.topic}</h2>
          <p className="text-sm text-gray-500">{plan.grade} • {plan.duration}</p>
        </div>
        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
           {onSave && (
            <button 
              onClick={onSave}
              disabled={isSaved}
              className={`inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary ${isSaved ? 'bg-green-100 text-green-800 cursor-default' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              {isSaved ? <CheckCircle className="h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {isSaved ? 'Išsaugota' : 'Išsaugoti'}
            </button>
          )}
          <button 
            onClick={handleDownloadPDF}
            disabled={isDownloading}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            {isDownloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            PDF
          </button>
          <button 
            onClick={handleExportTxt}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <FileText className="h-4 w-4 mr-2" />
            TXT
          </button>
          <button 
            onClick={handlePrint}
            className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <Printer className="h-4 w-4 mr-2" />
            Spausdinti
          </button>
        </div>
      </div>

      {/* Print-only Header */}
      <div className="hidden print:block px-6 py-4 border-b border-gray-200">
          <h1 className="text-3xl font-bold text-gray-900">{plan.topic}</h1>
          <p className="text-lg text-gray-600 mt-2">{plan.grade} • {plan.duration}</p>
      </div>

      {/* Content for Capture */}
      <div ref={contentRef} className="bg-white pdf-content-container">
        <div className="p-6 md:p-8 space-y-8 print:p-6 print:space-y-6">
            
            {/* Intro & Goal */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-1 print:gap-4">
            <div className="bg-blue-50 p-5 rounded-lg border border-blue-100 print:border print:bg-white print:p-0 print:border-none">
                <h3 className="text-lg font-semibold text-blue-900 flex items-center mb-3 print:text-black">
                <Clock className="h-5 w-5 mr-2 print:hidden" />
                1. Įžanga
                </h3>
                <p className="text-gray-700 leading-relaxed print:text-black">{plan.introduction}</p>
            </div>
            <div className="bg-green-50 p-5 rounded-lg border border-green-100 print:border print:bg-white print:p-0 print:border-none">
                <h3 className="text-lg font-semibold text-green-900 flex items-center mb-3 print:text-black">
                <Target className="h-5 w-5 mr-2 print:hidden" />
                2. Pamokos tikslas
                </h3>
                <p className="text-gray-700 leading-relaxed print:text-black">{plan.goal}</p>
            </div>
            </div>

            {/* Theory */}
            <div className="theory-section">
            <h3 className="text-xl font-bold text-gray-900 flex items-center mb-4 border-b pb-2 print:border-none">
                <BookOpen className="h-6 w-6 mr-2 text-primary print:hidden" />
                3. Teorinė medžiaga
            </h3>
            {/* Styled to support markdown content. Added prose-pre classes to ensure code blocks have visible text. */}
            <div className="prose prose-slate max-w-none text-gray-800 break-words bg-white p-6 rounded-lg border border-gray-200 shadow-sm prose-pre:bg-gray-800 prose-pre:text-gray-100 prose-pre:p-4 prose-pre:rounded-lg prose-pre:overflow-x-auto prose-table:w-full prose-table:border-collapse prose-th:bg-gray-50 prose-th:border prose-th:border-gray-200 prose-th:p-3 prose-td:border prose-td:border-gray-200 prose-td:p-3 prose-img:max-w-full prose-img:h-auto prose-img:rounded-lg print:bg-white print:p-0 print:border-none print:shadow-none print:prose-pre:bg-transparent print:prose-pre:text-black print:prose-pre:border print:prose-pre:border-gray-300">
                 <div dangerouslySetInnerHTML={renderTheoryContent()} />
            </div>
            </div>

            {/* Consolidation (Differentiated) */}
            <div className="break-inside-avoid">
                <h3 className="text-lg font-bold text-gray-900 flex items-center mb-4">
                <HelpCircle className="h-5 w-5 mr-2 text-purple-600 print:hidden" />
                4. Įtvirtinimas (Teorijos patikrinimas - 3 lygiai)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:grid-cols-1 print:gap-4">
                {/* Level 1 */}
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 print:bg-white print:border-gray-200">
                    <h4 className="font-bold text-purple-900 mb-2 border-b border-purple-200 pb-1">I. Pradedantysis</h4>
                    <ul className="list-disc list-outside pl-4 space-y-2">
                        {plan.consolidationTasks.level1.map((task, i) => (
                            <li key={i} className="text-gray-800 text-sm">{task}</li>
                        ))}
                    </ul>
                </div>
                {/* Level 2 */}
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 print:bg-white print:border-gray-200">
                    <h4 className="font-bold text-purple-900 mb-2 border-b border-purple-200 pb-1">II. Vidutinis</h4>
                    <ul className="list-disc list-outside pl-4 space-y-2">
                        {plan.consolidationTasks.level2.map((task, i) => (
                            <li key={i} className="text-gray-800 text-sm">{task}</li>
                        ))}
                    </ul>
                </div>
                {/* Level 3 */}
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 print:bg-white print:border-gray-200">
                    <h4 className="font-bold text-purple-900 mb-2 border-b border-purple-200 pb-1">III. Pažengęs</h4>
                    <ul className="list-disc list-outside pl-4 space-y-2">
                        {plan.consolidationTasks.level3.map((task, i) => (
                            <li key={i} className="text-gray-800 text-sm">{task}</li>
                        ))}
                    </ul>
                </div>
                </div>
            </div>

            {/* Practical Tasks (Differentiated) */}
            <div className="break-inside-avoid">
                <h3 className="text-lg font-bold text-gray-900 flex items-center mb-4">
                <Activity className="h-5 w-5 mr-2 text-orange-600 print:hidden" />
                5. Praktinės užduotys (Savarankiškas darbas)
                </h3>
                
                <div className="space-y-4">
                    {/* Level 1 */}
                    <div className="flex flex-col md:flex-row gap-4 bg-orange-50 p-4 rounded-lg border border-orange-100 print:bg-white print:border-gray-200">
                        <div className="md:w-48 flex-shrink-0">
                            <span className="inline-block px-3 py-1 rounded-full bg-orange-200 text-orange-800 text-xs font-bold uppercase">
                                1 Lygis: Pradedantysis
                            </span>
                        </div>
                        <div className="flex-grow">
                            <ul className="list-decimal list-outside pl-4 space-y-2">
                                {plan.practicalTasks.level1.map((task, i) => (
                                    <li key={i} className="text-gray-800 text-sm">{task}</li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Level 2 */}
                    <div className="flex flex-col md:flex-row gap-4 bg-orange-50 p-4 rounded-lg border border-orange-100 print:bg-white print:border-gray-200">
                        <div className="md:w-48 flex-shrink-0">
                            <span className="inline-block px-3 py-1 rounded-full bg-orange-200 text-orange-800 text-xs font-bold uppercase">
                                2 Lygis: Vidutinis
                            </span>
                        </div>
                        <div className="flex-grow">
                            <ul className="list-decimal list-outside pl-4 space-y-2">
                                {plan.practicalTasks.level2.map((task, i) => (
                                    <li key={i} className="text-gray-800 text-sm">{task}</li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Level 3 */}
                    <div className="flex flex-col md:flex-row gap-4 bg-orange-50 p-4 rounded-lg border border-orange-100 print:bg-white print:border-gray-200">
                        <div className="md:w-48 flex-shrink-0">
                            <span className="inline-block px-3 py-1 rounded-full bg-orange-200 text-orange-800 text-xs font-bold uppercase">
                                3 Lygis: Pažengęs
                            </span>
                        </div>
                        <div className="flex-grow">
                            <ul className="list-decimal list-outside pl-4 space-y-2">
                                {plan.practicalTasks.level3.map((task, i) => (
                                    <li key={i} className="text-gray-800 text-sm">{task}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
                
                <div className="mt-6 flex items-start gap-3 text-sm text-gray-500 bg-gray-50 p-4 rounded border border-gray-200">
                    <BarChart3 className="h-5 w-5 flex-shrink-0" />
                    <p>
                        <strong>Vertinimas:</strong> Mokytojas stebi mokinių darbą ir pažangą atliekant pasirinkto lygio užduotis. 
                        Formali vertinimo lentelė nenaudojama, skatinamas formuojamasis vertinimas.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 break-inside-avoid">
                {/* Control Questions */}
                <div className="bg-indigo-50 p-5 rounded-lg border border-indigo-100 print:bg-white print:border-gray-200">
                    <h3 className="text-lg font-bold text-indigo-900 flex items-center mb-3">
                        <ListChecks className="h-5 w-5 mr-2" />
                        6. Kontroliniai klausimai (Refleksija)
                    </h3>
                    <ul className="list-disc list-outside pl-4 space-y-2">
                        {plan.controlQuestions.map((q, idx) => (
                            <li key={idx} className="text-gray-800 text-sm">{q}</li>
                        ))}
                    </ul>
                </div>

                {/* Career Integration */}
                <div className="bg-teal-50 p-5 rounded-lg border border-teal-100 print:bg-white print:border-gray-200">
                    <h3 className="text-lg font-bold text-teal-900 flex items-center mb-3">
                        <Briefcase className="h-5 w-5 mr-2" />
                        7. Ugdymas karjerai
                    </h3>
                    <p className="text-gray-800 text-sm leading-relaxed">
                        {plan.careerIntegration}
                    </p>
                </div>
            </div>
            
            {/* User Attached Resources */}
            {plan.teacherResources && plan.teacherResources.length > 0 && (
                <div className="border-t pt-6 break-inside-avoid">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center mb-4">
                        <Paperclip className="h-5 w-5 mr-2 text-gray-600 print:hidden" />
                        8. Papildoma medžiaga
                    </h3>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {plan.teacherResources.map((res, i) => (
                            <li key={i} className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-200 print:bg-white print:border-gray-300">
                                {res.type === 'link' ? (
                                    <ExternalLink className="h-4 w-4 text-primary mr-3 flex-shrink-0 print:hidden" />
                                ) : (
                                    <FileText className="h-4 w-4 text-red-500 mr-3 flex-shrink-0 print:hidden" />
                                )}
                                <div className="overflow-hidden">
                                    {res.type === 'link' ? (
                                        <a href={res.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline truncate block print:text-black print:no-underline">
                                            {res.name} <span className="print:inline hidden text-xs text-gray-500">({res.url})</span>
                                        </a>
                                    ) : (
                                        <span className="text-sm text-gray-700 truncate block">{res.name}</span>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

        </div>
      </div>
    </div>
  );
};

export default LessonResult;