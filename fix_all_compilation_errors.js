const fs = require('fs');

// PART 1: Update page.tsx
let pageContent = fs.readFileSync('src/app/page.tsx', 'utf8').split('\n');

const pageStartIdx = pageContent.findIndex(l => l.includes('{/* Target Semester Checkboxes */}'));
let pageEndIdx = -1;
for (let i = pageStartIdx; i < pageContent.length; i++) {
  if (pageContent[i].includes('/* Lab Allocation Selection */') || pageContent[i].includes('settings.faculty_lab_selection_enabled === "true"')) {
    // Look ahead to find the closing parentheses/brace of the lab allocation selection section
    for (let j = i; j < pageContent.length; j++) {
      if (pageContent[j].includes('</div>') && pageContent[j+1].includes(')') && pageContent[j+2].includes('}')) {
        pageEndIdx = j + 2;
        break;
      }
      if (pageContent[j].includes('</div>') && pageContent[j+1].includes(')')) {
        // If lab allocation was not enabled or had different nesting
        pageEndIdx = j + 1;
      }
    }
    if (pageEndIdx !== -1) break;
  }
}

// Fallback search if index could not be found with exact rules
if (pageStartIdx !== -1 && pageEndIdx === -1) {
  for (let i = pageStartIdx; i < pageContent.length; i++) {
    if (pageContent[i].includes('handleAddClass') || pageContent[i].includes('Add Class Action')) {
      pageEndIdx = i - 2;
      break;
    }
  }
}

if (pageStartIdx === -1 || pageEndIdx === -1) {
  console.error("Could not find the page.tsx slice programmatically!");
  process.exit(1);
}

console.log('Slicing page.tsx from line', pageStartIdx + 1, 'to', pageEndIdx + 1);

