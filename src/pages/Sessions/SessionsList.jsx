import React, { useRef, useState, useEffect } from 'react';
import PortalDropdown from '@/components/ui/PortalDropdown.jsx';
// Custom inline dropdown for table cell editing using Portal
function InlineDropdown({ value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef();
  return (
    <>
      <button
        ref={btnRef}
        type="button"
        style={{
          width: '100%',
          textAlign: 'right',
          background: '#fffbeb',
          border: '1px solid var(--primary)',
          borderRadius: 4,
          padding: '4px 6px',
          fontFamily: 'Cairo',
          fontSize: 13,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
        onClick={() => setOpen((v) => !v)}
        tabIndex={0}
      >
        <span>{value || '—'}</span>
        <span style={{ marginRight: 6, fontSize: 12, color: '#888' }}>▼</span>
      </button>
      <PortalDropdown
        anchorRef={btnRef}
        open={open}
        options={options}
        value={value}
        onSelect={(opt) => {
          onChange(opt);
          setOpen(false);
        }}
        onClose={() => setOpen(false)}
        width={btnRef.current?.offsetWidth || 160}
      />
    </>
  );
}
import { SESSION_TYPE_LABELS } from '@/core/Constants.js';
import CaseNumberBadge from '@/components/cases/CaseNumberBadge.jsx';
import DateDisplay from '@/components/common/DateDisplay.jsx';
import { openCasePanel } from '@/utils/openCasePanel.js';

export const ALL_COLUMNS = [
  { key: 'rollNumber', label: 'الرول', width: 70, sortable: true, editable: true },
  { key: 'caseNumber', label: 'رقم الدعوى', width: 120, sortable: true },
  { key: 'clientName', label: 'المدعي', width: 160, sortable: true },
  { key: 'defendantName', label: 'المدعى عليه', width: 160, sortable: true },
  { key: 'previousSession', label: 'ج. سابقة', width: 110, sortable: true },
  { key: 'date', label: 'الجلسة الحالية', width: 110, sortable: true },
  { key: 'nextDate', label: 'الجلسة القادمة', width: 110, sortable: true },
  { key: 'decision', label: 'القرار', width: 150, sortable: true, editable: true },
  { key: 'sessionType', label: 'نوع الجلسة', width: 110, sortable: true, editable: true },
  { key: 'sessionMinute', label: 'محضر الجلسة', width: 160, sortable: false, editable: true },
  { key: 'inspectionRequests', label: 'طلبات الإطلاع', width: 160, sortable: false, editable: true },
  { key: 'fileLocation', label: 'مكان الملف', width: 120, sortable: true, editable: true },
  { key: 'court', label: 'المحكمة', width: 150, sortable: true },
  { key: 'notes', label: 'ملاحظات', width: 180, sortable: false, editable: true },
];

export const DEFAULT_VISIBLE = [
  'rollNumber', 'caseNumber', 'clientName', 'defendantName',
  'date', 'nextDate', 'decision', 'sessionType'
];

export default function SessionsList({
  loading,
  error,
  filteredSessions,
  paginatedSessions,
  orderedVisibleColumns,
  colWidths,
  selectedRows,
  setSelectedRows,
  draggedCol,
  setDraggedCol,
  colOrder,
  sortConfig,
  handleColumnDrop,
  handleSortColumn,
  handleColResize,
  editMode,
  setOptionsManager,
  archiveIndex,
  getCurrentWeekRange,
  isEditableColumn,
  localEdits,
  setLocalEdits,
  copyRowFromPrevious,
  formatDateInput,
  fieldOptions,
  openSessionDate,
  dateTooltip,
  onStartRollover,
  emptyStateTitle = 'لا توجد جلسات',
  emptyStateIcon = '📅',
  displayOrder,
  dateDisplayOptions,
}) {
  if (loading) {
    return <div className="loading-text">جاري تحميل الجلسات...</div>;
  }

  if (error) {
    return (
      <div className="empty-state" style={{ color: '#b91c1c' }}>
        حدث خطأ أثناء تحميل الجلسات
      </div>
    );
  }

  if (filteredSessions.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">{emptyStateIcon}</div>
        <div className="empty-state-text">{emptyStateTitle}</div>
      </div>
    );
  }

  const getPreviousValue = (sessionId, colKey) => {
    const idx = paginatedSessions.findIndex((s) => s.id === sessionId);
    if (idx <= 0) return null;

    const prevRow = paginatedSessions[idx - 1];
    const prevEdits = localEdits[prevRow.id] || {};
    return prevEdits[colKey] ?? prevRow[colKey];
  };

  const handleCellKeyDown = (e, session, col) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    if (e.key.toLowerCase() !== 'd') return;

    e.preventDefault();
    e.stopPropagation();
    const sourceVal = getPreviousValue(session.id, col.key);
    if (!sourceVal) return;

    setLocalEdits((prev) => ({
      ...prev,
      [session.id]: { ...(prev[session.id] || {}), [col.key]: sourceVal },
    }));
  };

  return (
    <div className="card sessions-live-card print-hide" style={{ overflowX: 'auto', padding: 0 }}>
      {editMode && (
        <div className="print-hide" style={{
          background: '#fffbeb', border: '1px solid var(--primary)',
          borderRadius: 'var(--radius-sm)', padding: '8px 16px',
          marginBottom: 8, display: 'flex', alignItems: 'center',
          gap: 8, fontSize: 13, color: 'var(--primary)', fontWeight: 600
        }}>
          ✏️ وضع التعديل نشط — عدّل الخلايا مباشرة ثم اضغط "حفظ التعديلات"
          <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
            (الأعمدة باللون الأصفر قابلة للتعديل)
          </span>
        </div>
      )}

      <table className="data-table sessions-table" style={{ minWidth: '980px', tableLayout: 'fixed', width: '100%' }}>
        <thead>
          <tr>
            {editMode && <th className="print-hide" style={{ width: 34, textAlign: 'center' }} />}
            <th className="print-hide" style={{ width: 36, textAlign: 'center' }}>
              <input
                type="checkbox"
                checked={paginatedSessions.length > 0 && paginatedSessions.every((s) => selectedRows.has(s.id))}
                onChange={() => {
                  const next = new Set(selectedRows);
                  const allSelected = paginatedSessions.length > 0 && paginatedSessions.every((s) => next.has(s.id));
                  if (allSelected) {
                    paginatedSessions.forEach((s) => next.delete(s.id));
                  } else {
                    paginatedSessions.forEach((s) => next.add(s.id));
                  }
                  setSelectedRows(next);
                }}
              />
            </th>

            {orderedVisibleColumns.map((col) => (
              <th
                key={col.key}
                draggable={true}
                onDragStart={() => setDraggedCol(col.key)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleColumnDrop(col.key)}
                style={{
                  width: colWidths[col.key] || col.width,
                  minWidth: 60,
                  position: 'relative',
                  userSelect: 'none',
                  cursor: 'grab',
                  opacity: draggedCol === col.key ? 0.5 : 1,
                }}
                onClick={() => handleSortColumn(col)}
              >
                <span className="print-hide" style={{ fontSize: 9, color: 'var(--text-muted)', marginRight: 3 }}>⠿</span>
                {col.editable && <span className="print-hide" style={{ fontSize: 10, marginRight: 3 }}>✏️</span>}
                {col.label}
                {editMode && (col.key === 'decision' || col.key === 'sessionType') && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOptionsManager({ field: col.key });
                    }}
                    title="إدارة الخيارات"
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--primary)', fontSize: 12, marginRight: 4,
                      padding: '2px 4px'
                    }}
                    className="print-hide"
                  >
                    ⚙
                  </button>
                )}
                {sortConfig.key === col.key && (
                  <span className="print-hide" style={{ marginRight: 4, fontSize: 10 }}>
                    {sortConfig.dir === 'desc' ? '▼' : '▲'}
                  </span>
                )}

                <span
                  onMouseDown={(e) => handleColResize(col.key, e)}
                  onClick={(e) => e.stopPropagation()}
                  className="print-hide"
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 4,
                    cursor: 'col-resize',
                    background: 'transparent',
                  }}
                />
              </th>
            ))}

            <th className="print-hide" style={{ width: 70, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 12 }}>
              إجراء
            </th>
          </tr>
        </thead>

        <tbody>
          {paginatedSessions.map((session, idx) => {
            const week = getCurrentWeekRange();
            const isNextWeek = String(session.nextDate || '') >= week.start && String(session.nextDate || '') <= week.end;
            const linkedDoc = archiveIndex.get(session.nextDate) || archiveIndex.get(session.date) || archiveIndex.get(session.id);

            return (
              <tr
                key={session.id}
                className={isNextWeek ? 'sessions-row-highlight' : ''}
                style={{
                  background: isNextWeek ? '#fffbeb' : undefined,
                  borderRight: isNextWeek ? '3px solid var(--primary)' : undefined,
                }}
              >
                {editMode && (
                  <td className="print-hide" style={{ width: 34, textAlign: 'center' }}>
                    {idx > 0 ? (
                      <button
                        type="button"
                        title="نسخ من الصف السابق"
                        onClick={() => copyRowFromPrevious(session.id)}
                        style={{ opacity: 0.6, fontSize: 14, padding: '2px 6px' }}
                        className="print-hide"
                      >
                        ⎘
                      </button>
                    ) : null}
                  </td>
                )}
                <td className="print-hide" style={{ width: 36, textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={selectedRows.has(session.id)}
                    onChange={() => {
                      const next = new Set(selectedRows);
                      next.has(session.id) ? next.delete(session.id) : next.add(session.id);
                      setSelectedRows(next);
                    }}
                  />
                </td>

                {orderedVisibleColumns.map((col) => (
                  <td
                    key={col.key}
                    style={{
                      width: colWidths[col.key] || col.width,
                      maxWidth: col.width * 2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      position: (editMode && (col.key === 'decision' || col.key === 'sessionType')) ? 'relative' : undefined,
                    }}
                    onKeyDown={(e) => handleCellKeyDown(e, session, col)}
                  >
                    {col.key === 'rollNumber' && !editMode ? (
                      <div style={{ width: colWidths.rollNumber || 70, textAlign: 'center' }}>
                        {session.rollNumber ? (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            minWidth: 32, height: 28, borderRadius: 6,
                            background: 'rgba(255, 140, 0, 0.08)',
                            color: 'var(--primary)',
                            fontWeight: 700, fontSize: 13,
                            padding: '0 6px'
                          }}>
                            {session.rollNumber}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                        )}
                      </div>
                    ) : col.key === 'caseNumber' ? (
                      <CaseNumberBadge
                        caseNumber={session.caseNumber}
                        caseYear={session.caseYear}
                        variant="inline"
                        displayOrder={displayOrder}
                        onClick={() => openCasePanel(session.caseId)}
                        style={{ cursor: 'pointer', color: 'var(--primary)', fontWeight: 700 }}
                      />
                    ) : isEditableColumn(col.key) || (col.key === 'rollNumber' && editMode) ? (
                      <>
                        {(col.key === 'decision' || col.key === 'sessionType') ? (
                          <InlineDropdown
                            value={localEdits[session.id]?.[col.key] ?? session[col.key] ?? ''}
                            options={fieldOptions[col.key] || []}
                            onChange={(val) => {
                              setLocalEdits((prev) => ({
                                ...prev,
                                [session.id]: { ...(prev[session.id] || {}), [col.key]: val },
                              }));
                            }}
                          />
                        ) : (
                          <input
                            type={['date', 'nextDate'].includes(col.key) ? 'date' : 'text'}
                            value={localEdits[session.id]?.[col.key] ?? session[col.key] ?? ''}
                            onChange={(e) => {
                              setLocalEdits((prev) => ({
                                ...prev,
                                [session.id]: { ...(prev[session.id] || {}), [col.key]: e.target.value },
                              }));
                            }}
                            style={{
                              width: '100%', padding: '4px 6px', border: '1px solid var(--primary)',
                              borderRadius: 4, fontFamily: 'Cairo', fontSize: 13, background: '#fffbeb',
                              direction: ['date', 'nextDate'].includes(col.key) ? 'ltr' : undefined,
                            }}
                          />
                        )}
                      </>
                    ) : (
                      <span>
                        {col.key === 'date' || col.key === 'nextDate' ? (
                          <span
                            onClick={async () => {
                              if (editMode) return;
                              const targetDate = session[col.key];
                              await openSessionDate(targetDate);
                            }}
                            style={{
                              cursor: editMode ? 'default' : 'pointer',
                              color: (linkedDoc?.fileUrl || linkedDoc?.localId) ? 'var(--primary)' : 'inherit',
                              fontWeight: (linkedDoc?.fileUrl || linkedDoc?.localId) ? 700 : 400,
                            }}
                          >
                            <DateDisplay value={session[col.key]} options={dateDisplayOptions} />
                            {(linkedDoc?.fileUrl || linkedDoc?.localId) ? (
                              <span
                                title={linkedDoc?.title || 'رول مرتبط'}
                                style={{ marginRight: 4, cursor: 'pointer' }}
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (linkedDoc.localId) {
                                    const { default: lfi } = await import('@/services/LocalFileIndex.js');
                                    const result = await lfi.openFile(linkedDoc.localId);
                                    if (result) {
                                      const w = window.open('', '_blank');
                                      w.document.write(`<iframe src="${result.url}" style="width:100%;height:100vh;border:none"></iframe>`);
                                    } else {
                                      alert('الملف غير متاح محلياً');
                                    }
                                  } else {
                                    window.open(linkedDoc.fileUrl, '_blank');
                                  }
                                }}
                              >
                                {linkedDoc?.localId ? ' 💾' : ' 📎'}
                              </span>
                            ) : null}
                            {dateTooltip === session[col.key] && !(linkedDoc?.fileUrl || linkedDoc?.localId) ? (
                              <span style={{ marginRight: 6, color: '#dc2626', fontSize: 11 }}>
                                لا يوجد رول مرتبط بهذا التاريخ
                              </span>
                            ) : null}
                          </span>
                        ) : col.key === 'previousSession'
                          ? <DateDisplay value={session[col.key]} options={dateDisplayOptions} />
                          : col.key === 'sessionType'
                            ? (SESSION_TYPE_LABELS[session.sessionType] || session.sessionType || '—')
                            : (session[col.key] || '—')}
                      </span>
                    )}
                  </td>
                ))}

                <td className="print-hide" style={{ width: 80, textAlign: 'center' }}>
                  <button
                    onClick={() => onStartRollover(session)}
                    className="btn-secondary"
                    style={{ padding: '3px 10px', fontSize: 12 }}
                  >
                    ترحيل ←
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
