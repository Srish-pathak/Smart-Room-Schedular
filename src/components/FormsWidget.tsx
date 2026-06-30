import React, { useState } from 'react';
import { FormsAPI } from '../lib/workspace';
import { FormMetadata } from '../types';
import { FileSpreadsheet, Loader, Eye, AlertTriangle, HelpCircle, CheckSquare, List } from 'lucide-react';
import { motion } from 'motion/react';

export default function FormsWidget() {
  const [formId, setFormId] = useState('');
  const [formDetails, setFormDetails] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFormDetails = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formId.trim()) return;

    setLoading(true);
    setError(null);
    setFormDetails(null);

    try {
      // Clean and extract Form ID if they paste full URL
      let cleanId = formId.trim();
      const match = cleanId.match(/\/forms\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        cleanId = match[1];
      }

      const info = await FormsAPI.getForm(cleanId);
      setFormDetails(info);
    } catch (err: any) {
      console.error(err);
      setError(
        err.message || 'Verification failed. Confirm the Form ID is correct and you have permission to view it.'
      );
    } finally {
      setLoading(false);
    }
  };

  const loadSampleForm = () => {
    // Elegant local mockup showing how Forms API parses questionnaires
    setFormDetails({
      formId: '1FAIpQLSfD_Kru-uI-29W-EowmBv',
      info: {
        title: 'Office Room Booking Satisfaction & Feedback Survey',
        description: 'Collects anonymous feedback from staff regarding room cleanliness, scheduling ease, and hardware availability.',
      },
      items: [
        {
          title: 'Which room did you reserve?',
          questionItem: {
            question: {
              choiceQuestion: {
                type: 'RADIO',
                options: [{ value: 'Boardroom Alpha' }, { value: 'Creative Lounge' }, { value: 'Focus Studio' }, { value: 'Engineering Sandbox' }],
              },
            },
          },
        },
        {
          title: 'Primary purpose of your meeting reservation:',
          questionItem: {
            question: {
              choiceQuestion: {
                type: 'CHECKBOX',
                options: [{ value: 'Client Meeting' }, { value: 'Sprint Planning / Review' }, { value: 'Hardware Prototyping' }, { value: 'Solo Deep Work' }],
              },
            },
          },
        },
        {
          title: 'Rate the cleanliness and organization of the room (1-5):',
          questionItem: {
            question: {
              scaleQuestion: {
                low: 1,
                high: 5,
              },
            },
          },
        },
        {
          title: 'Any additional comments, hardware issues, or suggestions?',
          questionItem: {
            question: {
              textQuestion: { paragraph: true },
            },
          },
        },
      ],
    });
    setFormId('1FAIpQLSfD_Kru-uI-29W-EowmBv');
  };

  return (
    <div id="forms_integration_panel" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl text-slate-100">
      <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-800">
        <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
        <h2 className="text-xl font-semibold tracking-tight">Google Forms Structure Explorer</h2>
      </div>

      <div className="space-y-6">
        <div>
          <p className="text-xs text-slate-400 leading-relaxed max-w-2xl mb-4">
            Connect and review the structure of your staff feedback forms. Paste any active Google Form ID or complete Form editing URL below to inspect its component elements!
          </p>

          <form onSubmit={fetchFormDetails} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              required
              placeholder="Paste Google Form ID (or Full Form URL)"
              value={formId}
              onChange={(e) => setFormId(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-lg text-xs py-2 px-3 text-slate-100 placeholder:text-slate-700 font-mono"
            />
            <div className="flex gap-1.5">
              <button
                type="submit"
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 px-4 rounded-lg flex items-center justify-center gap-1 min-w-[120px] transition-colors disabled:opacity-50 cursor-pointer"
              >
                {loading ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                Scan Form API
              </button>
              <button
                type="button"
                onClick={loadSampleForm}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs px-3.5 py-2 rounded-lg transition-colors border border-slate-700/50"
              >
                Load Demo Survey
              </button>
            </div>
          </form>
        </div>

        {error && (
          <div className="p-4 bg-rose-950/30 border border-rose-900/40 text-rose-300 rounded-xl flex items-start gap-2.5 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <div>
              <span className="font-semibold">Scan Error: </span>
              {error}
            </div>
          </div>
        )}

        {formDetails && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 bg-slate-950 rounded-xl border border-slate-800/80"
          >
            <div className="pb-3 mb-4.5 border-b border-slate-900 flex justify-between items-start gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-100">{formDetails.info?.title || 'Google Form'}</h3>
                {formDetails.info?.description && (
                  <p className="text-xs text-slate-400 mt-1">{formDetails.info.description}</p>
                )}
              </div>
              <span className="text-[10px] font-mono text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-900/40 shrink-0">
                Forms ID: {formDetails.formId}
              </span>
            </div>

            <div className="space-y-4">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest block">
                Form Questions Checklist ({formDetails.items?.length || 0} fields)
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[300px] overflow-y-auto pr-1">
                {formDetails.items?.map((item: any, idx: number) => {
                  const isChoice = !!item.questionItem?.question?.choiceQuestion;
                  const isScale = !!item.questionItem?.question?.scaleQuestion;

                  return (
                    <div
                      key={idx}
                      className="p-3 bg-slate-900/50 rounded-lg border border-slate-800/40 flex items-start gap-2.5 text-xs"
                    >
                      <div className="bg-slate-950 text-indigo-400 text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 border border-indigo-900/30">
                        {idx + 1}
                      </div>
                      <div className="space-y-1">
                        <strong className="text-slate-200 block text-[13px]">{item.title}</strong>
                        {isChoice && (
                          <div className="space-y-1">
                            <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                              <CheckSquare className="w-3 h-3 text-slate-600" />
                              Multiple Choice [{item.questionItem.question.choiceQuestion.type}]
                            </span>
                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                              {item.questionItem.question.choiceQuestion.options?.map((opt: any, oIdx: number) => (
                                <span
                                  key={oIdx}
                                  className="text-[10px] bg-slate-950 text-slate-400 px-2 py-0.5 rounded border border-slate-800"
                                >
                                  {opt.value}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {isScale && (
                          <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                            <List className="w-3 h-3 text-slate-600" />
                            Value Scale ({item.questionItem.question.scaleQuestion.low} - {item.questionItem.question.scaleQuestion.high})
                          </span>
                        )}
                        {!isChoice && !isScale && (
                          <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                            <HelpCircle className="w-3 h-3" />
                            Text Response / Essay
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
