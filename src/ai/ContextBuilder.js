export class ContextBuilder {
  buildContext(query, currentCase, recentCases = []) {
    const parts = [];

    parts.push('=== بيانات النظام ===');
    parts.push(`التاريخ الحالي: ${new Date().toLocaleDateString('ar-EG')}`);

    if (currentCase) {
      parts.push('\n=== القضية الحالية ===');
      parts.push(`رقم القضية: ${currentCase.caseNumber || '—'} / ${currentCase.caseYear || '—'}`);
      parts.push(`المحكمة: ${currentCase.court || '—'}`);
      parts.push(`الموكل: ${currentCase.clientName || currentCase.plaintiffName || '—'}`);
      parts.push(`الحالة: ${currentCase.status || '—'}`);
      parts.push(`آخر قرار: ${currentCase.sessionResult || '—'}`);
      parts.push(`الجلسة القادمة: ${currentCase.nextSessionDate || '—'}`);

      const history = Array.isArray(currentCase.sessionsHistory)
        ? currentCase.sessionsHistory.slice(-5)
        : [];
      if (history.length) {
        parts.push('\nآخر 5 جلسات:');
        history.forEach((session) => {
          parts.push(`- ${session.date || '—'}: ${session.decision || session.result || '—'}`);
        });
      }
    }

    if (recentCases.length) {
      parts.push('\n=== قضايا حديثة ===');
      recentCases.slice(0, 5).forEach((caseItem) => {
        parts.push(`- ${caseItem.caseNumber}/${caseItem.caseYear}: ${caseItem.court} — ${caseItem.status}`);
      });
    }

    const context = parts.join('\n');
    return context.length > 3000 ? `${context.substring(0, 3000)}...` : context;
  }
}

export default ContextBuilder;