const newBuilderFormInputs = `                {/* Software Requirements nested builder */}
                <div className="flex flex-col gap-3.5 md:col-span-2 p-5 rounded-2xl bg-slate-50/50 dark:bg-zinc-900/40 border border-slate-200/55 dark:border-zinc-800/60 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-suas-ruby dark:text-suas-ruby-neon uppercase tracking-widest block">
                      Software Requirements for this class
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-550 uppercase">
                      Added: {classSoftwares.length}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                    {/* Semester Dropdown */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-extrabold text-slate-455 dark:text-slate-500 uppercase tracking-widest">
                        Semester <span className="text-suas-ruby">*</span>
                      </label>
                      <div className="relative">
                        <select
                          value={selectedSemester}
                          onChange={e => setSelectedSemester(e.target.value)}
                          className={\`\${inputCls} appearance-none pr-8 font-bold\`}
                        >
                          {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <ChevronDown size={14} className="absolute right-3.5 top-3 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Software Name */}
                    <div className="flex flex-col gap-1.5 relative" ref={softDropRef}>
                      <label className="text-[9px] font-extrabold text-slate-455 dark:text-slate-500 uppercase tracking-widest">
                        Software Name <span className="text-suas-ruby">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Search or enter software"
                        value={softwareName}
                        onChange={e => { setSoftwareName(e.target.value); setShowSoftSuggestions(true); }}
                        onFocus={() => setShowSoftSuggestions(true)}
                        className={inputCls}
                      />
                      <AnimatePresence>
                        {showSoftSuggestions && filteredSoftwareSuggestions.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 5 }}
                            className="absolute left-0 right-0 top-full mt-1.5 z-30 max-h-52 overflow-y-auto rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl py-1 text-left"
                          >
                            {filteredSoftwareSuggestions.map(preset => (
                              <button
                                key={preset.name}
                                type="button"
                                onClick={() => {
                                  setSoftwareName(preset.name);
                                  setSoftwareVersion(preset.version);
                                  setSoftwareFramework(preset.framework);
                                  setShowSoftSuggestions(false);
                                }}
                                className="w-full text-left px-4.5 py-2.5 text-xs text-slate-700 dark:text-slate-250 hover:bg-slate-55 dark:hover:bg-zinc-800 flex items-center justify-between transition"
                              >
                                <span className="font-bold">{preset.name}</span>
                                <span className="text-slate-400 dark:text-slate-550 font-mono text-[9px]">v{preset.version} · {preset.framework}</span>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Software Version */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-extrabold text-slate-455 dark:text-slate-500 uppercase tracking-widest">
                        Version
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 1.98"
                        value={softwareVersion}
                        onChange={e => setSoftwareVersion(e.target.value)}
                        className={inputCls}
                      />
                    </div>

                    {/* Framework / Stack */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-extrabold text-slate-455 dark:text-slate-500 uppercase tracking-widest">
                        Stack / Framework <span className="text-slate-400 dark:text-slate-500 font-normal">(Opt)</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="e.g. .NET"
                          value={softwareFramework}
                          onChange={e => setSoftwareFramework(e.target.value)}
                          className={inputCls}
                        />
                        <button
                          type="button"
                          onClick={handleAddSoftware}
                          className="px-4 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black uppercase rounded-xl hover:bg-suas-ruby dark:hover:bg-suas-ruby-neon hover:text-white transition duration-200 shrink-0"
                        >
                          {editingSoftwareId ? "Update" : "Add Row"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {classSoftwares.length > 0 && (
                    <div className="mt-4 border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-zinc-900/50 text-[9px] font-extrabold text-slate-450 uppercase tracking-wider border-b border-slate-200 dark:border-zinc-800">
                            <th className="px-4 py-2">Semester</th>
                            <th className="px-4 py-2">Software</th>
                            <th className="px-4 py-2">Version</th>
                            <th className="px-4 py-2">Framework / Stack</th>
                            <th className="px-4 py-2 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-zinc-850">
                          {classSoftwares.map(s => (
                            <tr key={s.id} className="hover:bg-slate-55/50 dark:hover:bg-zinc-900/10 transition text-slate-750 dark:text-slate-300 font-bold">
                              <td className="px-4 py-2.5 text-suas-ruby dark:text-suas-ruby-neon">{s.semester}</td>
                              <td className="px-4 py-2.5 text-slate-900 dark:text-white">{s.softwareName}</td>
                              <td className="px-4 py-2.5 font-mono text-[10px]">{s.version || "—"}</td>
                              <td className="px-4 py-2.5 font-medium text-slate-500">{s.framework || "—"}</td>
                              <td className="px-4 py-2.5 text-right no-print">
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleEditSoftware(s)}
                                    className="p-1 rounded text-slate-400 hover:text-suas-ruby hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
                                    title="Edit row"
                                  >
                                    <Edit3 size={11} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSoftware(s.id)}
                                    className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-955/20 transition"
                                    title="Delete row"
                                  >
                                    <X size={11} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {errors.softwares && <span className="text-suas-ruby text-[11px] font-semibold">{errors.softwares}</span>}
                </div>

                {/* Lab Allocation Selection */}
                {settings.faculty_lab_selection_enabled === "true" && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-extrabold text-slate-455 dark:text-slate-500 uppercase tracking-widest">
                      Laboratory Location <span className="text-suas-ruby">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={labSelection}
                        onChange={e => setLabSelection(e.target.value)}
                        className={\`\${inputCls} appearance-none pr-9\`}
                      >
                        {LABS.map(lab => <option key={lab} value={lab}>{lab}</option>)}
                      </select>
                      <ChevronDown size={14} className="absolute right-3.5 top-3.5 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                )}`;

pageContent.splice(pageStartIdx, pageEndIdx - pageStartIdx + 1, newBuilderFormInputs);
fs.writeFileSync('src/app/page.tsx', pageContent.join('\n'));
console.log('Successfully modified src/app/page.tsx slice.');

// PART 2: Update admin/page.tsx SoftwareEntry interface & Imports
let adminContent = fs.readFileSync('src/app/admin/page.tsx', 'utf8');

const oldAdminSoftEntry = `interface SoftwareEntry {
  id: string;
  softwareName: string;
  version: string;
}`;

const newAdminSoftEntry = `interface SoftwareEntry {
  id: string;
  semester: string;
  softwareName: string;
  version: string;
  framework?: string;
}`;

adminContent = adminContent.replace(oldAdminSoftEntry, newAdminSoftEntry);

// Add Save icon to imports
adminContent = adminContent.replace(
  `CheckCircle2,\n  Edit, Plus, ToggleLeft, ToggleRight, Phone, Mail, Image as ImageIcon, Check, Sparkles`,
  `CheckCircle2,\n  Edit, Plus, ToggleLeft, ToggleRight, Phone, Mail, Image as ImageIcon, Check, Sparkles, Save`
);

fs.writeFileSync('src/app/admin/page.tsx', adminContent);
console.log('Successfully modified src/app/admin/page.tsx.');
