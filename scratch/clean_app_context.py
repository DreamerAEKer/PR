with open('src/context/AppContext.jsx', 'r', encoding='utf-8') as f:
    app_context = f.read()

# Fix line with navigationTarget
app_context = app_context.replace(
    "const [navigationTarget, setNavigationTarget, primaryLocation, primaryRecordCount, setAsPrimaryLocation, clearPrimaryLocation] = useState(null);",
    "const [navigationTarget, setNavigationTarget] = useState(null);"
)

# Fix corrupted reorderCompaniesByCode
corrupted_reorder = """    setCompanies(prev => {
      const sorted = [...prev].sort((a,b) => {
        if (a.code && b.code) return a.code.localeCompare(b.code, 'en', { numeric: true });
        if (a.code) return -1;
        if (b.code) return 1;
        const setAsPrimaryLocation = (locHref) => {
    const targetLoc = locHref || window.location.href;
    const count = (records || []).length;
    localStorage.setItem('postage_primary_location', targetLoc);
    localStorage.setItem('postage_primary_record_count', String(count));
    setPrimaryLocationState(targetLoc);
    setPrimaryRecordCount(count);
  };

  const clearPrimaryLocation = () => {
    localStorage.removeItem('postage_primary_location');
    localStorage.removeItem('postage_primary_record_count');
    setPrimaryLocationState('');
    setPrimaryRecordCount(0);
  };

  return (a.name || '').localeCompare(b.name || '', 'th');
      });
      return sorted.map((c, idx) => ({ ...c, order: idx + 1 }));
    });"""

clean_reorder = """    setCompanies(prev => {
      const sorted = [...prev].sort((a,b) => {
        if (a.code && b.code) return a.code.localeCompare(b.code, 'en', { numeric: true });
        if (a.code) return -1;
        if (b.code) return 1;
        return (a.name || '').localeCompare(b.name || '', 'th');
      });
      return sorted.map((c, idx) => ({ ...c, order: idx + 1 }));
    });"""

app_context = app_context.replace(corrupted_reorder, clean_reorder)

with open('src/context/AppContext.jsx', 'w', encoding='utf-8') as f:
    f.write(app_context)

print("Cleaned AppContext.jsx")
